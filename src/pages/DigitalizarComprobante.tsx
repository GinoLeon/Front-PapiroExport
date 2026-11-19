import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

import { useDigitalizacion, type EntradaLote } from "../context/DigitalizacionContext";
import {
  digitalizarComprobante, eliminarComprobante, listarPendientes, obtenerComprobante, registrarVentaComprobante, resolverCampo, resolverItems,
  type PendienteRevision,
} from "../service/comprobanteService";
import { getProductos } from "../service/productoService";
import type { CampoComprobante, CampoOCR, Comprobante, ItemComprobante, ItemEntrada, TipoDocumento } from "../types/comprobante";
import type { Producto } from "../types/producto";

type Seccion = { titulo: string; campos: { key: CampoComprobante; label: string }[] };
const CLIENTE: Seccion = { titulo: "Cliente", campos: [{ key: "ruc_cliente", label: "RUC del cliente" }, { key: "cliente", label: "Razón social del cliente" }] };
const MONTOS = [{ key: "subtotal", label: "Valor venta (sin IGV)" }, { key: "igv", label: "IGV" }, { key: "total", label: "Importe total" }] as const;
const SECCIONES: Record<TipoDocumento, Seccion[]> = {
  factura: [
    CLIENTE,
    { titulo: "Factura", campos: [{ key: "serie", label: "Serie y número" }, { key: "fecha_emision", label: "Fecha de emisión" }, ...MONTOS] },
    { titulo: "Emisor (se verifica que sea la empresa)", campos: [{ key: "ruc", label: "RUC del emisor" }, { key: "razon_social", label: "Razón social del emisor" }] },
  ],
  orden_compra: [
    { ...CLIENTE, titulo: "Cliente (emite la orden)" },
    {
      titulo: "Orden de compra",
      campos: [{ key: "serie", label: "N.º de orden" }, { key: "fecha_emision", label: "Fecha" }, { key: "fecha_entrega", label: "Fecha de entrega" },
        { key: "moneda", label: "Moneda" }, ...MONTOS],
    },
    { titulo: "Proveedor (se verifica que sea la empresa)", campos: [{ key: "ruc", label: "RUC del proveedor" }, { key: "razon_social", label: "Razón social del proveedor" }] },
  ],
  guia_remision: [
    { ...CLIENTE, titulo: "Destinatario" },
    { titulo: "Guía de remisión", campos: [{ key: "serie", label: "Serie y número" }, { key: "fecha_emision", label: "Fecha de emisión" }, { key: "referencia", label: "Orden de compra que atiende" }] },
    { titulo: "Remitente (se verifica que sea la empresa)", campos: [{ key: "ruc", label: "RUC del remitente" }, { key: "razon_social", label: "Razón social del remitente" }] },
  ],
};
const NOMBRE_TIPO: Record<TipoDocumento, string> = { factura: "Factura", orden_compra: "Orden de compra", guia_remision: "Guía de remisión" };
const CAMPOS_OPCIONALES: CampoComprobante[] = ["razon_social", "fecha_entrega", "referencia", "moneda"];
const tipoDe = (c: Comprobante): TipoDocumento => (c.campos.tipo_documento?.valor as TipoDocumento) || "factura";
const seccionesDe = (c: Comprobante) => SECCIONES[tipoDe(c)].map((s) => ({ ...s, campos: s.campos.filter(({ key }) => c.campos[key]) }));
const formatoMoneda = (moneda?: string | null) => new Intl.NumberFormat("es-PE", { style: "currency", currency: moneda === "USD" ? "USD" : "PEN" });
const VERDE = "var(--primary-500)";
const AMBAR = "var(--secondary-500)";
const CLAVE_ACTUAL = "digitalizar:actual";

const mensajeError = (err: unknown, porDefecto: string) =>
  (axios.isAxiosError(err) && typeof err.response?.data?.detail === "string" && err.response.data.detail) || porDefecto;

const porcentaje = (p?: number) => (p === undefined ? "" : ` · ${Math.round(p * 100)}%`);

const esSingleton = (campo: CampoOCR) => campo.conjunto.length === 1 && !!campo.valor;

type FilaCampoProps = {
  label: string;
  campo: CampoOCR;
  editable: boolean;
  confirmado: boolean;
  onConfirmar: (valor: boolean) => void;
  onResolver: (valor: string, manual: boolean) => Promise<void>;
};

function FilaCampo({ label, campo, editable, confirmado, onConfirmar, onResolver }: FilaCampoProps) {
  const [manual, setManual] = useState(false);
  const [texto, setTexto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const verde = esSingleton(campo);

  const resolver = async (valor: string, esManual: boolean) => {
    if (!valor.trim()) return;
    setGuardando(true);
    try {
      await onResolver(valor.trim(), esManual);
      setManual(false);
      setTexto("");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="row-card" style={{ borderLeft: `4px solid ${verde ? VERDE : AMBAR}`, marginBottom: "0.6rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <strong>{label}</strong>
          <p className="row-subtitle" style={{ margin: "0.25rem 0 0" }}>
            {verde ? campo.valor
              : campo.conjunto.length > 1 ? "Varios valores posibles: elige el correcto"
              : campo.conjunto.length === 1 ? "Lectura dudosa: confírmala si coincide con la factura o corrígela"
              : "No se pudo leer: ingrésalo manualmente"}
          </p>
        </div>
        <span className={`badge ${verde ? "badge-ok" : "badge-warn"}`}>
          {campo.confianza === "confirmada" ? "Confirmado" : verde ? `Alta confianza${porcentaje(campo.probabilidades?.[0])}` : "Requiere revisión"}
        </span>
      </div>

      {editable && verde && campo.confianza !== "confirmada" && !manual && (
        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.5rem" }}>
          <input type="checkbox" checked={confirmado} onChange={(e) => onConfirmar(e.target.checked)} />
          Es correcto
        </label>
      )}

      {/* Con un solo candidato dudoso también se ofrece: antes quedaba oculto y parecía que no se había leído nada */}
      {editable && !verde && campo.conjunto.length >= 1 && !manual && (
        <div className="btn-group" style={{ marginTop: "0.5rem", flexWrap: "wrap" }}>
          {campo.conjunto.map((v, i) => (
            <button key={v} className="btn btn-secondary" disabled={guardando} onClick={() => resolver(v, false)}>{v}{porcentaje(campo.probabilidades?.[i])}</button>
          ))}
        </div>
      )}

      {editable && !manual && (
        <button className="btn" style={{ marginTop: "0.5rem", padding: 0, background: "none", textDecoration: "underline" }} onClick={() => setManual(true)}>
          {verde ? "No es correcto, editar" : "Ninguna es correcta / editar manualmente"}
        </button>
      )}

      {editable && (manual || (!verde && campo.conjunto.length === 0)) && (
        <div className="btn-group" style={{ marginTop: "0.5rem" }}>
          <input className="input" placeholder={campo.conjunto[0] ? `Ej. ${campo.conjunto[0]}` : "Valor correcto"} value={texto} autoFocus={manual}
            onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => e.key === "Enter" && resolver(texto, true)} />
          <button className="btn btn-primary" disabled={guardando || !texto.trim()} onClick={() => resolver(texto, true)}>Guardar</button>
          {manual && <button className="btn btn-secondary" onClick={() => setManual(false)}>Cancelar</button>}
        </div>
      )}
    </div>
  );
}

// --- Ítems ---

const aEntrada = (i: ItemComprobante): ItemEntrada => ({
  cantidad: i.cantidad, descripcion: i.descripcion, valor_unitario: i.valor_unitario,
  producto_id: i.producto.id, crear_producto: i.producto.nuevo,
});

const NUEVO = "__nuevo__";

type TablaItemsProps = {
  items: ItemComprobante[];
  subtotal: string | null;
  moneda?: string | null;
  conPrecios?: boolean;
  editable: boolean;
  catalogo: Producto[];
  onGuardar: (items: ItemEntrada[]) => Promise<void>;
};

function TablaItems({ items, subtotal, moneda, conPrecios = true, editable, catalogo, onGuardar }: TablaItemsProps) {
  const dinero = formatoMoneda(moneda);
  const [filas, setFilas] = useState<ItemEntrada[]>(() => items.map(aEntrada));
  const [cambios, setCambios] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { setFilas(items.map(aEntrada)); setCambios(false); }, [items]);

  const editar = (n: number, cambio: Partial<ItemEntrada>) => {
    setFilas((f) => f.map((fila, i) => (i === n ? { ...fila, ...cambio } : fila)));
    setCambios(true);
  };
  const importe = (f: ItemEntrada) => (Number(f.cantidad) || 0) * (Number(f.valor_unitario) || 0);
  const suma = filas.reduce((acc, f) => acc + importe(f), 0);
  const cuadra = subtotal !== null && Math.abs(suma - Number(subtotal)) <= 0.02 * Math.max(filas.length, 1);

  const guardar = async () => {
    setGuardando(true);
    try { await onGuardar(filas); } finally { setGuardando(false); }
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
        <thead>
          <tr style={{ textAlign: "left" }}>
            <th>Cant.</th><th>Descripción</th>{conPrecios && <><th>Valor unit.</th><th style={{ textAlign: "right" }}>Importe</th></>}<th>Producto del catálogo</th>{editable && <th />}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, n) => {
            const original = items[n]?.producto;
            const seguro = original && (original.confianza === "alta" || original.confianza === "confirmada") && (f.producto_id || f.crear_producto);
            const resuelto = !!(f.producto_id || f.crear_producto);
            const idsConjunto = new Set(original?.conjunto.map((c) => c.id) ?? []);
            return (
              <tr key={n} style={{ borderTop: "1px solid var(--border)", borderLeft: `4px solid ${resuelto ? VERDE : AMBAR}` }}>
                <td><input className="input" style={{ width: 70 }} disabled={!editable} value={f.cantidad} onChange={(e) => editar(n, { cantidad: e.target.value })} /></td>
                <td><input className="input" style={{ width: "100%" }} disabled={!editable} value={f.descripcion} onChange={(e) => editar(n, { descripcion: e.target.value })} /></td>
                {conPrecios && <>
                  <td><input className="input" style={{ width: 90 }} disabled={!editable} value={f.valor_unitario} onChange={(e) => editar(n, { valor_unitario: e.target.value })} /></td>
                  <td style={{ textAlign: "right" }}>{dinero.format(importe(f))}</td>
                </>}
                <td>
                  {editable ? (
                    <select className="select" value={f.crear_producto ? NUEVO : f.producto_id ?? ""}
                      onChange={(e) => editar(n, e.target.value === NUEVO ? { crear_producto: true, producto_id: null } : { crear_producto: false, producto_id: e.target.value ? Number(e.target.value) : null })}>
                      <option value="">— Elegir producto —</option>
                      {original && original.conjunto.length > 0 && (
                        <optgroup label="Lista blanca: más probables">
                          {original.conjunto.map((c) => <option key={c.id} value={c.id}>{c.nombre} ({Math.round(c.similitud * 100)}%)</option>)}
                        </optgroup>
                      )}
                      <optgroup label="Otro producto del catálogo">
                        {catalogo.filter((p) => p.activo && !idsConjunto.has(p.id)).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </optgroup>
                      <option value={NUEVO}>+ Crear producto nuevo: {f.descripcion.toUpperCase()}</option>
                    </select>
                  ) : (
                    <span>{original?.nombre ?? f.descripcion}</span>
                  )}
                  {original?.aprendido && <span className="badge badge-ok" style={{ marginLeft: 6 }} title="Asociado por una elección anterior del vendedor">Aprendido</span>}
                  {!editable ? null : seguro ? <span className="badge badge-ok" style={{ marginLeft: 6 }}>Seguro</span>
                    : !resuelto && <span className="badge badge-warn" style={{ marginLeft: 6 }}>{original?.conjunto.length ? "Elige" : "Fuera de la lista"}</span>}
                </td>
                {editable && <td><button className="btn btn-secondary" onClick={() => { setFilas((x) => x.filter((_, i) => i !== n)); setCambios(true); }}>Quitar</button></td>}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.6rem" }}>
        {conPrecios ? (
          <span className={`badge ${cuadra ? "badge-ok" : "badge-warn"}`}>
            Suma de ítems {dinero.format(suma)} {subtotal !== null && `· valor venta ${dinero.format(Number(subtotal))}`}
          </span>
        ) : <span className="badge">{filas.length} ítem(s) · sin precios</span>}
        {editable && (
          <div className="btn-group">
            <button className="btn btn-secondary" onClick={() => { setFilas((x) => [...x, { cantidad: "1", descripcion: "", valor_unitario: "0.00", producto_id: null, crear_producto: false }]); setCambios(true); }}>
              Agregar ítem
            </button>
            <button className="btn btn-primary" disabled={guardando || filas.length === 0 || filas.some((f) => !f.descripcion.trim())} onClick={guardar}>
              {guardando ? "Guardando…" : cambios ? "Guardar ítems" : "Confirmar ítems"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const TIPOS_LOTE = ["image/jpeg", "image/png", "application/pdf"];

const estadoLote = (e: EntradaLote): [string, boolean] => {
  if (e.estado === "en_cola") return ["En cola", false];
  if (e.estado === "procesando") return ["Procesando…", false];
  if (e.estado === "error") return [e.error ?? "Error", false];
  const r = e.resultado!;
  if (r.venta_id) return [r.estado === "registrado_automaticamente" ? `Registrada automáticamente · venta #${r.venta_id}` : `Registrada · venta #${r.venta_id}`, true];
  if (r.validaciones.duplicado_de_venta) return [`Ya registrada antes (venta #${r.validaciones.duplicado_de_venta})`, false];
  return [`Pendiente de revisión (${r.pendientes.length})`, false];
};

function TablaLote({ lote, procesando, actual, onRevisar, onCerrar }: { lote: EntradaLote[]; procesando: boolean; actual?: number; onRevisar: (e: EntradaLote) => void; onCerrar: () => void }) {
  const hechos = lote.filter((e) => e.estado === "listo" || e.estado === "error").length;
  const registradas = lote.filter((e) => e.resultado?.venta_id).length;
  const pendientes = lote.filter((e) => e.resultado && !e.resultado.venta_id && !e.resultado.validaciones.duplicado_de_venta).length;
  return (
    <div className="panel" style={{ marginTop: "1rem", overflowX: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
        <h3 style={{ margin: 0 }}>Carpeta: {hechos} de {lote.length} procesadas{procesando ? "…" : ""}</h3>
        {!procesando && <button className="btn btn-secondary" onClick={onCerrar}>Cerrar resumen</button>}
      </div>
      {procesando && <p className="row-subtitle">Puedes cambiar de pestaña: el lote sigue procesándose.</p>}
      <div style={{ height: 8, background: "var(--bg-soft)", borderRadius: 999, overflow: "hidden", marginBottom: "0.5rem" }}>
        <div style={{ width: `${(hechos / lote.length) * 100}%`, height: "100%", background: "var(--brand)", transition: "width 0.3s ease" }} />
      </div>
      <p className="row-subtitle">{registradas} registradas · {pendientes} por revisar · {lote.filter((e) => e.estado === "error").length} con error</p>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
        <thead><tr style={{ textAlign: "left" }}><th>Archivo</th><th>Documento</th><th>Cliente</th><th>Estado</th><th /></tr></thead>
        <tbody>
          {lote.map((e) => {
            const [texto, ok] = estadoLote(e);
            const r = e.resultado;
            return (
              <tr key={e.archivo.name} style={{ borderTop: "1px solid var(--border)", background: r && r.id === actual ? "var(--bg-soft)" : undefined }}>
                <td>{e.archivo.name}</td>
                <td>{r?.campos.serie?.valor ?? "—"}</td>
                <td>{r?.campos.cliente?.valor ?? r?.campos.cliente?.conjunto[0] ?? "—"}</td>
                <td><span className={`badge ${ok ? "badge-ok" : "badge-warn"}`}>{texto}</span></td>
                <td>{r && <button className="btn btn-secondary" onClick={() => onRevisar(e)}>{r.venta_id ? "Ver" : "Revisar"}</button>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function DigitalizarComprobante() {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Comprobante | null>(null);
  const [catalogo, setCatalogo] = useState<Producto[]>([]);
  const [progreso, setProgreso] = useState(0);
  const [etapa, setEtapa] = useState<"subiendo" | "procesando" | null>(null);
  const [confirmados, setConfirmados] = useState<Partial<Record<CampoComprobante, boolean>>>({});
  const [registrando, setRegistrando] = useState(false);
  const [error, setError] = useState("");
  const temporizador = useRef<number | null>(null);
  const { lote, procesandoLote, procesarLote, actualizarEnLote, quitarDelLote, limpiarLote } = useDigitalizacion();
  const [pendientesLista, setPendientesLista] = useState<PendienteRevision[]>([]);

  const cargarPendientes = () => listarPendientes().then(setPendientesLista).catch(() => setPendientesLista([]));

  // Lo que se resuelve/registra en la revisión se refleja en la fila del lote y se recuerda al cambiar de pestaña
  useEffect(() => {
    if (!resultado) return;
    actualizarEnLote(resultado);
    try { sessionStorage.setItem(CLAVE_ACTUAL, String(resultado.id)); } catch { /* sin almacenamiento: no pasa nada */ }
  }, [resultado, actualizarEnLote]);

  // Al volver a la pestaña: se recupera la factura que se estaba revisando y la lista de pendientes del servidor
  useEffect(() => {
    cargarPendientes();
    let id: number | null = null;
    try { id = Number(sessionStorage.getItem(CLAVE_ACTUAL)) || null; } catch { id = null; }
    if (id) obtenerComprobante(id).then(setResultado).catch(() => { try { sessionStorage.removeItem(CLAVE_ACTUAL); } catch { /* */ } });
  }, []);

  // Cada factura que termina el lote aparece enseguida en la lista de pendientes
  const listosLote = lote.filter((e) => e.estado !== "en_cola" && e.estado !== "procesando").length;
  useEffect(() => { if (listosLote) cargarPendientes(); }, [listosLote]);

  const procesarCarpeta = async (archivos: FileList | null) => {
    const facturas = Array.from(archivos ?? []).filter((f) => TIPOS_LOTE.includes(f.type)).sort((a, b) => a.name.localeCompare(b.name));
    if (!facturas.length) return setError("La carpeta no tiene archivos JPG, PNG o PDF");
    setError("");
    setResultado(null);
    setArchivo(null);
    await procesarLote(facturas, (err) => mensajeError(err, "No se pudo procesar"));
  };

  const revisar = (e: EntradaLote) => {
    setResultado(e.resultado ?? null);
    setConfirmados({});
    setError("");
    window.setTimeout(() => document.getElementById("revision")?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  useEffect(() => {
    if (!archivo || !archivo.type.startsWith("image/")) return setPreview(null);
    const url = URL.createObjectURL(archivo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  useEffect(() => { getProductos().then(setCatalogo).catch(() => setCatalogo([])); }, [resultado?.venta_id]);
  useEffect(() => () => { if (temporizador.current) window.clearInterval(temporizador.current); }, []);

  const elegirArchivo = (f: File | null) => {
    setArchivo(f);
    setResultado(null);
    setConfirmados({});
    setError("");
  };

  const procesar = async () => {
    if (!archivo) return;
    setError("");
    setEtapa("subiendo");
    setProgreso(0);
    try {
      const data = await digitalizarComprobante(archivo, (p) => {
        setProgreso(Math.round(p * 0.3));
        if (p >= 100 && !temporizador.current) {
          // El servidor no reporta avance del pipeline: la barra avanza de forma asintótica hasta que responde.
          setEtapa("procesando");
          temporizador.current = window.setInterval(() => setProgreso((v) => Math.min(95, v + (95 - v) * 0.06)), 300);
        }
      });
      setProgreso(100);
      setResultado(data);
      setConfirmados({});
    } catch (err) {
      setError(mensajeError(err, "No se pudo procesar el comprobante"));
    } finally {
      if (temporizador.current) window.clearInterval(temporizador.current);
      temporizador.current = null;
      setEtapa(null);
    }
  };

  const conError = async (accion: () => Promise<Comprobante>, porDefecto: string) => {
    setError("");
    try {
      setResultado(await accion());
    } catch (err) {
      setError(mensajeError(err, porDefecto));
    }
  };

  const abrirPendiente = async (id: number) => {
    setError("");
    setConfirmados({});
    try {
      setResultado(await obtenerComprobante(id));
      window.setTimeout(() => document.getElementById("revision")?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (err) {
      setError(mensajeError(err, "No se pudo abrir la factura"));
    }
  };

  const siguientePendiente = (despuesDe: number) => pendientesLista.find((p) => p.id !== despuesDe && !p.duplicado_de_venta);

  const registrar = async (yAbrirSiguiente = false) => {
    if (!resultado) return;
    const actual = resultado.id;
    const siguiente = siguientePendiente(actual);
    setRegistrando(true);
    try {
      const data = await registrarVentaComprobante(actual);
      setResultado(data);
      await cargarPendientes();
      if (yAbrirSiguiente && siguiente) await abrirPendiente(siguiente.id);
    } catch (err) {
      setError(mensajeError(err, "No se pudo registrar la venta"));
    } finally {
      setRegistrando(false);
    }
  };

  const eliminar = async (id: number, etiqueta: string, registrada: boolean) => {
    const aviso = registrada
      ? `¿Eliminar la factura ${etiqueta}? Se anulará su venta y se devolverá el stock. No se puede deshacer.`
      : `¿Descartar la factura ${etiqueta}? Se borrará sin registrar ninguna venta.`;
    if (!window.confirm(aviso)) return;
    try {
      await eliminarComprobante(id);
      quitarDelLote(id);
      if (resultado?.id === id) {
        setResultado(null);
        try { sessionStorage.removeItem(CLAVE_ACTUAL); } catch { /* sin almacenamiento */ }
      }
      await cargarPendientes();
    } catch (err) {
      setError(mensajeError(err, "No se pudo eliminar la factura"));
    }
  };

  const pendiente = resultado?.estado === "pendiente_revision";
  const sinCheck = useMemo(() => (resultado ? seccionesDe(resultado).flatMap((s) => s.campos).filter(({ key }) => {
    const c = resultado.campos[key];
    return !!c && !CAMPOS_OPCIONALES.includes(key) && esSingleton(c) && c.confianza !== "confirmada" && !confirmados[key];
  }) : []), [resultado, confirmados]);
  const tipo = resultado ? tipoDe(resultado) : "factura";
  const nombreTipo = NOMBRE_TIPO[tipo];
  const ruc = resultado?.validaciones.ruc;

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Digitalizar documentos</h1>
          <p className="page-subtitle">
            Fotografía o carga una factura, una orden de compra de un cliente o una guía de remisión (JPG, PNG o PDF), o una carpeta completa.
            El sistema reconoce el tipo de documento: la orden de compra se registra como pedido y la guía marca su entrega.
          </p>
        </div>
      </header>

      <div className="panel">
        <div className="btn-group" style={{ flexWrap: "wrap" }}>
          <label className="btn btn-secondary">
            Tomar foto
            <input hidden type="file" accept="image/*" capture="environment" onChange={(e) => elegirArchivo(e.target.files?.[0] || null)} />
          </label>
          <label className="btn btn-secondary">
            Cargar archivo
            <input hidden type="file" accept="image/jpeg,image/png,application/pdf" onChange={(e) => elegirArchivo(e.target.files?.[0] || null)} />
          </label>
          <label className="btn btn-secondary">
            Cargar carpeta
            <input hidden type="file" multiple {...{ webkitdirectory: "", directory: "" }} disabled={procesandoLote}
              onChange={(e) => { procesarCarpeta(e.target.files); e.target.value = ""; }} />
          </label>
          <button className="btn btn-primary" disabled={!archivo || !!etapa} onClick={procesar}>{etapa ? "Procesando…" : "Procesar documento"}</button>
        </div>
        {archivo && <p className="muted" style={{ marginBottom: 0 }}>Archivo: {archivo.name}</p>}
        {preview && <img src={preview} alt="Vista previa de la factura" style={{ maxHeight: 260, maxWidth: "100%", marginTop: "0.75rem", borderRadius: 8 }} />}

        {etapa && (
          <div style={{ marginTop: "1rem" }} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progreso)}>
            <div style={{ height: 10, background: "var(--bg-soft)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ width: `${progreso}%`, height: "100%", background: "var(--brand)", transition: "width 0.3s ease" }} />
            </div>
            <p className="muted">{etapa === "subiendo" ? "Subiendo archivo…" : "Preprocesamiento, OCR, extracción de campos e ítems, validación y análisis de certidumbre…"}</p>
          </div>
        )}
        {error && <p className="error">{error}</p>}
      </div>

      {lote.length > 0 && <TablaLote lote={lote} procesando={procesandoLote} actual={resultado?.id} onRevisar={revisar} onCerrar={limpiarLote} />}

      {pendientesLista.length > 0 && (
        <div className="panel" style={{ marginTop: "1rem", overflowX: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <div>
              <h3 style={{ margin: 0 }}>Por revisar ({pendientesLista.length})</h3>
              <p className="row-subtitle">Documentos que aún no están registrados. Se guardan aunque cambies de pestaña o cierres la página.</p>
            </div>
            {(!resultado || resultado.venta_id || !pendientesLista.some((p) => p.id === resultado.id)) && (
              <button className="btn btn-primary" onClick={() => abrirPendiente((siguientePendiente(-1) ?? pendientesLista[0]).id)}>Revisar la primera</button>
            )}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640, marginTop: "0.5rem" }}>
            <thead><tr style={{ textAlign: "left" }}><th>Serie</th><th>Cliente</th><th style={{ textAlign: "right" }}>Total</th><th>Estado</th><th /></tr></thead>
            <tbody>
              {pendientesLista.map((p) => (
                <tr key={p.id} style={{ background: p.id === resultado?.id ? "var(--primary-50)" : undefined }}>
                  <td>{p.serie ?? p.archivo}{p.tipo_documento && p.tipo_documento !== "factura" && <span className="badge" style={{ marginLeft: 6 }}>{NOMBRE_TIPO[p.tipo_documento as TipoDocumento]}</span>}</td>
                  <td>{p.cliente ?? "—"}</td>
                  <td style={{ textAlign: "right" }}>{p.total ? formatoMoneda(p.moneda).format(Number(p.total)) : "—"}</td>
                  <td>
                    <span className="badge badge-warn">
                      {p.duplicado_de_venta ? `Ya registrada (venta #${p.duplicado_de_venta})` : `${p.faltan} por resolver`}
                    </span>
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <div className="btn-group" style={{ justifyContent: "flex-end" }}>
                      <button className="btn btn-secondary" onClick={() => abrirPendiente(p.id)}>Revisar</button>
                      <button className="btn btn-danger" onClick={() => eliminar(p.id, p.serie ?? p.archivo, false)}>Descartar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {resultado && (
        <div className="panel" id="revision" style={{ marginTop: "1rem" }}>
          <div className="page-header" style={{ marginBottom: "0.75rem" }}>
            <div>
              <h3 style={{ margin: 0 }}>
                {resultado.estado === "registrado_automaticamente" && `${nombreTipo} registrada automáticamente`}
                {resultado.estado === "registrado_con_revision" && `${nombreTipo} registrada`}
                {pendiente && "Revisa los campos en ámbar"}
              </h3>
              <span className="badge" style={{ marginTop: 4 }}>{nombreTipo}{resultado.campos.moneda?.valor === "USD" ? " · dólares" : ""}</span>
              {resultado.tiempo_procesamiento_ms != null && <p className="row-subtitle">Procesado en {(resultado.tiempo_procesamiento_ms / 1000).toFixed(1)} s</p>}
            </div>
          </div>

          <div className="btn-group" style={{ flexWrap: "wrap", marginBottom: "0.75rem" }}>
            {resultado.validaciones.duplicado_de_venta && (
              <span className="badge badge-warn">Ya registrada en la venta #{resultado.validaciones.duplicado_de_venta}</span>
            )}
            <span className={`badge ${resultado.validaciones.emisor_es_la_empresa !== false ? "badge-ok" : "badge-warn"}`}>
              {tipo === "orden_compra" ? "Proveedor = empresa" : "Emisor = empresa"}
            </span>
            {tipo !== "guia_remision" && <>
              <span className={`badge ${resultado.validaciones.subtotal_mas_igv_igual_total ? "badge-ok" : "badge-warn"}`}>Valor venta + IGV = Total</span>
              <span className={`badge ${resultado.validaciones.items_suma_coincide ? "badge-ok" : "badge-warn"}`}>Ítems = valor venta</span>
            </>}
            <span className={`badge ${resultado.ruc_validado ? "badge-ok" : "badge-warn"}`}>
              RUC del cliente{ruc?.detalle ? ` · ${ruc.detalle}` : ""}
            </span>
          </div>

          {pendiente && sinCheck.length > 0 && (
            <button className="btn btn-primary" style={{ marginBottom: "0.75rem" }}
              onClick={() => setConfirmados((c) => ({ ...c, ...Object.fromEntries(sinCheck.map(({ key }) => [key, true])) }))}>
              Marcar todos como correctos ({sinCheck.length})
            </button>
          )}

          {seccionesDe(resultado).map((seccion) => (
            <div key={seccion.titulo} style={{ marginBottom: "1rem" }}>
              <h4 style={{ margin: "0.5rem 0" }}>{seccion.titulo}</h4>
              {seccion.campos.map(({ key, label }) => (
                <FilaCampo key={key} label={label} campo={resultado.campos[key]!} editable={pendiente}
                  confirmado={!!confirmados[key]} onConfirmar={(v) => setConfirmados((c) => ({ ...c, [key]: v }))}
                  onResolver={(valor, manual) => conError(() => resolverCampo(resultado.id, key, valor, manual), "No se pudo guardar la corrección")} />
              ))}
            </div>
          ))}

          <h4 style={{ margin: "0.5rem 0" }}>Ítems ({resultado.items.length})</h4>
          <TablaItems items={resultado.items} subtotal={resultado.campos.subtotal.valor} moneda={resultado.campos.moneda?.valor}
            conPrecios={tipo !== "guia_remision"} editable={pendiente} catalogo={catalogo}
            onGuardar={(items) => conError(() => resolverItems(resultado.id, items), "No se pudieron guardar los ítems")} />

          {pendiente && (
            <div style={{ marginTop: "1rem" }}>
              {(resultado.pendientes.length > 0 || sinCheck.length > 0) && (
                <ul className="muted" style={{ paddingLeft: "1.2rem" }}>
                  {resultado.pendientes.map((p) => <li key={p}>{p}</li>)}
                  {sinCheck.length > 0 && <li>Marcar "Es correcto" en: {sinCheck.map(({ label }) => label).join(", ")}</li>}
                </ul>
              )}
              <div className="btn-group">
                {siguientePendiente(resultado.id) && (
                  <button className="btn btn-primary" disabled={!resultado.puede_registrar || sinCheck.length > 0 || registrando} onClick={() => registrar(true)}>
                    {registrando ? "Registrando…" : "Registrar y revisar la siguiente"}
                  </button>
                )}
                <button className={`btn ${siguientePendiente(resultado.id) ? "btn-secondary" : "btn-primary"}`}
                  disabled={!resultado.puede_registrar || sinCheck.length > 0 || registrando} onClick={() => registrar(false)}>
                  {registrando ? "Registrando…" : { factura: "Registrar venta", orden_compra: "Registrar pedido", guia_remision: "Registrar entrega" }[tipo]}
                </button>
                <button className="btn btn-danger" disabled={registrando}
                  onClick={() => eliminar(resultado.id, resultado.campos.serie?.valor ?? `#${resultado.id}`, false)}>
                  Descartar documento
                </button>
              </div>
            </div>
          )}
          {resultado.venta_id && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
              <p className="price" style={{ margin: 0 }}>
                {tipo === "orden_compra" ? `Pedido (venta #${resultado.venta_id})` : tipo === "guia_remision" ? `Entrega de la venta #${resultado.venta_id}` : `Venta #${resultado.venta_id}`}
                {" "}registrado con {resultado.items.length} ítem(s).
              </p>
              <div className="btn-group">
                {siguientePendiente(resultado.id) && (
                  <button className="btn btn-primary" onClick={() => abrirPendiente(siguientePendiente(resultado.id)!.id)}>Revisar la siguiente</button>
                )}
                <span className="muted" style={{ alignSelf: "center" }}>¿Registrada por error? Pide al jefe que la anule desde Auditoría.</span>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

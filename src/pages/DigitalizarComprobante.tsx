import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

import { digitalizarComprobante, registrarVentaComprobante, resolverCampo, resolverItems } from "../service/comprobanteService";
import { getProductos } from "../service/productoService";
import type { CampoComprobante, CampoOCR, Comprobante, ItemComprobante, ItemEntrada } from "../types/comprobante";
import type { Producto } from "../types/producto";

const SECCIONES: { titulo: string; campos: { key: CampoComprobante; label: string }[] }[] = [
  { titulo: "Cliente", campos: [{ key: "ruc_cliente", label: "RUC del cliente" }, { key: "cliente", label: "Razón social del cliente" }] },
  {
    titulo: "Factura",
    campos: [
      { key: "serie", label: "Serie y número" },
      { key: "fecha_emision", label: "Fecha de emisión" },
      { key: "subtotal", label: "Valor venta (sin IGV)" },
      { key: "igv", label: "IGV" },
      { key: "total", label: "Importe total" },
    ],
  },
  { titulo: "Emisor (se verifica que sea la empresa)", campos: [{ key: "ruc", label: "RUC del emisor" }, { key: "razon_social", label: "Razón social del emisor" }] },
];
const CAMPOS_OPCIONALES: CampoComprobante[] = ["razon_social"];
const VERDE = "#2e7d32";
const AMBAR = "#f9a825";
const soles = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });

const mensajeError = (err: unknown, porDefecto: string) =>
  (axios.isAxiosError(err) && typeof err.response?.data?.detail === "string" && err.response.data.detail) || porDefecto;

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
            {verde ? campo.valor : campo.conjunto.length > 1 ? "Varios valores posibles: elige el correcto" : "No se pudo leer: ingrésalo manualmente"}
          </p>
        </div>
        <span className={`badge ${verde ? "badge-ok" : "badge-warn"}`}>
          {campo.confianza === "confirmada" ? "Confirmado" : verde ? "Alta confianza" : "Requiere revisión"}
        </span>
      </div>

      {editable && verde && campo.confianza !== "confirmada" && !manual && (
        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.5rem" }}>
          <input type="checkbox" checked={confirmado} onChange={(e) => onConfirmar(e.target.checked)} />
          Es correcto
        </label>
      )}

      {editable && !verde && campo.conjunto.length > 1 && !manual && (
        <div className="btn-group" style={{ marginTop: "0.5rem", flexWrap: "wrap" }}>
          {campo.conjunto.map((v) => (
            <button key={v} className="btn btn-secondary" disabled={guardando} onClick={() => resolver(v, false)}>{v}</button>
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
  editable: boolean;
  catalogo: Producto[];
  onGuardar: (items: ItemEntrada[]) => Promise<void>;
};

function TablaItems({ items, subtotal, editable, catalogo, onGuardar }: TablaItemsProps) {
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
            <th>Cant.</th><th>Descripción</th><th>Valor unit.</th><th style={{ textAlign: "right" }}>Importe</th><th>Producto del catálogo</th>{editable && <th />}
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
                <td><input className="input" style={{ width: 90 }} disabled={!editable} value={f.valor_unitario} onChange={(e) => editar(n, { valor_unitario: e.target.value })} /></td>
                <td style={{ textAlign: "right" }}>{soles.format(importe(f))}</td>
                <td>
                  {editable ? (
                    <select className="select" value={f.crear_producto ? NUEVO : f.producto_id ?? ""}
                      onChange={(e) => editar(n, e.target.value === NUEVO ? { crear_producto: true, producto_id: null } : { crear_producto: false, producto_id: e.target.value ? Number(e.target.value) : null })}>
                      <option value="">— Elegir producto —</option>
                      {original && original.conjunto.length > 0 && (
                        <optgroup label="Coincidencias sugeridas">
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
                  {!editable ? null : seguro ? <span className="badge badge-ok" style={{ marginLeft: 6 }}>Seguro</span>
                    : !resuelto && <span className="badge badge-warn" style={{ marginLeft: 6 }}>{original?.conjunto.length ? "Elige" : "Sin coincidencia"}</span>}
                </td>
                {editable && <td><button className="btn btn-secondary" onClick={() => { setFilas((x) => x.filter((_, i) => i !== n)); setCambios(true); }}>Quitar</button></td>}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.6rem" }}>
        <span className={`badge ${cuadra ? "badge-ok" : "badge-warn"}`}>
          Suma de ítems {soles.format(suma)} {subtotal !== null && `· valor venta ${soles.format(Number(subtotal))}`}
        </span>
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

  const registrar = async () => {
    if (!resultado) return;
    setRegistrando(true);
    await conError(() => registrarVentaComprobante(resultado.id), "No se pudo registrar la venta");
    setRegistrando(false);
  };

  const pendiente = resultado?.estado === "pendiente_revision";
  const sinCheck = useMemo(() => (resultado ? SECCIONES.flatMap((s) => s.campos).filter(({ key }) => {
    const c = resultado.campos[key];
    return !CAMPOS_OPCIONALES.includes(key) && esSingleton(c) && c.confianza !== "confirmada" && !confirmados[key];
  }) : []), [resultado, confirmados]);
  const sunat = resultado?.validaciones.sunat;

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Digitalizar factura</h1>
          <p className="page-subtitle">Fotografía o carga una factura emitida por la empresa (JPG, PNG o PDF).</p>
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
          <button className="btn btn-primary" disabled={!archivo || !!etapa} onClick={procesar}>{etapa ? "Procesando…" : "Procesar factura"}</button>
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

      {resultado && (
        <div className="panel" style={{ marginTop: "1rem" }}>
          <div className="page-header" style={{ marginBottom: "0.75rem" }}>
            <div>
              <h3 style={{ margin: 0 }}>
                {resultado.estado === "registrado_automaticamente" && "Venta registrada automáticamente"}
                {resultado.estado === "registrado_con_revision" && "Venta registrada"}
                {pendiente && "Revisa los campos en ámbar"}
              </h3>
              {resultado.tiempo_procesamiento_ms != null && <p className="row-subtitle">Procesado en {(resultado.tiempo_procesamiento_ms / 1000).toFixed(1)} s</p>}
            </div>
          </div>

          <div className="btn-group" style={{ flexWrap: "wrap", marginBottom: "0.75rem" }}>
            {resultado.validaciones.duplicado_de_venta && (
              <span className="badge badge-warn">Ya registrada en la venta #{resultado.validaciones.duplicado_de_venta}</span>
            )}
            <span className={`badge ${resultado.validaciones.emisor_es_la_empresa !== false ? "badge-ok" : "badge-warn"}`}>Emisor = empresa</span>
            <span className={`badge ${resultado.validaciones.subtotal_mas_igv_igual_total ? "badge-ok" : "badge-warn"}`}>Valor venta + IGV = Total</span>
            <span className={`badge ${resultado.validaciones.items_suma_coincide ? "badge-ok" : "badge-warn"}`}>Ítems = valor venta</span>
            <span className={`badge ${resultado.ruc_validado ? "badge-ok" : "badge-warn"}`}>
              {sunat?.verificado_en_linea ? `SUNAT (cliente): ${sunat.estado ?? "sin estado"}` : "RUC del cliente"}{sunat?.detalle ? ` · ${sunat.detalle}` : ""}
            </span>
          </div>

          {SECCIONES.map((seccion) => (
            <div key={seccion.titulo} style={{ marginBottom: "1rem" }}>
              <h4 style={{ margin: "0.5rem 0" }}>{seccion.titulo}</h4>
              {seccion.campos.map(({ key, label }) => (
                <FilaCampo key={key} label={label} campo={resultado.campos[key]} editable={pendiente}
                  confirmado={!!confirmados[key]} onConfirmar={(v) => setConfirmados((c) => ({ ...c, [key]: v }))}
                  onResolver={(valor, manual) => conError(() => resolverCampo(resultado.id, key, valor, manual), "No se pudo guardar la corrección")} />
              ))}
            </div>
          ))}

          <h4 style={{ margin: "0.5rem 0" }}>Ítems ({resultado.items.length})</h4>
          <TablaItems items={resultado.items} subtotal={resultado.campos.subtotal.valor} editable={pendiente} catalogo={catalogo}
            onGuardar={(items) => conError(() => resolverItems(resultado.id, items), "No se pudieron guardar los ítems")} />

          {pendiente && (
            <div style={{ marginTop: "1rem" }}>
              {(resultado.pendientes.length > 0 || sinCheck.length > 0) && (
                <ul className="muted" style={{ paddingLeft: "1.2rem" }}>
                  {resultado.pendientes.map((p) => <li key={p}>{p}</li>)}
                  {sinCheck.length > 0 && <li>Marcar "Es correcto" en: {sinCheck.map(({ label }) => label).join(", ")}</li>}
                </ul>
              )}
              <button className="btn btn-primary" disabled={!resultado.puede_registrar || sinCheck.length > 0 || registrando} onClick={registrar}>
                {registrando ? "Registrando…" : "Registrar venta"}
              </button>
            </div>
          )}
          {resultado.venta_id && <p className="price">Venta #{resultado.venta_id} registrada con {resultado.items.length} ítem(s).</p>}
        </div>
      )}
    </section>
  );
}

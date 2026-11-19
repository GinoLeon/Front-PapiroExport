import { Fragment, useCallback, useEffect, useState } from "react";

import { borrarPiloto, guardarPiloto, obtenerPiloto, type FilaPiloto, type Piloto } from "../service/adminService";

const ETIQUETAS: Record<string, string> = {
  serie: "Serie", ruc: "RUC emisor", razon_social: "Razón social emisor", ruc_cliente: "RUC cliente", cliente: "Cliente",
  fecha_emision: "Fecha", subtotal: "Subtotal", igv: "IGV", total: "Total",
};
const REFRESCO_MS = 15000;
const num = (v: number | null | undefined, d = 1) => (v === null || v === undefined ? "—" : v.toLocaleString("es-PE", { minimumFractionDigits: d, maximumFractionDigits: d }));
const pval = (p: number | null) => (p === null ? "—" : p < 0.001 ? "< 0,001" : num(p, 3));
const minSeg = (s: number | null) => (s === null ? "—" : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`);
const der: React.CSSProperties = { textAlign: "right" };

type Borrador = { minutos: string; digitados: string; errores_manual: string[]; errores_sistema: string[]; tiempo_sistema_min: string };

const borradorDe = (f: FilaPiloto): Borrador => ({
  minutos: f.piloto?.tiempo_manual_s ? String(+(f.piloto.tiempo_manual_s / 60).toFixed(2)) : "",
  digitados: String(f.piloto?.campos_digitados_manual ?? f.campos_digitados_manual_sugerido),
  errores_manual: f.piloto?.errores_manual ?? [],
  errores_sistema: f.piloto?.errores_sistema ?? [],
  tiempo_sistema_min: f.piloto?.tiempo_sistema_s ? String(+(f.piloto.tiempo_sistema_s / 60).toFixed(2)) : "",
});

function Casillas({ campos, marcados, onChange }: { campos: string[]; marcados: string[]; onChange: (v: string[]) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem 0.9rem" }}>
      {campos.map((c) => (
        <label key={c} style={{ display: "inline-flex", gap: "0.3rem", alignItems: "center", fontSize: "0.9rem" }}>
          <input type="checkbox" checked={marcados.includes(c)}
                 onChange={(e) => onChange(e.target.checked ? [...marcados, c] : marcados.filter((m) => m !== c))} />
          {ETIQUETAS[c] ?? c}
        </label>
      ))}
    </div>
  );
}

export default function PilotoTablaV() {
  const [datos, setDatos] = useState<Piloto | null>(null);
  const [abierto, setAbierto] = useState<number | null>(null);
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [mensaje, setMensaje] = useState("");

  const cargar = useCallback(() => { obtenerPiloto().then(setDatos).catch(() => setMensaje("No se pudo cargar el piloto")); }, []);
  useEffect(() => {
    cargar();
    const id = window.setInterval(cargar, REFRESCO_MS);
    return () => window.clearInterval(id);
  }, [cargar]);

  if (!datos) return <div className="panel"><p className="muted">{mensaje || "Cargando piloto…"}</p></div>;
  const t = datos.tabla_v;
  const pendientes = datos.filas.filter((f) => !f.piloto).length;

  const abrir = (f: FilaPiloto) => { setAbierto(f.comprobante_id); setBorrador(borradorDe(f)); setMensaje(""); };
  const guardar = async (f: FilaPiloto) => {
    if (!borrador) return;
    const minutos = borrador.minutos ? parseFloat(borrador.minutos.replace(",", ".")) : null;
    const digitados = parseInt(borrador.digitados, 10);
    const ts = borrador.tiempo_sistema_min ? parseFloat(borrador.tiempo_sistema_min.replace(",", ".")) : null;
    if (!(digitados >= 0) || (minutos !== null && !(minutos > 0))) { setMensaje("Revisa los minutos y los campos digitados."); return; }
    try {
      await guardarPiloto(f.comprobante_id, {
        tiempo_manual_s: minutos ? Math.round(minutos * 60) : null, campos_digitados_manual: digitados,
        errores_manual: borrador.errores_manual, errores_sistema: borrador.errores_sistema,
        tiempo_sistema_s: ts && ts > 0 ? Math.round(ts * 60) : null,
      });
      setAbierto(null); setMensaje(`Guardado: ${f.serie ?? `#${f.comprobante_id}`}`); cargar();
    } catch { setMensaje("No se pudo guardar"); }
  };
  const quitar = async (f: FilaPiloto) => { await borrarPiloto(f.comprobante_id); setAbierto(null); cargar(); };

  return (
    <>
      <div className="panel" style={{ marginBottom: "1rem", overflowX: "auto" }}>
        <h3 style={{ marginTop: 0 }}>Tabla V · Comparación operativa durante el piloto</h3>
        <p className="row-subtitle">
          Progreso del piloto: <strong>{t.facturas} / {t.meta} facturas</strong> registradas · {t.auditadas} auditadas contra el papel ({t.campos} campos).
          Se actualiza cada {REFRESCO_MS / 1000} s.
        </p>
        <div style={{ height: 8, background: "var(--border)", borderRadius: 4, margin: "0.4rem 0 0.8rem" }}>
          <div style={{ width: `${Math.min(100, (100 * t.facturas) / t.meta)}%`, height: "100%", background: "var(--primary-500)", borderRadius: 4 }} />
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
          <thead><tr style={{ textAlign: "left" }}><th>Indicador</th><th style={der}>Manual (B0)</th><th style={der}>Sistema</th><th style={der}>p</th></tr></thead>
          <tbody>
            <tr style={{ borderTop: "1px solid var(--border)" }}>
              <td>Error por campo del registro (%)</td><td style={der}>{num(t.error_manual, 2)}</td><td style={der}>{num(t.error_sistema, 2)}</td>
              <td style={der}>{pval(t.p_error)} <span className="muted">McNemar</span></td>
            </tr>
            <tr style={{ borderTop: "1px solid var(--border)" }}>
              <td>Tiempo por venta (min, mediana)</td><td style={der}>{num(t.tiempo_manual_min, 2)}</td><td style={der}>{num(t.tiempo_sistema_min, 2)}</td>
              <td style={der}>{pval(t.p_tiempo)} <span className="muted">Wilcoxon (1 muestra)</span></td>
            </tr>
            <tr style={{ borderTop: "1px solid var(--border)" }}>
              <td>Campos digitados por venta</td><td style={der}>{num(t.digitados_manual)}</td><td style={der}>{num(t.digitados_sistema)}</td><td style={der}>—</td>
            </tr>
          </tbody>
        </table>
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          Tiempo manual: media cronometrada por lotes ({t.tiempo_manual_lotes.map((l) => `${l.facturas} facturas en ${l.minutos} min`).join("; ")};
          {" "}{t.tiempo_manual_facturas} facturas). Tiempo del sistema: mediana de {t.facturas_tiempo} facturas, medida automáticamente.
          Error por campo: solo facturas auditadas; con error solo en el manual {t.solo_manual}, solo en el sistema {t.solo_sistema}.
          Con p &lt; 0,05 la diferencia es significativa.
        </p>
      </div>

      <div className="panel" style={{ overflowX: "auto" }}>
        <h3 style={{ marginTop: 0 }}>Auditoría por factura ({pendientes} sin auditar)</h3>
        <p className="row-subtitle">
          El tiempo del sistema se mide solo. Para el error por campo, contrasta el registro manual y el del sistema con la factura
          en papel y marca qué campos quedaron mal en cada uno. El tiempo manual por factura es opcional.
        </p>
        {mensaje && <p className="muted"><strong>{mensaje}</strong></p>}
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
          <thead><tr style={{ textAlign: "left" }}>
            <th>Factura</th><th>Cliente</th><th style={der}>Tiempo sistema</th><th style={der}>Tiempo manual</th>
            <th style={der}>Errores manual / sistema</th><th></th>
          </tr></thead>
          <tbody>
            {datos.filas.map((f) => (
              <Fragment key={f.comprobante_id}>
                <tr style={{ borderTop: "1px solid var(--border)" }}>
                  <td>{f.serie ?? `#${f.comprobante_id}`}</td>
                  <td>{f.cliente ?? "—"}</td>
                  <td style={der}>{minSeg(f.tiempo_sistema_s)}</td>
                  <td style={der}>{f.piloto?.tiempo_manual_s ? minSeg(f.piloto.tiempo_manual_s) : "—"}</td>
                  <td style={der}>{f.piloto ? `${f.piloto.errores_manual.length} / ${f.piloto.errores_sistema.length}` : "—"}</td>
                  <td style={der}>
                    <button className={`btn ${f.piloto ? "btn-secondary" : "btn-primary"}`} onClick={() => abierto === f.comprobante_id ? setAbierto(null) : abrir(f)}>
                      {f.piloto ? "Editar" : "Auditar"}
                    </button>
                  </td>
                </tr>
                {abierto === f.comprobante_id && borrador && (
                  <tr>
                    <td colSpan={6} style={{ background: "var(--surface, #faf8f3)", padding: "0.8rem" }}>
                      <div className="form-grid">
                        <label>Tiempo del registro manual (min, opcional)
                          <input className="input" inputMode="decimal" value={borrador.minutos} placeholder={`referencia: ${num(t.tiempo_manual_min, 2)}`}
                                 onChange={(e) => setBorrador({ ...borrador, minutos: e.target.value })} />
                        </label>
                        <label>Campos digitados a mano
                          <input className="input" inputMode="numeric" value={borrador.digitados}
                                 onChange={(e) => setBorrador({ ...borrador, digitados: e.target.value })} />
                        </label>
                        <label>Tiempo del sistema cronometrado (min, opcional)
                          <input className="input" inputMode="decimal" value={borrador.tiempo_sistema_min}
                                 placeholder={`automático: ${minSeg(f.tiempo_sistema_s)}`}
                                 onChange={(e) => setBorrador({ ...borrador, tiempo_sistema_min: e.target.value })} />
                        </label>
                      </div>
                      <p style={{ margin: "0.7rem 0 0.3rem" }}><strong>Campos mal registrados a mano</strong></p>
                      <Casillas campos={datos.campos} marcados={borrador.errores_manual} onChange={(v) => setBorrador({ ...borrador, errores_manual: v })} />
                      <p style={{ margin: "0.7rem 0 0.3rem" }}><strong>Campos mal registrados por el sistema</strong></p>
                      <Casillas campos={datos.campos} marcados={borrador.errores_sistema} onChange={(v) => setBorrador({ ...borrador, errores_sistema: v })} />
                      <div className="btn-group" style={{ marginTop: "0.8rem" }}>
                        <button className="btn btn-primary" onClick={() => guardar(f)}>Guardar</button>
                        <button className="btn btn-secondary" onClick={() => setAbierto(null)}>Cancelar</button>
                        {f.piloto && <button className="btn btn-danger" onClick={() => quitar(f)}>Quitar del piloto</button>}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {datos.filas.length === 0 && <tr><td colSpan={6} className="muted">Aún no hay facturas registradas.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

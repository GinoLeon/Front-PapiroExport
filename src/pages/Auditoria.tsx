import { useEffect, useState } from "react";

import { coberturaPorCampo, listarComprobantes, type CoberturaAdmin, type ComprobanteAdmin } from "../service/adminService";

const ETIQUETAS: Record<string, string> = {
  serie: "Serie", ruc: "RUC emisor", razon_social: "Razón social emisor", ruc_cliente: "RUC cliente", cliente: "Cliente",
  fecha_emision: "Fecha", subtotal: "Valor venta", igv: "IGV", total: "Total", producto: "Producto",
};
const ESTADOS: Record<string, string> = {
  pendiente_revision: "Pendiente", registrado_automaticamente: "Automático", registrado_con_revision: "Con revisión", importado_historial: "Historial",
};
const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(1)}%`);

export default function Auditoria() {
  const [estado, setEstado] = useState("");
  const [comprobantes, setComprobantes] = useState<ComprobanteAdmin[]>([]);
  const [cobertura, setCobertura] = useState<CoberturaAdmin | null>(null);

  useEffect(() => { coberturaPorCampo().then(setCobertura).catch(() => setCobertura(null)); }, []);
  useEffect(() => { listarComprobantes(estado || undefined).then(setComprobantes).catch(() => setComprobantes([])); }, [estado]);

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Auditoría de digitalización</h1>
          <p className="page-subtitle">Facturas procesadas por el pipeline y verificación de la garantía de cobertura en uso real.</p>
        </div>
      </header>

      {cobertura && (
        <div className="panel" style={{ marginBottom: "1rem", overflowX: "auto" }}>
          <h3 style={{ marginTop: 0 }}>Cobertura por campo (objetivo {pct(cobertura.objetivo)})</h3>
          <p className="row-subtitle">
            Sobre facturas revisadas por un vendedor: porcentaje en que el valor real estaba dentro del conjunto de predicción.
            Una "falla" es un "Ninguna es correcta".
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
            <thead><tr style={{ textAlign: "left" }}><th>Campo</th><th style={{ textAlign: "right" }}>Revisados</th><th style={{ textAlign: "right" }}>Fallas</th><th style={{ textAlign: "right" }}>Cobertura</th></tr></thead>
            <tbody>
              {cobertura.campos.map((c) => (
                <tr key={c.campo} style={{ borderTop: "1px solid var(--border)" }}>
                  <td>{ETIQUETAS[c.campo] ?? c.campo}</td>
                  <td style={{ textAlign: "right" }}>{c.revisados}</td>
                  <td style={{ textAlign: "right" }}>{c.fallas}</td>
                  <td style={{ textAlign: "right" }}>
                    <span className={`badge ${c.cobertura === null ? "" : c.cobertura >= cobertura.objetivo ? "badge-ok" : "badge-warn"}`}>{pct(c.cobertura)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted">Correcciones de producto (el vendedor eligió fuera de los candidatos): {cobertura.productos.correcciones}</p>
          {cobertura.fallas_recientes.length > 0 && (
            <>
              <h4>Últimas fallas</h4>
              <ul className="muted" style={{ paddingLeft: "1.2rem" }}>
                {cobertura.fallas_recientes.map((f, i) => (
                  <li key={i}>{f.serie ?? `#${f.comprobante_id}`} · {ETIQUETAS[f.campo] ?? f.campo}: el sistema propuso [{f.candidatos.join(", ") || "nada"}], el valor real era <strong>{f.valor_real}</strong></li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="panel" style={{ overflowX: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
          <h3 style={{ margin: 0 }}>Facturas digitalizadas ({comprobantes.length})</h3>
          <select className="select" value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820, marginTop: "0.75rem" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th>Fecha</th><th>Serie</th><th>Cliente</th><th style={{ textAlign: "right" }}>Total</th><th>Ítems</th><th>Vendedor</th><th>Estado</th><th>Tiempo</th><th>Fallas</th>
            </tr>
          </thead>
          <tbody>
            {comprobantes.map((c) => (
              <tr key={c.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td>{new Date(c.creado_en).toLocaleDateString("es-PE")}</td>
                <td>{c.serie ?? "—"}</td>
                <td>{c.cliente ?? "—"}</td>
                <td style={{ textAlign: "right" }}>{c.total ? `S/ ${c.total}` : "—"}</td>
                <td>{c.items}</td>
                <td>{c.vendedor}</td>
                <td><span className={`badge ${c.venta_id ? "badge-ok" : "badge-warn"}`}>{ESTADOS[c.estado] ?? c.estado}{c.venta_id ? ` · venta #${c.venta_id}` : ""}</span></td>
                <td>{c.tiempo_procesamiento_ms != null ? `${(c.tiempo_procesamiento_ms / 1000).toFixed(1)} s` : "—"}</td>
                <td>{c.fallas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

import { useCallback, useEffect, useState } from "react";

import PilotoTablaV from "../components/PilotoTablaV";
import { estadisticasPipeline, type EstadisticasAdmin, type ResumenUso } from "../service/adminService";

const ETIQUETAS: Record<string, string> = {
  serie: "Serie y número", ruc: "RUC emisor", razon_social: "Razón social emisor", ruc_cliente: "RUC cliente", cliente: "Razón social cliente",
  fecha_emision: "Fecha de emisión", subtotal: "Subtotal", igv: "IGV", total: "Importe total",
};
const REFRESCO_MS = 15000;
const num = (v: number | null | undefined, d = 1) => (v === null || v === undefined ? "—" : v.toLocaleString("es-PE", { minimumFractionDigits: d, maximumFractionDigits: d }));
const pct = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${num(v)} %`);
const th: React.CSSProperties = { textAlign: "right" };

function Kpi({ titulo, valor, paper, meta, ok }: { titulo: string; valor: string; paper: string; meta: string; ok: boolean | null }) {
  return (
    <div className="panel metric-card">
      <div className="muted" style={{ fontSize: "0.85rem" }}>{titulo}</div>
      <div className="price" style={{ fontSize: "1.8rem", margin: "0.25rem 0" }}>{valor}</div>
      <div className="row-subtitle">Paper: {paper}</div>
      <span className={`badge ${ok === null ? "" : ok ? "badge-ok" : "badge-warn"}`} style={{ marginTop: "0.4rem" }}>Meta {meta}</span>
    </div>
  );
}

function Progreso({ puntos, refExactitud, refRevision }: { puntos: EstadisticasAdmin["progreso"]; refExactitud: number; refRevision: number }) {
  if (puntos.length < 2) return <p className="muted">La curva aparece cuando haya al menos 2 facturas registradas.</p>;
  const W = 640, H = 220, P = 30;
  const x = (n: number) => P + ((n - 1) / Math.max(puntos.length - 1, 1)) * (W - 2 * P);
  const y = (v: number) => H - P - (v / 100) * (H - 2 * P);
  const linea = (k: "exactitud" | "revision") =>
    puntos.filter((p) => p[k] !== null).map((p, i) => `${i ? "L" : "M"}${x(p.n - puntos[0].n + 1).toFixed(1)},${y(p[k] as number).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="line-chart" role="img" aria-label="Exactitud y revisión acumuladas por factura registrada">
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1={P} x2={W - P} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth={0.6} />
          <text x={4} y={y(v) + 4} fontSize={10} fill="var(--ink-soft)">{v}%</text>
        </g>
      ))}
      <line x1={P} x2={W - P} y1={y(refExactitud)} y2={y(refExactitud)} stroke="var(--primary-500)" strokeDasharray="4 3" strokeWidth={1} />
      <line x1={P} x2={W - P} y1={y(refRevision)} y2={y(refRevision)} stroke="var(--secondary-700)" strokeDasharray="4 3" strokeWidth={1} />
      <path d={linea("exactitud")} fill="none" stroke="var(--primary-500)" strokeWidth={2} />
      <path d={linea("revision")} fill="none" stroke="var(--secondary-700)" strokeWidth={2} />
      <text x={W - P} y={H - 8} fontSize={10} textAnchor="end" fill="var(--ink-soft)">facturas registradas: {puntos[puntos.length - 1].n}</text>
    </svg>
  );
}

function FilaUso({ nombre, r, refExactitud, refRevision, refN }: { nombre: string; r: ResumenUso; refExactitud: number; refRevision: number; refN: number }) {
  return (
    <tr style={{ borderTop: "1px solid var(--border)" }}>
      <td>{nombre}</td>
      <td style={th}>{r.facturas} / {refN}</td>
      <td style={th}>{pct(r.exactitud)} <span className="muted">({num(refExactitud)})</span></td>
      <td style={th}>{pct(r.revision)} <span className="muted">({num(refRevision)})</span></td>
      <td style={th}>{pct(r.cobertura)}</td>
      <td style={th}>{pct(r.automaticas)}</td>
      <td style={th}>{r.latencia_p95_s === null ? "—" : `${num(r.latencia_p95_s)} s`}</td>
    </tr>
  );
}

export default function Estadisticas() {
  const [datos, setDatos] = useState<EstadisticasAdmin | null>(null);
  const [error, setError] = useState("");
  const [actualizado, setActualizado] = useState<Date | null>(null);

  const cargar = useCallback(() => {
    estadisticasPipeline()
      .then((d) => { setDatos(d); setError(""); setActualizado(new Date()); })
      .catch(() => setError("No se pudieron cargar las estadísticas"));
  }, []);

  useEffect(() => {
    cargar();
    const id = window.setInterval(cargar, REFRESCO_MS);
    return () => window.clearInterval(id);
  }, [cargar]);

  if (!datos) return <section className="page"><p className={error ? "error" : "muted"}>{error || "Cargando…"}</p></section>;
  const { en_uso: uso, paper } = datos;
  const ref = paper.referencia;
  const t = uso.total;

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Estadísticas del sistema</h1>
          <p className="page-subtitle">
            Métricas del artículo recalculadas con cada factura que se registra, junto al valor publicado.
            Se actualiza cada {REFRESCO_MS / 1000} s{actualizado ? ` · última: ${actualizado.toLocaleTimeString("es-PE")}` : ""}.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={cargar}>Actualizar</button>
      </header>
      {error && <p className="error">{error}</p>}

      <div className="dashboard-grid" style={{ marginBottom: "1rem" }}>
        <Kpi titulo="Facturas registradas" valor={`${t.facturas}`} paper={`${ref.facturas.pdf} PDF + ${ref.facturas.foto} fotos`}
             meta={`${uso.pendientes} pendientes`} ok={null} />
        <Kpi titulo="C2 · Exactitud por campo (1.er candidato)" valor={pct(t.exactitud)} paper={`${num(ref.exactitud_media.foto)} % foto · ${num(ref.exactitud_media.pdf)} % PDF`}
             meta="> 90 %" ok={t.exactitud === null ? null : t.exactitud > 90} />
        <Kpi titulo="C3 · Cobertura del conjunto" valor={pct(t.cobertura)} paper={`${num(ref.cobertura)} %`}
             meta="≥ 98 %" ok={t.cobertura === null ? null : t.cobertura >= 98} />
        <Kpi titulo="C4 · Campos derivados a revisión" valor={pct(t.revision)} paper={`${num(ref.revision.foto)} % foto · ${num(ref.revision.pdf)} % PDF`}
             meta="≤ 30 %" ok={t.revision === null ? null : t.revision <= 30} />
        <Kpi titulo="C5 · Latencia p95" valor={t.latencia_p95_s === null ? "—" : `${num(t.latencia_p95_s)} s`} paper={`${num(ref.latencia_p95_s)} s`}
             meta="≤ 5 s" ok={t.latencia_p95_s === null ? null : t.latencia_p95_s <= 5} />
      </div>

      <div className="panel" style={{ marginBottom: "1rem" }}>
        <h3 style={{ marginTop: 0 }}>Progreso a medida que se registran facturas</h3>
        <p className="row-subtitle">
          <span style={{ color: "var(--primary-500)" }}>━ exactitud acumulada</span> · <span style={{ color: "var(--secondary-700)" }}>━ campos derivados a revisión</span> ·
          líneas punteadas: valor del paper en fotos.
        </p>
        <Progreso puntos={datos.progreso} refExactitud={ref.exactitud_media.foto} refRevision={ref.revision.foto} />
      </div>

      <div className="panel" style={{ marginBottom: "1rem", overflowX: "auto" }}>
        <h3 style={{ marginTop: 0 }}>En uso real por tipo de documento</h3>
        <p className="row-subtitle">Entre paréntesis, el valor del paper. "Automáticas" son facturas registradas sin intervención.</p>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
          <thead><tr style={{ textAlign: "left" }}>
            <th>Tipo</th><th style={th}>Facturas (paper)</th><th style={th}>Exactitud</th><th style={th}>Revisión</th><th style={th}>Cobertura</th><th style={th}>Automáticas</th><th style={th}>Latencia p95</th>
          </tr></thead>
          <tbody>
            <FilaUso nombre="PDF" r={uso.pdf} refExactitud={ref.exactitud_media.pdf} refRevision={ref.revision.pdf} refN={ref.facturas.pdf} />
            <FilaUso nombre="Foto" r={uso.foto} refExactitud={ref.exactitud_media.foto} refRevision={ref.revision.foto} refN={ref.facturas.foto} />
          </tbody>
        </table>
      </div>

      <div className="panel" style={{ marginBottom: "1rem", overflowX: "auto" }}>
        <h3 style={{ marginTop: 0 }}>Exactitud por campo (Tabla III)</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
          <thead><tr style={{ textAlign: "left" }}>
            <th>Campo</th><th style={th}>En uso</th><th style={th}>n</th><th style={th}>Revisión</th><th style={th}>Paper PDF</th><th style={th}>Paper foto</th>
          </tr></thead>
          <tbody>
            {datos.por_campo.map((c) => (
              <tr key={c.campo} style={{ borderTop: "1px solid var(--border)" }}>
                <td>{ETIQUETAS[c.campo] ?? c.campo}</td>
                <td style={th}><span className={`badge ${c.exactitud === null ? "" : c.exactitud > 90 ? "badge-ok" : "badge-warn"}`}>{pct(c.exactitud)}</span></td>
                <td style={th}>{c.n}</td>
                <td style={th}>{pct(c.revision)}</td>
                <td style={th}>{num(c.paper_pdf)} %</td>
                <td style={th}>{num(c.paper_foto)} %</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PilotoTablaV />
    </section>
  );
}

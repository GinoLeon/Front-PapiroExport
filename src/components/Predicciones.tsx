import { useEffect, useState } from "react";

import { prediccionClientes, prediccionProductos, prediccionVentas } from "../service/prediccionService";
import type { EvaluacionPrediccion, PrediccionClientes, PrediccionProductos, PrediccionVentas } from "../types/prediccion";

const soles = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 0 });
const NOMBRES_MODELO: Record<string, string> = {
  voting: "Voting Regressor", ridge: "Ridge", bosque: "Random Forest", boosting: "Gradient Boosting",
  ingenuo_mes_anterior: "Igual al mes anterior", media_3_meses: "Promedio 3 meses", promedio_historico: "Promedio histórico",
};
const ANCHO = 760;
const ALTO = 240;
const MESES_VISIBLES = 18;

function Evaluacion({ evaluacion, unidad }: { evaluacion?: EvaluacionPrediccion | null; unidad: (v: number) => string }) {
  if (!evaluacion) return null;
  return (
    <p className="row-subtitle" style={{ margin: "0.4rem 0" }}>
      <span className={`badge ${evaluacion.supera_linea_base ? "badge-ok" : "badge-warn"}`} style={{ marginRight: 6 }}>
        {evaluacion.supera_linea_base ? "Supera a la regla simple" : "No supera a la regla simple"}
      </span>
      Error medio (backtest, últimos {evaluacion.meses_evaluados} meses):{" "}
      {Object.entries(evaluacion.mae).filter(([, v]) => v !== null).map(([k, v]) => `${NOMBRES_MODELO[k] ?? k} ${unidad(v as number)}`).join(" · ")}
    </p>
  );
}

function Grafico({ datos }: { datos: PrediccionVentas }) {
  const historico = datos.historico.slice(-MESES_VISIBLES);
  const puntos = [
    ...historico.map((h) => ({ ...h, minimo: h.total, maximo: h.total, futuro: false })),
    ...datos.pronostico.map((p) => ({ ...p, futuro: true })),
  ];
  const maximo = Math.max(...puntos.map((p) => p.maximo), 1);
  const x = (i: number) => 20 + (i / Math.max(puntos.length - 1, 1)) * (ANCHO - 40);
  const y = (v: number) => ALTO - 20 - (v / maximo) * (ALTO - 40);
  const linea = (desde: number, hasta: number) => puntos.slice(desde, hasta).map((p, i) => `${x(desde + i)},${y(p.total)}`).join(" ");
  const corte = historico.length - 1;
  const banda = [
    `${x(corte)},${y(historico[corte]?.total ?? 0)}`,
    ...datos.pronostico.map((p, i) => `${x(corte + 1 + i)},${y(p.maximo)}`),
    ...datos.pronostico.map((p, i) => `${x(corte + 1 + i)},${y(p.minimo)}`).reverse(),
  ].join(" ");
  return (
    <>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="line-chart" role="img" aria-label="Ventas mensuales y pronóstico">
        <polygon points={banda} fill="var(--accent)" opacity={0.18} />
        <polyline points={linea(0, historico.length)} fill="none" stroke="var(--brand)" strokeWidth={3} />
        <polyline points={linea(corte, puntos.length)} fill="none" stroke="var(--accent)" strokeWidth={3} strokeDasharray="6 5" />
        {puntos.map((p, i) => (
          <circle key={p.mes} cx={x(i)} cy={y(p.total)} r={3.5} fill={p.futuro ? "var(--accent)" : "var(--brand)"}>
            <title>{`${p.mes}: ${soles.format(p.total)}`}</title>
          </circle>
        ))}
      </svg>
      <div className="chart-labels">{puntos.map((p, i) => <span key={p.mes}>{i % 3 === 0 || p.futuro ? p.mes.slice(2) : ""}</span>)}</div>
    </>
  );
}

export default function Predicciones() {
  const [ventas, setVentas] = useState<PrediccionVentas | null>(null);
  const [productos, setProductos] = useState<PrediccionProductos | null>(null);
  const [clientes, setClientes] = useState<PrediccionClientes | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([prediccionVentas(3), prediccionProductos(10), prediccionClientes(10)])
      .then(([v, p, c]) => { setVentas(v); setProductos(p); setClientes(c); })
      .catch(() => setError(true));
  }, []);

  if (error) return <div className="panel"><p className="muted">No se pudieron calcular las predicciones.</p></div>;
  if (!ventas || !productos || !clientes) return <div className="panel"><p className="muted">Entrenando modelos de predicción…</p></div>;
  if (!ventas.suficiente) return <div className="panel"><p className="muted">{ventas.advertencia}</p></div>;

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div className="panel chart-wrap">
        <h3 style={{ margin: 0 }}>Pronóstico de ventas (Voting Regressor)</h3>
        <p className="row-subtitle">
          Próximos meses: {ventas.pronostico.map((p) => `${p.mes} ${soles.format(p.total)} (${soles.format(p.minimo)}–${soles.format(p.maximo)})`).join(" · ")}
        </p>
        <Grafico datos={ventas} />
        <Evaluacion evaluacion={ventas.evaluacion} unidad={(v) => soles.format(v)} />
        {ventas.advertencia && <p className="muted">{ventas.advertencia}</p>}
        <p className="muted" style={{ fontSize: "0.8rem" }}>
          Banda: intervalo aproximado al {Math.round((ventas.nivel_intervalo ?? 0.8) * 100)}% según los errores del backtest.
        </p>
      </div>

      <div className="dashboard-grid">
        <div className="panel" style={{ overflowX: "auto" }}>
          <h3 style={{ margin: 0 }}>Productos con más demanda esperada · {productos.mes_objetivo}</h3>
          <Evaluacion evaluacion={productos.evaluacion} unidad={(v) => `${v} u.`} />
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}><th>Producto</th><th style={{ textAlign: "right" }}>Esperado</th><th style={{ textAlign: "right" }}>Últ. 12 meses</th></tr>
            </thead>
            <tbody>
              {productos.items.map((p) => (
                <tr key={p.producto_id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td>{p.nombre}</td>
                  <td style={{ textAlign: "right" }}>{p.cantidad_esperada} u.</td>
                  <td style={{ textAlign: "right" }}>{p.unidades_ultimos_12_meses} u. en {p.meses_con_venta_12} mes(es)</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel" style={{ overflowX: "auto" }}>
          <h3 style={{ margin: 0 }}>Clientes con más compra esperada · {clientes.mes_objetivo}</h3>
          <Evaluacion evaluacion={clientes.evaluacion} unidad={(v) => soles.format(v)} />
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}><th>Cliente</th><th style={{ textAlign: "right" }}>Esperado</th><th>Suele pedir</th></tr>
            </thead>
            <tbody>
              {clientes.items.map((c) => (
                <tr key={c.cliente_id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td>
                    {c.nombre}
                    <div className="muted" style={{ fontSize: "0.8rem" }}>compró en {c.meses_con_compra_12} de los últimos 12 meses</div>
                  </td>
                  <td style={{ textAlign: "right" }}>{soles.format(c.monto_esperado)}</td>
                  <td style={{ fontSize: "0.85rem" }}>{c.productos_habituales.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";

import { getVentas } from "../service/ventaService";
import type { VentaResponse } from "../types/venta";
import { useEffect } from "react";

type FilterMode = "year" | "last6" | "last3" | "custom";

type Bucket = {
  key: string;
  label: string;
  start: Date;
  end: Date;
};

const currency = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

const Dashboard = () => {
  const [ventas, setVentas] = useState<VentaResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<FilterMode>("year");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getVentas();
        setVentas(data);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const years = useMemo(() => {
    const setYears = new Set<number>(ventas.map((v) => new Date(v.fecha_venta).getFullYear()));
    if (!setYears.has(new Date().getFullYear())) setYears.add(new Date().getFullYear());
    return Array.from(setYears).sort((a, b) => b - a);
  }, [ventas]);

  const buckets = useMemo<Bucket[]>(() => {
    const now = new Date();

    if (mode === "year") {
      return Array.from({ length: 12 }, (_, idx) => {
        const monthDate = new Date(year, idx, 1);
        return {
          key: `${year}-${idx + 1}`,
          label: monthDate.toLocaleDateString("es-PE", { month: "short" }),
          start: startOfMonth(monthDate),
          end: endOfMonth(monthDate),
        };
      });
    }

    if (mode === "last6" || mode === "last3") {
      const n = mode === "last6" ? 6 : 3;
      const arr: Bucket[] = [];
      for (let i = n - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        arr.push({
          key: `${d.getFullYear()}-${d.getMonth() + 1}`,
          label: d.toLocaleDateString("es-PE", { month: "short" }),
          start: startOfMonth(d),
          end: endOfMonth(d),
        });
      }
      return arr;
    }

    if (!fromDate || !toDate) return [];

    const start = new Date(`${fromDate}T00:00:00`);
    const end = new Date(`${toDate}T23:59:59`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];

    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 62) {
      const items: Bucket[] = [];
      const cursor = new Date(start);
      while (cursor <= end) {
        const dayStart = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
        const dayEnd = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), 23, 59, 59, 999);
        items.push({
          key: dayStart.toISOString(),
          label: dayStart.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit" }),
          start: dayStart,
          end: dayEnd,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      return items;
    }

    const items: Bucket[] = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

    while (cursor <= endMonth) {
      const d = new Date(cursor);
      items.push({
        key: `${d.getFullYear()}-${d.getMonth() + 1}`,
        label: d.toLocaleDateString("es-PE", { month: "short", year: "2-digit" }),
        start: startOfMonth(d),
        end: endOfMonth(d),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return items;
  }, [mode, year, fromDate, toDate]);

  const ventasFiltradas = useMemo(() => {
    if (buckets.length === 0) return [];
    const start = buckets[0].start;
    const end = buckets[buckets.length - 1].end;
    return ventas.filter((v) => {
      const d = new Date(v.fecha_venta);
      return d >= start && d <= end;
    });
  }, [ventas, buckets]);

  const series = useMemo(() => {
    return buckets.map((b) => {
      const total = ventas
        .filter((v) => {
          const d = new Date(v.fecha_venta);
          return d >= b.start && d <= b.end;
        })
        .reduce((acc, v) => acc + Number(v.total), 0);

      return { label: b.label, total };
    });
  }, [ventas, buckets]);

  const maxY = useMemo(() => {
    const m = Math.max(...series.map((s) => s.total), 0);
    return m === 0 ? 1 : m;
  }, [series]);

  const chartPoints = useMemo(() => {
    if (series.length === 0) return "";
    const width = 760;
    const height = 260;
    return series
      .map((s, i) => {
        const x = series.length === 1 ? width / 2 : (i / (series.length - 1)) * (width - 30) + 15;
        const y = height - (s.total / maxY) * (height - 20) - 10;
        return `${x},${y}`;
      })
      .join(" ");
  }, [series, maxY]);

  const kpis = useMemo(() => {
    const total = ventasFiltradas.reduce((acc, v) => acc + Number(v.total), 0);
    const count = ventasFiltradas.length;
    const confirmed = ventasFiltradas.filter((v) => v.confirmado).length;
    const avg = count ? total / count : 0;
    return { total, count, confirmed, avg };
  }, [ventasFiltradas]);

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Analisis de ventas con filtros por periodo.</p>
        </div>
      </header>

      <div className="panel" style={{ marginBottom: "1rem" }}>
        <div className="filter-row">
          <select className="select" value={mode} onChange={(e) => setMode(e.target.value as FilterMode)}>
            <option value="year">Por año</option>
            <option value="last6">Ultimos 6 meses</option>
            <option value="last3">Ultimos 3 meses</option>
            <option value="custom">Rango personalizado</option>
          </select>

          {mode === "year" && (
            <select className="select" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          )}

          {mode === "custom" && (
            <>
              <input className="input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <input className="input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </>
          )}
        </div>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: "1rem" }}>
        <article className="panel metric-card">
          <p className="row-subtitle">Ingresos del periodo</p>
          <p className="price">{currency.format(kpis.total)}</p>
        </article>
        <article className="panel metric-card">
          <p className="row-subtitle">Ventas registradas</p>
          <p className="price">{kpis.count}</p>
        </article>
        <article className="panel metric-card">
          <p className="row-subtitle">Ventas confirmadas</p>
          <p className="price">{kpis.confirmed}</p>
        </article>
        <article className="panel metric-card">
          <p className="row-subtitle">Ticket promedio</p>
          <p className="price">{currency.format(kpis.avg)}</p>
        </article>
      </div>

      <div className="panel chart-wrap">
        <div className="page-header" style={{ marginBottom: "0.5rem" }}>
          <div>
            <h3 style={{ margin: 0 }}>Historial de ventas</h3>
            <p className="row-subtitle">Linea de ingresos por periodo</p>
          </div>
        </div>

        {loading ? (
          <p className="muted">Cargando...</p>
        ) : series.length === 0 ? (
          <p className="muted">Selecciona un rango valido para visualizar el grafico.</p>
        ) : (
          <>
            <svg viewBox="0 0 760 260" preserveAspectRatio="none" className="line-chart">
              <polyline points={chartPoints} fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" />
              {series.map((s, i) => {
                const x = series.length === 1 ? 380 : (i / (series.length - 1)) * (760 - 30) + 15;
                const y = 260 - (s.total / maxY) * (260 - 20) - 10;
                return <circle key={`${s.label}-${i}`} cx={x} cy={y} r="4" fill="var(--accent)" />;
              })}
            </svg>
            <div className="chart-labels">
              {series.map((s) => (
                <span key={s.label}>{s.label}</span>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default Dashboard;

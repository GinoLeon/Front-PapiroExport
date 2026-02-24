import { useEffect, useMemo, useState } from "react";

import { getVentas } from "../service/ventaService";
import type { VentaResponse } from "../types/venta";

const Pagos = () => {
  const [ventas, setVentas] = useState<VentaResponse[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const data = await getVentas();
      setVentas(data);
    };

    fetchData();
  }, []);

  const metrics = useMemo(() => {
    const total = ventas.reduce((acc, v) => acc + Number(v.total), 0);
    const confirmadas = ventas.filter((v) => v.confirmado);
    const pendientes = ventas.filter((v) => !v.confirmado);

    return {
      total,
      confirmadas: confirmadas.length,
      pendientes: pendientes.length,
      cobrado: confirmadas.reduce((acc, v) => acc + Number(v.total), 0),
    };
  }, [ventas]);

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Panel de pagos</h1>
          <p className="page-subtitle">Vista administrativa de cobranzas y estado financiero.</p>
        </div>
      </header>

      <div className="form-grid" style={{ marginBottom: "1rem" }}>
        <article className="panel">
          <p className="row-subtitle">Ventas registradas</p>
          <p className="price">{ventas.length}</p>
        </article>
        <article className="panel">
          <p className="row-subtitle">Confirmadas</p>
          <p className="price">{metrics.confirmadas}</p>
        </article>
        <article className="panel">
          <p className="row-subtitle">Pendientes</p>
          <p className="price">{metrics.pendientes}</p>
        </article>
        <article className="panel">
          <p className="row-subtitle">Total cobrado</p>
          <p className="price">S/ {metrics.cobrado.toFixed(2)}</p>
        </article>
      </div>

      <div className="panel">
        <p className="row-subtitle">Facturacion total acumulada</p>
        <p className="price">S/ {metrics.total.toFixed(2)}</p>
      </div>
    </section>
  );
};

export default Pagos;

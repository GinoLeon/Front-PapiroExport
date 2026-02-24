import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../context/AuthContext";
import { getClientes } from "../service/clienteService";
import { actualizarVenta, getVentas } from "../service/ventaService";
import type { Cliente } from "../types/cliente";
import type { MetodoPago, VentaResponse, VentaUpdate } from "../types/venta";

const VentasLista = () => {
  const { hasRole } = useAuth();
  const canConfirm = hasRole("admin", "vendedor");

  const [ventas, setVentas] = useState<VentaResponse[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filtroCliente, setFiltroCliente] = useState<number | "">("");
  const [filtroMetodo, setFiltroMetodo] = useState<string>("");
  const [filtroConfirmado, setFiltroConfirmado] = useState<boolean | "">("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [expandedVentas, setExpandedVentas] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const fetchData = async () => {
      const [ventasData, clientesData] = await Promise.all([getVentas(), getClientes()]);
      setVentas(ventasData);
      setClientes(clientesData.filter((c) => c.activo));
    };

    fetchData();
  }, []);

  const ventasFiltradas = useMemo(
    () =>
      ventas.filter((v) => {
        if (filtroCliente && v.cliente_id !== filtroCliente) return false;
        if (filtroMetodo && v.metodo_pago !== filtroMetodo) return false;
        if (filtroConfirmado !== "" && v.confirmado !== filtroConfirmado) return false;

        const fechaVenta = new Date(v.fecha_venta);
        if (fechaInicio && fechaVenta < new Date(fechaInicio)) return false;
        if (fechaFin && fechaVenta > new Date(fechaFin)) return false;

        return true;
      }),
    [ventas, filtroCliente, filtroMetodo, filtroConfirmado, fechaInicio, fechaFin]
  );

  const confirmarPago = async (ventaId: number, metodoPago: MetodoPago) => {
    const payload: VentaUpdate = {
      metodo_pago: metodoPago,
      fecha_pago: new Date().toISOString(),
      confirmado: true,
    };

    try {
      await actualizarVenta(ventaId, payload);
      setVentas((prev) =>
        prev.map((vt) =>
          vt.id === ventaId
            ? { ...vt, confirmado: true, metodo_pago: metodoPago, fecha_pago: new Date().toISOString() }
            : vt
        )
      );
    } catch {
      alert("No se pudo confirmar el pago");
    }
  };

  const cambiarMetodoTemporal = (ventaId: number, metodo: MetodoPago) => {
    setVentas((prev) => prev.map((v) => (v.id === ventaId ? { ...v, metodo_pago: metodo } : v)));
  };

  const toggleDetalle = (ventaId: number) => {
    setExpandedVentas((prev) => ({ ...prev, [ventaId]: !prev[ventaId] }));
  };

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Listado de ventas</h1>
          <p className="page-subtitle">Filtra operaciones y confirma pagos pendientes.</p>
        </div>
      </header>

      <div className="panel" style={{ marginBottom: "1rem" }}>
        <div className="form-grid">
          <select className="select" value={filtroCliente} onChange={(e) => setFiltroCliente(Number(e.target.value) || "") }>
            <option value="">Todos los clientes</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>

          <select className="select" value={filtroMetodo} onChange={(e) => setFiltroMetodo(e.target.value)}>
            <option value="">Todos los metodos</option>
            <option value="Yape">Yape</option>
            <option value="Deposito">Deposito</option>
            <option value="Debiendo">Debiendo</option>
          </select>

          <select
            className="select"
            value={filtroConfirmado === "" ? "" : filtroConfirmado.toString()}
            onChange={(e) => {
              const value = e.target.value;
              setFiltroConfirmado(value === "" ? "" : value === "true");
            }}
          >
            <option value="">Todos</option>
            <option value="true">Confirmado</option>
            <option value="false">No confirmado</option>
          </select>

          <input className="input" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
          <input className="input" type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
        </div>
      </div>

      <div className="grid-list">
        {ventasFiltradas.map((v) => {
          const cliente = clientes.find((c) => c.id === v.cliente_id);
          const isExpanded = Boolean(expandedVentas[v.id]);
          const detallesToShow = isExpanded ? v.detalles : v.detalles.slice(0, 2);
          const hasMore = v.detalles.length > 2;

          return (
            <article key={v.id} className="panel" style={{ padding: "0.9rem" }}>
              <div className="page-header" style={{ marginBottom: "0.5rem" }}>
                <div>
                  <h3 className="row-title">{cliente?.nombre || "Cliente eliminado"}</h3>
                  <p className="row-subtitle">RUC: {cliente?.ruc || "-"}</p>
                  <p className="row-subtitle">Fecha venta: {new Date(v.fecha_venta).toLocaleString()}</p>
                  <p className="row-subtitle">Fecha pago: {v.fecha_pago ? new Date(v.fecha_pago).toLocaleString() : "No registrada"}</p>
                </div>
                <div className={v.confirmado ? "badge badge-ok" : "badge badge-warn"}>
                  {v.confirmado ? "Confirmado" : "Pendiente"}
                </div>
              </div>

              <p className="row-subtitle">Metodo: {v.metodo_pago} | Total: S/ {Number(v.total).toFixed(2)}</p>

              <div style={{ margin: "0.6rem 0" }}>
                {detallesToShow.map((d) => (
                  <p key={d.producto_id} className="row-subtitle" style={{ margin: "0.12rem 0" }}>
                    Producto #{d.producto_id} x {d.cantidad}
                  </p>
                ))}

                {hasMore && (
                  <button type="button" className="btn btn-secondary" onClick={() => toggleDetalle(v.id)}>
                    {isExpanded ? "Ocultar detalles" : `Ver todos (${v.detalles.length})`}
                  </button>
                )}
              </div>

              {!v.confirmado && canConfirm && (
                <div className="btn-group">
                  <select
                    className="select"
                    style={{ maxWidth: 180 }}
                    value={v.metodo_pago as MetodoPago}
                    onChange={(e) => cambiarMetodoTemporal(v.id, e.target.value as MetodoPago)}
                  >
                    <option value="Yape">Yape</option>
                    <option value="Deposito">Deposito</option>
                  </select>
                  <button className="btn btn-primary" onClick={() => confirmarPago(v.id, v.metodo_pago as MetodoPago)}>
                    Confirmar pago
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default VentasLista;


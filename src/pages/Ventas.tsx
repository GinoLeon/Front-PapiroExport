import { useEffect, useMemo, useState } from "react";

import { getClientes } from "../service/clienteService";
import { getProductos } from "../service/productoService";
import { crearVenta } from "../service/ventaService";
import type { Cliente } from "../types/cliente";
import type { Producto } from "../types/producto";
import type { DetalleVentaCreate, MetodoPago, VentaCreate } from "../types/venta";

const Ventas = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("Yape");
  const [detalles, setDetalles] = useState<DetalleVentaCreate[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [clientesData, productosData] = await Promise.all([getClientes(), getProductos()]);
      setClientes(clientesData.filter((c) => c.activo));
      setProductos(productosData.filter((p) => p.activo));
    };

    fetchData();
  }, []);

  const agregarProducto = (productoId: number) => {
    if (detalles.find((d) => d.producto_id === productoId)) return;
    setDetalles((prev) => [...prev, { producto_id: productoId, cantidad: 1 }]);
  };

  const actualizarCantidad = (productoId: number, cantidad: number) => {
    setDetalles((prev) => prev.map((d) => (d.producto_id === productoId ? { ...d, cantidad: Math.max(1, cantidad) } : d)));
  };

  const eliminarDetalle = (productoId: number) => {
    setDetalles((prev) => prev.filter((d) => d.producto_id !== productoId));
  };

  const calcularSubtotal = (detalle: DetalleVentaCreate) => {
    const producto = productos.find((p) => p.id === detalle.producto_id);
    return producto ? Number(producto.precio) * detalle.cantidad : 0;
  };

  const total = useMemo(() => detalles.reduce((acc, d) => acc + calcularSubtotal(d), 0), [detalles, productos]);

  const registrarVenta = async () => {
    if (!clienteId || detalles.length === 0) {
      alert("Cliente y productos requeridos");
      return;
    }

    const ventaData: VentaCreate = { cliente_id: clienteId, detalles, metodo_pago: metodoPago };

    try {
      await crearVenta(ventaData);
      alert("Venta registrada correctamente");
      setClienteId(null);
      setDetalles([]);
      setMetodoPago("Yape");
    } catch {
      alert("Error al registrar la venta");
    }
  };

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Registrar Venta</h1>
          <p className="page-subtitle">Arma el pedido y confirma el metodo de pago.</p>
        </div>
      </header>

      <div className="sales-layout">
        <div className="panel">
          <div className="form-grid">
            <div>
              <label className="muted">Cliente</label>
              <select className="select" value={clienteId ?? ""} onChange={(e) => setClienteId(Number(e.target.value) || null)}>
                <option value="">Seleccionar cliente</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre} - RUC {c.ruc}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="muted">Metodo de pago</label>
              <select className="select" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}>
                <option value="Yape">Yape</option>
                <option value="Deposito">Deposito</option>
                <option value="Debiendo">Debiendo</option>
              </select>
            </div>
          </div>

          <h3>Catalogo</h3>
          <div className="grid-list">
            {productos.map((p) => (
              <article className="row-card" key={p.id}>
                <div>
                  <p className="row-title">{p.nombre}</p>
                  <p className="row-subtitle">S/ {Number(p.precio).toFixed(2)} | Stock {p.stock}</p>
                </div>
                <button className="btn btn-secondary" onClick={() => agregarProducto(p.id)} disabled={p.stock <= 0}>Agregar</button>
              </article>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>Detalle de venta</h3>
          <div className="grid-list">
            {detalles.length === 0 && <p className="muted">Aun no agregaste productos.</p>}
            {detalles.map((d) => {
              const producto = productos.find((p) => p.id === d.producto_id);
              if (!producto) return null;

              return (
                <article className="row-card" key={d.producto_id}>
                  <div>
                    <p className="row-title">{producto.nombre}</p>
                    <p className="row-subtitle">Subtotal: S/ {calcularSubtotal(d).toFixed(2)}</p>
                  </div>

                  <div className="btn-group">
                    <input
                      className="input"
                      style={{ width: 80 }}
                      type="number"
                      min={1}
                      max={producto.stock}
                      value={d.cantidad}
                      onChange={(e) => actualizarCantidad(d.producto_id, Number(e.target.value))}
                    />
                    <button className="btn btn-danger" onClick={() => eliminarDetalle(d.producto_id)}>Quitar</button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="sales-summary">
            <span className="muted">Total</span>
            <span className="price">S/ {total.toFixed(2)}</span>
          </div>

          <button className="btn btn-primary" onClick={registrarVenta} style={{ marginTop: "0.8rem" }}>
            Registrar venta
          </button>
        </div>
      </div>
    </section>
  );
};

export default Ventas;

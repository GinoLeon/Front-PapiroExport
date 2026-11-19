import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import { useAuth } from "../context/AuthContext";
import { crearOrdenProduccion, editarCantidadProduccion, getProducciones, realizarItemProduccion } from "../service/produccionService";
import { getProductos } from "../service/productoService";
import { getVentas } from "../service/ventaService";
import type { Produccion } from "../types/produccion";
import type { Producto } from "../types/producto";
import type { VentaResponse } from "../types/venta";

type Linea = { producto_id: string; cantidad: string };
const lineaVacia = (): Linea => ({ producto_id: "", cantidad: "" });
const mensajeError = (err: unknown, porDefecto: string) =>
  (axios.isAxiosError(err) && typeof err.response?.data?.detail === "string" && err.response.data.detail) || porDefecto;

const ProduccionPage = () => {
  const { hasRole } = useAuth();
  // Jefe y desarrollador planifican (generan órdenes y ajustan cantidades); logística ejecuta (marca lo producido).
  const puedePlanificar = hasRole("admin", "jefe");
  const puedeEjecutar = hasRole("admin", "jefe", "vendedor");

  const [producciones, setProducciones] = useState<Produccion[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ventas, setVentas] = useState<VentaResponse[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [cantidadInput, setCantidadInput] = useState("");
  const [verCompletadas, setVerCompletadas] = useState(false);

  const [formAbierto, setFormAbierto] = useState(false);
  const [ventaId, setVentaId] = useState("");
  const [nota, setNota] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([lineaVacia()]);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const nombreProducto = useMemo(() => Object.fromEntries(productos.map((p) => [p.id, p])), [productos]);

  const cargarProducciones = async () => setProducciones(await getProducciones());

  useEffect(() => {
    getProducciones().then(setProducciones).catch(() => setProducciones([]));
    getProductos().then(setProductos).catch(() => setProductos([]));
    if (puedePlanificar) getVentas().then((v) => setVentas([...v].sort((a, b) => b.id - a.id))).catch(() => setVentas([]));
  }, [puedePlanificar]);

  const startEdit = (produccionId: number, itemId: number, currentCantidad: number) => {
    setEditingKey(`${produccionId}-${itemId}`);
    setCantidadInput(String(currentCantidad));
  };

  const saveEdit = async (produccionId: number, itemId: number) => {
    const nuevaCantidad = Number(cantidadInput);
    if (!nuevaCantidad || nuevaCantidad <= 0) return;
    await editarCantidadProduccion(produccionId, itemId, nuevaCantidad);
    setEditingKey(null);
    setCantidadInput("");
    await cargarProducciones();
  };

  const marcarRealizado = async (produccionId: number, itemId: number) => {
    setError("");
    try {
      await realizarItemProduccion(produccionId, itemId);
      await cargarProducciones();
      getProductos().then(setProductos).catch(() => undefined);
    } catch (err) {
      setError(mensajeError(err, "No se pudo marcar como realizado"));
    }
  };

  const lineasValidas = lineas.filter((l) => l.producto_id && Number(l.cantidad) > 0);

  const generarOrden = async () => {
    setError("");
    setMensaje("");
    try {
      const orden = await crearOrdenProduccion({
        venta_id: ventaId ? Number(ventaId) : null,
        nota: nota.trim() || null,
        items: lineasValidas.map((l) => ({ producto_id: Number(l.producto_id), cantidad: Number(l.cantidad) })),
      });
      setMensaje(`Orden de producción #${orden.id} generada`);
      setFormAbierto(false);
      setVentaId("");
      setNota("");
      setLineas([lineaVacia()]);
      await cargarProducciones();
    } catch (err) {
      setError(mensajeError(err, "No se pudo generar la orden"));
    }
  };

  const visibles = producciones.filter((p) => verCompletadas || p.estado !== "COMPLETADA");
  const activos = productos.filter((p) => p.activo);

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Producción</h1>
          <p className="page-subtitle">
            Órdenes para completar ventas sin stock o para reponer inventario. Al marcar un ítem como realizado, lo producido se suma al stock.
          </p>
        </div>
        {puedePlanificar && !formAbierto && (
          <button className="btn btn-primary" onClick={() => { setFormAbierto(true); setMensaje(""); }}>Nueva orden de producción</button>
        )}
      </header>

      {formAbierto && (
        <div className="panel" style={{ marginBottom: "1rem" }}>
          <h3>Nueva orden de producción</h3>
          <div className="form-grid">
            <label>Venta asociada (opcional)
              <select className="select" value={ventaId} onChange={(e) => setVentaId(e.target.value)}>
                <option value="">Ninguna: reposición de stock</option>
                {ventas.map((v) => (
                  <option key={v.id} value={v.id}>Venta #{v.id} · {new Date(v.fecha_venta).toLocaleDateString("es-PE")} · S/ {Number(v.total).toFixed(2)}</option>
                ))}
              </select>
            </label>
            <label>Nota (opcional)
              <input className="input" maxLength={300} value={nota} placeholder="p. ej. reponer para campaña escolar" onChange={(e) => setNota(e.target.value)} />
            </label>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
            <thead><tr style={{ textAlign: "left" }}><th>Producto</th><th style={{ width: 140 }}>Cantidad</th><th style={{ width: 160 }}>Stock actual</th><th style={{ width: 90 }} /></tr></thead>
            <tbody>
              {lineas.map((l, n) => (
                <tr key={n}>
                  <td>
                    <select className="select" value={l.producto_id} onChange={(e) => setLineas((x) => x.map((y, i) => (i === n ? { ...y, producto_id: e.target.value } : y)))}>
                      <option value="">Elige un producto…</option>
                      {activos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </td>
                  <td>
                    <input className="input" type="number" min={1} value={l.cantidad}
                      onChange={(e) => setLineas((x) => x.map((y, i) => (i === n ? { ...y, cantidad: e.target.value } : y)))} />
                  </td>
                  <td className="muted">{l.producto_id ? nombreProducto[Number(l.producto_id)]?.stock ?? "—" : "—"}</td>
                  <td>{lineas.length > 1 && <button className="btn btn-secondary" onClick={() => setLineas((x) => x.filter((_, i) => i !== n))}>Quitar</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="btn-group" style={{ marginTop: "1rem" }}>
            <button className="btn btn-secondary" onClick={() => setLineas((x) => [...x, lineaVacia()])}>Agregar producto</button>
            <button className="btn btn-primary" disabled={lineasValidas.length === 0} onClick={generarOrden}>Generar orden</button>
            <button className="btn btn-secondary" onClick={() => setFormAbierto(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {mensaje && <p className="muted"><strong>{mensaje}</strong></p>}
      {error && <p className="error">{error}</p>}

      <label className="muted" style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center", marginBottom: "0.75rem" }}>
        <input type="checkbox" checked={verCompletadas} onChange={(e) => setVerCompletadas(e.target.checked)} />
        Mostrar órdenes completadas
      </label>

      <div className="grid-list">
        {visibles.length === 0 && <div className="panel">No hay órdenes de producción pendientes.</div>}

        {visibles.map((p) => (
          <article className="panel" key={p.id}>
            <div className="page-header" style={{ marginBottom: "0.75rem" }}>
              <div>
                <p className="row-title">Orden de producción #{p.id}</p>
                <p className="row-subtitle">
                  {p.venta_id ? `Para la venta #${p.venta_id}` : "Reposición de stock"} · creada el {new Date(p.fecha_creacion).toLocaleString("es-PE")}
                </p>
                {p.nota && <p className="row-subtitle">Nota: {p.nota}</p>}
              </div>
              <span className={p.estado === "COMPLETADA" ? "badge badge-ok" : "badge badge-warn"}>{p.estado === "COMPLETADA" ? "Completada" : "Pendiente"}</span>
            </div>

            <div className="grid-list">
              {p.items.map((item) => {
                const key = `${p.id}-${item.id}`;
                const isEditing = editingKey === key;
                const producto = nombreProducto[item.producto_id];

                return (
                  <div className="row-card" key={item.id}>
                    <div>
                      <p className="row-title">{producto?.nombre ?? `Producto #${item.producto_id}`}</p>
                      <p className="row-subtitle">
                        A producir: <strong>{item.cantidad_producir}</strong>
                        {item.cantidad_faltante > 0 && ` · faltaban ${item.cantidad_faltante} para la venta`}
                        {producto && ` · stock actual: ${producto.stock}`}
                      </p>
                    </div>

                    {item.realizado ? <span className="badge badge-ok">Realizado</span> : (
                      <div className="btn-group">
                        {isEditing ? (
                          <>
                            <input className="input" style={{ width: 110 }} type="number" min={1} value={cantidadInput}
                              onChange={(e) => setCantidadInput(e.target.value)} />
                            <button className="btn btn-primary" onClick={() => saveEdit(p.id, item.id)}>Guardar</button>
                            <button className="btn btn-secondary" onClick={() => setEditingKey(null)}>Cancelar</button>
                          </>
                        ) : (
                          <>
                            {puedePlanificar && (
                              <button className="btn btn-secondary" onClick={() => startEdit(p.id, item.id, item.cantidad_producir)}>Editar cantidad</button>
                            )}
                            {puedeEjecutar && <button className="btn btn-primary" onClick={() => marcarRealizado(p.id, item.id)}>Marcar realizado</button>}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default ProduccionPage;

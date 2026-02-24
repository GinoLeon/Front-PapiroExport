import { useEffect, useState } from "react";

import { useAuth } from "../context/AuthContext";
import { actualizarProducto, crearProducto, eliminarProducto, getProductos } from "../service/productoService";
import type { Producto } from "../types/producto";

const Productos = () => {
  const { hasRole } = useAuth();
  const canDelete = hasRole("admin");

  const [productos, setProductos] = useState<Producto[]>([]);
  const [nombre, setNombre] = useState("");
  const [precioInput, setPrecioInput] = useState("");
  const [stockInput, setStockInput] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const cargarProductos = async () => {
    const data = await getProductos();
    setProductos(data.filter((p) => p.activo));
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  const limpiarFormulario = () => {
    setEditingId(null);
    setNombre("");
    setPrecioInput("");
    setStockInput("");
  };

  const guardarProducto = async () => {
    if (!nombre.trim()) return;

    const precio = precioInput === "" ? 0 : Number(precioInput);
    const stock = stockInput === "" ? 0 : Number(stockInput);

    if (editingId === null) {
      await crearProducto({ nombre, precio, stock });
    } else {
      await actualizarProducto(editingId, { nombre, precio, stock });
    }

    limpiarFormulario();
    await cargarProductos();
  };

  const editarProducto = (producto: Producto) => {
    setNombre(producto.nombre);
    setPrecioInput(String(producto.precio));
    setStockInput(String(producto.stock));
    setEditingId(producto.id);
  };

  const borrarProducto = async (id: number) => {
    await eliminarProducto(id);
    await cargarProductos();
  };

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Productos</h1>
          <p className="page-subtitle">Define nombre, precio y stock de cada producto.</p>
        </div>
      </header>

      <div className="panel" style={{ marginBottom: "1rem" }}>
        <div className="form-grid">
          <div>
            <label className="muted">Nombre</label>
            <input className="input" placeholder="Ej. Papel Bond A4" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>

          <div>
            <label className="muted">Precio</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              placeholder="Ej. 15.90"
              value={precioInput}
              onChange={(e) => setPrecioInput(e.target.value)}
            />
          </div>

          <div>
            <label className="muted">Stock</label>
            <input
              className="input"
              type="number"
              min="0"
              placeholder="Ej. 25"
              value={stockInput}
              onChange={(e) => setStockInput(e.target.value)}
            />
          </div>
        </div>

        <div className="btn-group">
          <button className="btn btn-primary" onClick={guardarProducto}>{editingId === null ? "Crear producto" : "Actualizar"}</button>
          {editingId !== null && <button className="btn btn-secondary" onClick={limpiarFormulario}>Cancelar</button>}
        </div>
      </div>

      <div className="grid-list">
        {productos.map((producto) => (
          <article className="row-card" key={producto.id}>
            <div>
              <p className="row-title">{producto.nombre}</p>
              <p className="row-subtitle">S/ {Number(producto.precio).toFixed(2)} | Stock: {producto.stock}</p>
            </div>
            <div className="btn-group">
              <button className="btn btn-secondary" onClick={() => editarProducto(producto)}>Editar</button>
              {canDelete && <button className="btn btn-danger" onClick={() => borrarProducto(producto.id)}>Eliminar</button>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default Productos;


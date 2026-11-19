import { useEffect, useRef, useState } from "react";

import { useAuth } from "../context/AuthContext";
import {
  actualizarProducto, crearProducto, descargarPlantilla, eliminarProducto, getProductos, importarProductos, vaciarCatalogo,
} from "../service/productoService";
import type { Producto } from "../types/producto";

const Productos = () => {
  const { hasRole } = useAuth();
  const canDelete = hasRole("admin", "jefe");

  const [productos, setProductos] = useState<Producto[]>([]);
  const [nombre, setNombre] = useState("");
  const [precioInput, setPrecioInput] = useState("");
  const [stockInput, setStockInput] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [errores, setErrores] = useState<string[]>([]);
  const [importando, setImportando] = useState(false);
  const archivoRef = useRef<HTMLInputElement>(null);

  const cargarProductos = async () => {
    const data = await getProductos();
    setProductos(data.filter((p) => p.activo));
  };

  useEffect(() => {
    getProductos().then((data) => setProductos(data.filter((p) => p.activo))).catch(() => setProductos([]));
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

  const borrarProducto = async (id: number, nombre?: string) => {
    // Baja lógica: deja de listarse, pero las ventas pasadas lo conservan.
    if (!window.confirm(`¿Eliminar el producto "${nombre ?? id}"? Ya no aparecerá en la lista; sus ventas anteriores se conservan.`)) return;
    await eliminarProducto(id);
    await cargarProductos();
  };

  const importar = async (archivo: File | undefined) => {
    if (!archivo) return;
    setImportando(true); setMensaje(""); setErrores([]);
    try {
      const r = await importarProductos(archivo);
      setMensaje(`Importación lista: ${r.creados} nuevos, ${r.actualizados} actualizados, ${r.otros_nombres} otros nombres.`);
      setErrores(r.errores);
      await cargarProductos();
    } catch (e: unknown) {
      const detalle = (e as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setMensaje(detalle ?? "No se pudo importar el Excel.");
    } finally {
      setImportando(false);
      if (archivoRef.current) archivoRef.current.value = "";
    }
  };

  const vaciar = async () => {
    if (!window.confirm("¿Quitar TODOS los productos del catálogo? Las ventas anteriores los conservan, pero dejarán de listarse.")) return;
    const r = await vaciarCatalogo();
    setMensaje(`Se quitaron ${r.desactivados} productos.`); setErrores([]);
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

      {canDelete && (
        <div className="panel" style={{ marginBottom: "1rem" }}>
          <h3>Importar catálogo desde Excel</h3>
          <p className="row-subtitle" style={{ marginBottom: 12 }}>
            Descarga la plantilla, llena una fila por producto (nombre, precio con IGV, stock) y en <strong>Otros nombres</strong> escribe
            cómo aparece en tus facturas, separado por “;”. Así el sistema reconoce los ítems al digitalizar.
          </p>
          <div className="btn-group">
            <button className="btn btn-secondary" onClick={() => descargarPlantilla()}>Descargar plantilla</button>
            <button className="btn btn-primary" disabled={importando} onClick={() => archivoRef.current?.click()}>
              {importando ? "Importando…" : "Subir Excel"}
            </button>
            {productos.length > 0 && <button className="btn btn-danger" onClick={vaciar}>Vaciar catálogo</button>}
            <input ref={archivoRef} type="file" hidden accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                   onChange={(e) => importar(e.target.files?.[0])} />
          </div>
          {mensaje && <p className="muted" style={{ marginTop: 12 }}><strong>{mensaje}</strong></p>}
          {errores.length > 0 && <ul className="error">{errores.map((e) => <li key={e}>{e}</li>)}</ul>}
        </div>
      )}

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

      {productos.length === 0 && <p className="muted">Aún no hay productos. Créalos arriba o importa tu Excel.</p>}
      <div className="grid-list">
        {productos.map((producto) => (
          <article className="row-card" key={producto.id}>
            <div>
              <p className="row-title">{producto.nombre}</p>
              <p className="row-subtitle">S/ {Number(producto.precio).toFixed(2)} | Stock: {producto.stock}</p>
            </div>
            <div className="btn-group">
              <button className="btn btn-secondary" onClick={() => editarProducto(producto)}>Editar</button>
              {canDelete && <button className="btn btn-danger" onClick={() => borrarProducto(producto.id, producto.nombre)}>Eliminar</button>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default Productos;


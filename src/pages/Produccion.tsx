import { useEffect, useState } from "react";

import { useAuth } from "../context/AuthContext";
import { editarCantidadProduccion, getProducciones, realizarItemProduccion } from "../service/produccionService";
import type { Produccion } from "../types/produccion";

const ProduccionPage = () => {
  const { hasRole } = useAuth();
  const canManage = hasRole("admin", "vendedor");

  const [producciones, setProducciones] = useState<Produccion[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [cantidadInput, setCantidadInput] = useState("");

  const cargarProducciones = async () => {
    const data = await getProducciones();
    setProducciones(data);
  };

  useEffect(() => {
    cargarProducciones();
  }, []);

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
    await realizarItemProduccion(produccionId, itemId);
    await cargarProducciones();
  };

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Lista de produccion</h1>
          <p className="page-subtitle">Productos faltantes para completar ventas con stock insuficiente.</p>
        </div>
      </header>

      <div className="grid-list">
        {producciones.length === 0 && <div className="panel">No hay pendientes de produccion.</div>}

        {producciones.map((p) => (
          <article className="panel" key={p.id}>
            <div className="page-header" style={{ marginBottom: "0.5rem" }}>
              <div>
                <p className="row-title">Produccion #{p.id}</p>
                <p className="row-subtitle">Venta #{p.venta_id} | Cliente #{p.cliente_id} | Usuario #{p.usuario_id}</p>
                <p className="row-subtitle">Creada: {new Date(p.fecha_creacion).toLocaleString()}</p>
              </div>
              <span className={p.estado === "COMPLETADA" ? "badge badge-ok" : "badge badge-warn"}>{p.estado}</span>
            </div>

            <div className="grid-list">
              {p.items.map((item) => {
                const key = `${p.id}-${item.id}`;
                const isEditing = editingKey === key;

                return (
                  <div className="row-card" key={item.id}>
                    <div>
                      <p className="row-title">Producto #{item.producto_id}</p>
                      <p className="row-subtitle">
                        Solicitado: {item.cantidad_solicitada} | Faltante: {item.cantidad_faltante}
                      </p>
                      <p className="row-subtitle">
                        A producir: {item.cantidad_producir} | Estado: {item.realizado ? "Realizado" : "Pendiente"}
                      </p>
                    </div>

                    {canManage && !item.realizado && (
                      <div className="btn-group">
                        {isEditing ? (
                          <>
                            <input
                              className="input"
                              style={{ width: 110 }}
                              type="number"
                              min={1}
                              value={cantidadInput}
                              onChange={(e) => setCantidadInput(e.target.value)}
                            />
                            <button className="btn btn-primary" onClick={() => saveEdit(p.id, item.id)}>Guardar</button>
                            <button className="btn btn-secondary" onClick={() => setEditingKey(null)}>Cancelar</button>
                          </>
                        ) : (
                          <>
                            <button className="btn btn-secondary" onClick={() => startEdit(p.id, item.id, item.cantidad_producir)}>
                              Editar
                            </button>
                            <button className="btn btn-primary" onClick={() => marcarRealizado(p.id, item.id)}>
                              Realizado
                            </button>
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

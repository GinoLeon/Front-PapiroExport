import { useEffect, useState } from "react";

import { useAuth } from "../context/AuthContext";
import { actualizarCliente, crearCliente, eliminarCliente, getClientes } from "../service/clienteService";
import type { Cliente } from "../types/cliente";

const Clientes = () => {
  const { hasRole } = useAuth();
  const canDelete = hasRole("admin");

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [nombre, setNombre] = useState("");
  const [ruc, setRuc] = useState("");
  const [dni, setDni] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);

  const cargarClientes = async () => {
    const data = await getClientes();
    setClientes(data.filter((c) => c.activo));
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  const limpiarFormulario = () => {
    setClienteEditando(null);
    setNombre("");
    setRuc("");
    setDni("");
    setTelefono("");
    setEmail("");
  };

  const guardarCliente = async () => {
    if (!nombre || !ruc) return;

    if (clienteEditando) {
      await actualizarCliente(clienteEditando.id, { nombre, ruc, dni, telefono, email });
    } else {
      await crearCliente({ nombre, ruc });
    }

    limpiarFormulario();
    await cargarClientes();
  };

  const editarCliente = (cliente: Cliente) => {
    setClienteEditando(cliente);
    setNombre(cliente.nombre);
    setRuc(cliente.ruc);
    setDni(cliente.dni ?? "");
    setTelefono(cliente.telefono ?? "");
    setEmail(cliente.email ?? "");
  };

  const borrarCliente = async (id: number) => {
    await eliminarCliente(id);
    await cargarClientes();
  };

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">Para crear cliente solo se pide nombre y RUC.</p>
        </div>
      </header>

      <div className="panel" style={{ marginBottom: "1rem" }}>
        <div className="form-grid">
          <div>
            <label className="muted">Nombre</label>
            <input className="input" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>

          <div>
            <label className="muted">RUC</label>
            <input className="input" placeholder="RUC (11 digitos)" value={ruc} onChange={(e) => setRuc(e.target.value)} maxLength={11} />
          </div>

          {clienteEditando && (
            <>
              <div>
                <label className="muted">DNI (opcional)</label>
                <input className="input" placeholder="DNI (8 digitos)" value={dni} onChange={(e) => setDni(e.target.value)} maxLength={8} />
              </div>

              <div>
                <label className="muted">Telefono (opcional)</label>
                <input className="input" placeholder="Telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
              </div>

              <div>
                <label className="muted">Email (opcional)</label>
                <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </>
          )}
        </div>

        <div className="btn-group">
          <button className="btn btn-primary" onClick={guardarCliente}>
            {clienteEditando ? "Actualizar" : "Crear cliente"}
          </button>
          {clienteEditando && <button className="btn btn-secondary" onClick={limpiarFormulario}>Cancelar</button>}
        </div>
      </div>

      <div className="grid-list">
        {clientes.map((cliente) => (
          <article className="row-card" key={cliente.id}>
            <div>
              <p className="row-title">{cliente.nombre}</p>
              <p className="row-subtitle">RUC: {cliente.ruc} | DNI: {cliente.dni || "-"} | Tel: {cliente.telefono || "-"} | Email: {cliente.email || "-"}</p>
            </div>
            <div className="btn-group">
              <button className="btn btn-secondary" onClick={() => editarCliente(cliente)}>Editar</button>
              {canDelete && <button className="btn btn-danger" onClick={() => borrarCliente(cliente.id)}>Eliminar</button>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default Clientes;

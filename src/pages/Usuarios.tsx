import { useCallback, useEffect, useState } from "react";
import axios from "axios";

import { ROLES, etiquetaRol, type RolNombre } from "../roles";
import { actualizarUsuario, crearUsuario, listarUsuarios, type UsuarioAdmin } from "../service/adminService";

const mensajeError = (err: unknown, porDefecto: string) =>
  (axios.isAxiosError(err) && typeof err.response?.data?.detail === "string" && err.response.data.detail) || porDefecto;

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [nuevo, setNuevo] = useState({ username: "", email: "", password: "", rol_nombre: "vendedor" });
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const cargar = useCallback(() => listarUsuarios().then(setUsuarios).catch((e) => setError(mensajeError(e, "No se pudo cargar la lista"))), []);
  useEffect(() => { cargar(); }, [cargar]);

  const accion = async (fn: () => Promise<unknown>, exito: string) => {
    setError("");
    setMensaje("");
    try {
      await fn();
      setMensaje(exito);
      await cargar();
    } catch (e) {
      setError(mensajeError(e, "No se pudo completar la acción"));
    }
  };

  const restablecer = (u: UsuarioAdmin) => {
    const password = window.prompt(`Nueva contraseña para ${u.username} (mínimo 8 caracteres)`);
    if (password) accion(() => actualizarUsuario(u.id, { password }), `Contraseña de ${u.username} actualizada`);
  };

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Usuarios</h1>
          <p className="page-subtitle">Crea cuentas para el jefe de empresa y el personal de logística, cambia roles, activa o desactiva cuentas y restablece contraseñas.</p>
        </div>
      </header>

      <div className="panel" style={{ marginBottom: "1rem" }}>
        <h3 style={{ marginTop: 0 }}>Nuevo usuario</h3>
        <div className="form-grid">
          <input className="input" placeholder="Usuario" value={nuevo.username} onChange={(e) => setNuevo({ ...nuevo, username: e.target.value })} />
          <input className="input" placeholder="Email (opcional)" value={nuevo.email} onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })} />
          <input className="input" type="password" placeholder="Contraseña (mín. 8)" value={nuevo.password} onChange={(e) => setNuevo({ ...nuevo, password: e.target.value })} />
          <select className="select" value={nuevo.rol_nombre} onChange={(e) => setNuevo({ ...nuevo, rol_nombre: e.target.value })}>
            {(Object.keys(ROLES) as RolNombre[]).map((r) => <option key={r} value={r}>{ROLES[r].etiqueta}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" style={{ marginTop: "0.75rem" }} disabled={nuevo.username.length < 3 || nuevo.password.length < 8}
          onClick={() => accion(() => crearUsuario({ ...nuevo, email: nuevo.email || undefined }), `Usuario ${nuevo.username} creado`)
            .then(() => setNuevo({ username: "", email: "", password: "", rol_nombre: "vendedor" }))}>
          Crear usuario
        </button>
        <p className="row-subtitle">{ROLES[nuevo.rol_nombre as RolNombre]?.descripcion}</p>
        {mensaje && <p className="muted">{mensaje}</p>}
        {error && <p className="error">{error}</p>}
      </div>

      <div className="grid-list">
        {usuarios.map((u) => (
          <article key={u.id} className="row-card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <p className="row-title" style={{ margin: 0 }}>{u.username} <span className={`badge ${u.activo ? "badge-ok" : "badge-warn"}`}>{u.activo ? "Activo" : "Inactivo"}</span></p>
                <p className="row-subtitle" style={{ margin: "0.25rem 0 0" }}>
                  {etiquetaRol(u.rol)} · {u.email || "sin email"} · {u.ventas} ventas · {u.comprobantes} facturas digitalizadas
                </p>
              </div>
              <div className="btn-group">
                <button className="btn btn-secondary" onClick={() => accion(() => actualizarUsuario(u.id, { activo: !u.activo }), `${u.username} ${u.activo ? "desactivado" : "activado"}`)}>
                  {u.activo ? "Desactivar" : "Activar"}
                </button>
                <select className="select" style={{ width: "auto" }} value={u.rol} aria-label={`Rol de ${u.username}`}
                  onChange={(e) => accion(() => actualizarUsuario(u.id, { rol: e.target.value }), `${u.username} ahora es ${etiquetaRol(e.target.value)}`)}>
                  {(Object.keys(ROLES) as RolNombre[]).map((r) => <option key={r} value={r}>{ROLES[r].etiqueta}</option>)}
                </select>
                <button className="btn btn-secondary" onClick={() => restablecer(u)}>Restablecer contraseña</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

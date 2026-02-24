import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const Login = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "login") {
        await login(username, password);
      } else {
        await register(nombre, email, password);
      }
      navigate("/ventas", { replace: true });
    } catch {
      setError(mode === "login" ? "Credenciales invalidas" : "No se pudo completar el registro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-banner">
          <h2 style={{ margin: 0 }}>{mode === "login" ? "Bienvenido" : "Crear cuenta"}</h2>
          <p style={{ margin: "0.2rem 0 0", opacity: 0.95 }}>
            {mode === "login"
              ? "Ingresa para gestionar ventas, clientes y productos."
              : "Registro rapido. El rol asignado por defecto sera vendedor."}
          </p>
        </div>

        <div className="login-body">
          <div className="btn-group" style={{ marginBottom: 12 }}>
            <button
              type="button"
              className={`btn ${mode === "login" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setMode("login")}
            >
              Iniciar sesion
            </button>
            <button
              type="button"
              className={`btn ${mode === "register" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setMode("register")}
            >
              Registrarse
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {mode === "login" ? (
              <div style={{ marginBottom: 12 }}>
                <label className="muted">Usuario o email</label>
                <input
                  className="input"
                  placeholder="admin1 o admin@correo.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label className="muted">Nombre</label>
                  <input
                    className="input"
                    placeholder="Ejemplo: JuanPerez"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label className="muted">Email</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="correo@dominio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <div style={{ marginBottom: 12 }}>
              <label className="muted">Password</label>
              <input
                className="input"
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            {error && <p className="error">{error}</p>}

            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Procesando..." : mode === "login" ? "Ingresar" : "Crear cuenta"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;

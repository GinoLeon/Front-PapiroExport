import { BrowserRouter as Router, Navigate, NavLink, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import Clientes from "./pages/Clientes";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Pagos from "./pages/Pagos";
import ProduccionPage from "./pages/Produccion";
import Productos from "./pages/Productos";
import Unauthorized from "./pages/Unauthorized";
import VentaLista from "./pages/VentaLista";
import Ventas from "./pages/Ventas";

const AppShell = () => {
  const { user, logout } = useAuth();
  const isAdmin = user?.rol.nombre === "admin";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1 className="brand-title">Papiro Export</h1>
        <p className="brand-subtitle">Panel comercial</p>

        <div className="user-chip">
          <div><strong>{user?.username}</strong></div>
          <div className="muted">Rol: {user?.rol.nombre}</div>
        </div>

        <ul className="nav-list">
          <li><NavLink to="/dashboard" className="nav-link">Dashboard</NavLink></li>
          <li><NavLink to="/ventas" className="nav-link">Ventas</NavLink></li>
          <li><NavLink to="/venta-lista" className="nav-link">Listado de ventas</NavLink></li>
          <li><NavLink to="/produccion" className="nav-link">Produccion</NavLink></li>
          <li><NavLink to="/clientes" className="nav-link">Clientes</NavLink></li>
          <li><NavLink to="/productos" className="nav-link">Productos</NavLink></li>
          {isAdmin && <li><NavLink to="/pagos" className="nav-link">Pagos</NavLink></li>}
        </ul>

        <div style={{ marginTop: "1rem" }}>
          <button className="btn btn-secondary" onClick={logout}>Cerrar sesion</button>
        </div>
      </aside>

      <main className="main-area">
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/ventas" element={<Ventas />} />
          <Route path="/venta-lista" element={<VentaLista />} />
          <Route path="/produccion" element={<ProduccionPage />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/productos" element={<Productos />} />
          <Route path="/pagos" element={isAdmin ? <Pagos /> : <Unauthorized />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route element={<ProtectedRoute allowedRoles={["admin", "vendedor"]} />}>
          <Route path="/*" element={<AppShell />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;

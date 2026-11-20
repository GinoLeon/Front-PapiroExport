import { BrowserRouter as Router, Navigate, NavLink, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import { etiquetaRol } from "./roles";
import { DigitalizacionProvider } from "./context/DigitalizacionContext";
import Clientes from "./pages/Clientes";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Pagos from "./pages/Pagos";
import ProduccionPage from "./pages/Produccion";
import Productos from "./pages/Productos";
import Unauthorized from "./pages/Unauthorized";
import VentaLista from "./pages/VentaLista";
import Ventas from "./pages/Ventas";
import DigitalizarComprobante from "./pages/DigitalizarComprobante";
import Usuarios from "./pages/Usuarios";
import Auditoria from "./pages/Auditoria";
import Estadisticas from "./pages/Estadisticas";

const AppShell = () => {
  const { user, logout } = useAuth();
  const rol = user?.rol.nombre;
  const esDesarrollador = rol === "admin";
  const esGestion = rol === "admin" || rol === "jefe";  // jefe de empresa y desarrollador
  const esLogistica = rol === "vendedor";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1 className="brand-title">Gestión de Ventas</h1>
        <p className="brand-subtitle">Panel comercial</p>

        <div className="user-chip">
          <div><strong>{user?.username}</strong></div>
          <div className="muted">{etiquetaRol(rol)}</div>
        </div>

        <ul className="nav-list">
          <li><NavLink to="/dashboard" className="nav-link">Dashboard</NavLink></li>
          <li><NavLink to="/ventas" className="nav-link">Ventas</NavLink></li>
          {esLogistica && <li><NavLink to="/digitalizar-comprobante" className="nav-link">Digitalizar comprobante</NavLink></li>}
          <li><NavLink to="/venta-lista" className="nav-link">Listado de ventas</NavLink></li>
          <li><NavLink to="/produccion" className="nav-link">Produccion</NavLink></li>
          <li><NavLink to="/clientes" className="nav-link">Clientes</NavLink></li>
          <li><NavLink to="/productos" className="nav-link">Productos</NavLink></li>
          {esGestion && <li><NavLink to="/pagos" className="nav-link">Pagos</NavLink></li>}
          {esGestion && <li><NavLink to="/estadisticas" className="nav-link">Estadísticas del sistema</NavLink></li>}
          {esGestion && <li><NavLink to="/auditoria" className="nav-link">Auditoría digitalización</NavLink></li>}
          {esDesarrollador && <li><NavLink to="/usuarios" className="nav-link">Usuarios</NavLink></li>}
        </ul>

        <div style={{ marginTop: "1rem" }}>
          <button className="btn btn-secondary" onClick={logout}>Cerrar sesion</button>
        </div>
      </aside>

      <main className="main-area">
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/ventas" element={<Ventas />} />
          <Route path="/digitalizar-comprobante" element={esLogistica ? <DigitalizarComprobante /> : <Unauthorized />} />
          <Route path="/venta-lista" element={<VentaLista />} />
          <Route path="/produccion" element={<ProduccionPage />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/productos" element={<Productos />} />
          <Route path="/pagos" element={esGestion ? <Pagos /> : <Unauthorized />} />
          <Route path="/estadisticas" element={esGestion ? <Estadisticas /> : <Unauthorized />} />
          <Route path="/auditoria" element={esGestion ? <Auditoria /> : <Unauthorized />} />
          <Route path="/usuarios" element={esDesarrollador ? <Usuarios /> : <Unauthorized />} />
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
        <Route element={<ProtectedRoute allowedRoles={["admin", "jefe", "vendedor"]} />}>
          <Route path="/*" element={<DigitalizacionProvider><AppShell /></DigitalizacionProvider>} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;

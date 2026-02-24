const Unauthorized = () => {
  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Sin permisos</h1>
          <p className="page-subtitle">Tu rol no tiene acceso a esta seccion.</p>
        </div>
      </header>
      <div className="panel">
        <p className="muted">Si necesitas acceso, solicita permisos al administrador del sistema.</p>
      </div>
    </section>
  );
};

export default Unauthorized;

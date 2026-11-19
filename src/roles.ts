// Roles del sistema. Los nombres internos se mantienen ("admin", "vendedor") para no romper cuentas existentes.
export const ROLES = {
  admin: { etiqueta: "Desarrollador", descripcion: "Acceso completo: usuarios, auditoría y configuración" },
  jefe: { etiqueta: "Jefe de empresa", descripcion: "Ventas, producción, catálogo, pagos y reportes" },
  vendedor: { etiqueta: "Logística", descripcion: "Digitaliza facturas, registra ventas y ejecuta producción" },
} as const;

export type RolNombre = keyof typeof ROLES;

export const etiquetaRol = (rol?: string | null) => (rol && rol in ROLES ? ROLES[rol as RolNombre].etiqueta : rol ?? "");

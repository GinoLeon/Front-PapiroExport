import api from "../api/axios";

export type UsuarioAdmin = { id: number; username: string; email: string | null; rol: string; activo: boolean; ventas: number; comprobantes: number };

export type ComprobanteAdmin = {
  id: number; creado_en: string; vendedor: string; estado: string; serie: string | null; cliente: string | null; total: string | null;
  items: number; venta_id: number | null; tiempo_procesamiento_ms: number | null; tipo: string; fallas: number;
};

export type CoberturaAdmin = {
  objetivo: number;
  campos: { campo: string; revisados: number; fallas: number; cobertura: number | null }[];
  productos: { correcciones: number };
  fallas_recientes: { comprobante_id: number; campo: string; candidatos: string[]; valor_real: string; creado_en: string; serie: string | null }[];
};

export const listarUsuarios = async () => (await api.get<UsuarioAdmin[]>("/api/admin/usuarios")).data;

export const actualizarUsuario = async (id: number, cambios: { activo?: boolean; rol?: string; password?: string }) =>
  (await api.patch<UsuarioAdmin>(`/api/admin/usuarios/${id}`, cambios)).data;

export const crearUsuario = async (datos: { username: string; email?: string; password: string; rol_nombre: string }) =>
  (await api.post("/auth/users", datos)).data;

export const listarComprobantes = async (estado?: string) =>
  (await api.get<ComprobanteAdmin[]>("/api/admin/comprobantes", { params: estado ? { estado } : {} })).data;

export const coberturaPorCampo = async () => (await api.get<CoberturaAdmin>("/api/admin/cobertura")).data;

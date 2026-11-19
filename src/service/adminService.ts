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

export type ResumenUso = {
  facturas: number; campos: number; exactitud: number | null; revision: number | null; cobertura: number | null;
  automaticas: number | null; latencia_p95_s: number | null;
};

export type EstadisticasAdmin = {
  en_uso: { total: ResumenUso; pdf: ResumenUso; foto: ResumenUso; pendientes: number };
  por_campo: { campo: string; exactitud: number | null; revision: number | null; cobertura: number | null; n: number; paper_pdf: number; paper_foto: number }[];
  progreso: { n: number; fecha: string; exactitud: number | null; revision: number | null }[];
  paper: {
    criterios: { id: string; criterio: string; umbral: string; paper: string; estado: string }[];
    referencia: {
      facturas: { pdf: number; foto: number }; exactitud_media: { pdf: number; foto: number }; revision: { pdf: number; foto: number };
      cobertura: number; latencia_p95_s: number; cer: { sistema: number; tesseract: number };
    };
    pronostico_m4: { serie: string; meses: number; series: number; mase_mediana: Record<string, number>; vr_gana: number }[];
  };
};

export const estadisticasPipeline = async () => (await api.get<EstadisticasAdmin>("/api/admin/estadisticas")).data;

export type DatosPiloto = {
  tiempo_manual_s?: number | null; campos_digitados_manual: number; errores_manual: string[]; errores_sistema: string[]; tiempo_sistema_s?: number | null;
};

export type TablaV = {
  meta: number; facturas: number; facturas_tiempo: number; auditadas: number; tiempo_manual_facturas: number;
  tiempo_manual_lotes: { facturas: number; minutos: number }[];
  campos: number; error_manual: number | null; error_sistema: number | null; p_error: number | null;
  solo_manual: number; solo_sistema: number; tiempo_manual_min: number | null; tiempo_sistema_min: number | null; p_tiempo: number | null;
  digitados_manual: number | null; digitados_sistema: number | null;
};

export type FilaPiloto = {
  comprobante_id: number; serie: string | null; cliente: string | null; total: string | null; creado_en: string; estado: string; items: number;
  tiempo_sistema_s: number | null; campos_digitados_sistema: number; campos_digitados_manual_sugerido: number; piloto: DatosPiloto | null;
};

export type Piloto = { campos: string[]; tabla_v: TablaV; filas: FilaPiloto[] };

export const obtenerPiloto = async () => (await api.get<Piloto>("/api/admin/piloto")).data;
export const guardarPiloto = async (id: number, datos: DatosPiloto) => (await api.put(`/api/admin/piloto/${id}`, datos)).data;
export const borrarPiloto = async (id: number) => (await api.delete(`/api/admin/piloto/${id}`)).data;

export const eliminarComprobanteAdmin = async (id: number) => { await api.delete(`/api/admin/comprobantes/${id}`); };

import api from "../api/axios";
import type { CampoComprobante, Comprobante, EstadisticasComprobantes, ItemEntrada } from "../types/comprobante";

export const digitalizarComprobante = async (archivo: File, onUploadProgress?: (porcentaje: number) => void): Promise<Comprobante> => {
  const form = new FormData();
  form.append("imagen", archivo);
  const { data } = await api.post<Comprobante>("/api/comprobantes/digitalizar", form, {
    onUploadProgress: (e) => onUploadProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
  });
  return data;
};

export const resolverCampo = async (id: number, campo: CampoComprobante, valor: string, edicion_manual = false): Promise<Comprobante> =>
  (await api.patch<Comprobante>(`/api/comprobantes/${id}/resolver-campo`, { campo, valor, edicion_manual })).data;

export const resolverItems = async (id: number, items: ItemEntrada[]): Promise<Comprobante> =>
  (await api.put<Comprobante>(`/api/comprobantes/${id}/items`, { items })).data;

export const registrarVentaComprobante = async (id: number): Promise<Comprobante> =>
  (await api.post<Comprobante>(`/api/comprobantes/${id}/registrar-venta`)).data;

export const estadisticasComprobantes = async (): Promise<EstadisticasComprobantes> =>
  (await api.get<EstadisticasComprobantes>("/api/comprobantes/estadisticas/resumen")).data;

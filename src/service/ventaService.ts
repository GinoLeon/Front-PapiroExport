import api from "../api/axios";
import type { VentaCreate, VentaResponse, VentaUpdate } from "../types/venta";

export const crearVenta = async (data: VentaCreate): Promise<VentaResponse> => {
  const response = await api.post<VentaResponse>("/ventas/", data);
  return response.data;
};

export const getVentas = async (): Promise<VentaResponse[]> => {
  const response = await api.get<VentaResponse[]>("/ventas/");
  return response.data;
};

export const actualizarVenta = async (
  id: number,
  data: VentaUpdate
): Promise<VentaResponse> => {
  const response = await api.put<VentaResponse>(`/ventas/${id}`, data);
  return response.data;
};
import api from "../api/axios";
import type { Produccion, ProduccionItem } from "../types/produccion";

export const getProducciones = async (): Promise<Produccion[]> => {
  const response = await api.get<Produccion[]>("/producciones/");
  return response.data;
};

export const editarCantidadProduccion = async (
  produccionId: number,
  itemId: number,
  cantidadProducir: number
): Promise<ProduccionItem> => {
  const response = await api.put<ProduccionItem>(`/producciones/${produccionId}/items/${itemId}`, {
    cantidad_producir: cantidadProducir,
  });
  return response.data;
};

export const realizarItemProduccion = async (
  produccionId: number,
  itemId: number
): Promise<ProduccionItem> => {
  const response = await api.post<ProduccionItem>(`/producciones/${produccionId}/items/${itemId}/realizar`);
  return response.data;
};

import api from "../api/axios";
import type { Producto, ProductoCreate, ProductoUpdate } from "../types/producto";

export const getProductos = async (): Promise<Producto[]> => {
  const response = await api.get<Producto[]>("/producto/");
  return response.data;
};

export const crearProducto = async (data: ProductoCreate): Promise<Producto> => {
  const response = await api.post<Producto>("/producto/", data);
  return response.data;
};

export const actualizarProducto = async (
  id: number,
  data: ProductoUpdate
): Promise<Producto> => {
  const response = await api.put<Producto>(`/producto/${id}`, data);
  return response.data;
};

export const eliminarProducto = async (id: number): Promise<Producto> => {
  const response = await api.delete<Producto>(`/producto/${id}`);
  return response.data;
};
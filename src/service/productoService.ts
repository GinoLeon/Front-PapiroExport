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

export type ResultadoImportacion = { creados: number; actualizados: number; otros_nombres: number; errores: string[] };

export const descargarPlantilla = async (): Promise<void> => {
  const response = await api.get<Blob>("/producto/plantilla", { responseType: "blob" });
  const url = URL.createObjectURL(response.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = "plantilla_productos.xlsx";
  a.click();
  URL.revokeObjectURL(url);
};

export const importarProductos = async (archivo: File): Promise<ResultadoImportacion> => {
  const form = new FormData();
  form.append("archivo", archivo);
  const response = await api.post<ResultadoImportacion>("/producto/importar", form);
  return response.data;
};

export const vaciarCatalogo = async (): Promise<{ desactivados: number }> => {
  const response = await api.delete<{ desactivados: number }>("/producto/");
  return response.data;
};

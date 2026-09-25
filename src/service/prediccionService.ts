import api from "../api/axios";
import type { PrediccionClientes, PrediccionProductos, PrediccionVentas } from "../types/prediccion";

export const prediccionVentas = async (horizonte = 3): Promise<PrediccionVentas> =>
  (await api.get<PrediccionVentas>("/api/predicciones/ventas-mensuales", { params: { horizonte } })).data;

export const prediccionProductos = async (top = 10): Promise<PrediccionProductos> =>
  (await api.get<PrediccionProductos>("/api/predicciones/productos", { params: { top } })).data;

export const prediccionClientes = async (top = 10): Promise<PrediccionClientes> =>
  (await api.get<PrediccionClientes>("/api/predicciones/clientes", { params: { top } })).data;

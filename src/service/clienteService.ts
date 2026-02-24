import api from "../api/axios";
import type { Cliente, ClienteCreate, ClienteUpdate } from "../types/cliente";

export const getClientes = async (): Promise<Cliente[]> => {
  const response = await api.get<Cliente[]>("/cliente/");
  return response.data;
};

export const getClienteById = async (id: number): Promise<Cliente> => {
  const response = await api.get<Cliente>(`/cliente/${id}`);
  return response.data;
};

export const crearCliente = async (data: ClienteCreate): Promise<Cliente> => {
  const response = await api.post<Cliente>("/cliente/", data);
  return response.data;
};

export const actualizarCliente = async (id: number, data: ClienteUpdate): Promise<Cliente> => {
  const response = await api.put<Cliente>(`/cliente/${id}`, data);
  return response.data;
};

export const eliminarCliente = async (id: number): Promise<Cliente> => {
  const response = await api.delete<Cliente>(`/cliente/${id}`);
  return response.data;
};

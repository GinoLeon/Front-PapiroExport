export interface Cliente {
  id: number;
  nombre: string;
  ruc: string;
  dni?: string;
  telefono?: string;
  email?: string;
  activo: boolean;
}

export interface ClienteCreate {
  nombre: string;
  ruc: string;
}

export interface ClienteUpdate {
  nombre?: string;
  ruc?: string;
  dni?: string;
  telefono?: string;
  email?: string;
  activo?: boolean;
}

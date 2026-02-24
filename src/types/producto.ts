export interface Producto {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
  fecha_creacion: string;
  activo: boolean;
}

export interface ProductoCreate {
  nombre: string;
  precio: number;
  stock?: number;
}

export interface ProductoUpdate {
  nombre?: string;
  precio?: number;
  stock?: number;
  activo?: boolean;
}
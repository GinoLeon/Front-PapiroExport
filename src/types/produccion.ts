export interface ProduccionItem {
  id: number;
  producto_id: number;
  cantidad_solicitada: number;
  cantidad_faltante: number;
  cantidad_producir: number;
  realizado: boolean;
  fecha_realizado?: string | null;
}

export interface Produccion {
  id: number;
  venta_id: number;
  cliente_id: number;
  usuario_id: number;
  estado: string;
  fecha_creacion: string;
  items: ProduccionItem[];
}

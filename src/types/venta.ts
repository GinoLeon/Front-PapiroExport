// types/venta.ts
export interface DetalleVentaCreate {
  producto_id: number;
  cantidad: number;
}

export type MetodoPago = "Yape" | "Deposito" | "Debiendo";

export interface VentaCreate {
  cliente_id: number;
  detalles: DetalleVentaCreate[];
  metodo_pago: MetodoPago;  // <-- agregado
}

export interface VentaResponse {
  id: number;
  cliente_id: number;
  total: number;
  estado: string;
  fecha_venta: string;
  metodo_pago: string;
  fecha_pago: string;
  confirmado: boolean;
  detalles: DetalleVentaCreate[];
}
    
export interface VentaUpdate {
  metodo_pago?: MetodoPago;  // <-- agregado
  fecha_pago?: string;
  confirmado?: boolean;  // <-- agregado
}

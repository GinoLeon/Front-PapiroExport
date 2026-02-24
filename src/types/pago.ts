export interface Pago {
  id: number;
  venta_id: number;
  metodo_pago: string;
  monto: number;
  fecha_pago: string;
  confirmado: boolean;
}

export interface PagoCreate {
  venta_id: number;
  metodo_pago: string;
  monto: number;
}

export interface PagoUpdate {
  confirmado?: boolean;
}
export interface DetalleVenta {
  id: number;
  venta_id: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface DetalleVentaCreate {
  venta_id: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
}

export interface DetalleVentaUpdate {
  cantidad?: number;
  precio_unitario?: number;
}
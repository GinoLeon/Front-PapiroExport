export type CampoComprobante = "ruc" | "razon_social" | "ruc_cliente" | "cliente" | "fecha_emision" | "subtotal" | "igv" | "total";

export type CampoOCR = {
  valor: string | null;
  conjunto: string[];
  confianza: "alta" | "baja" | "confirmada" | string;
};

export type CandidatoProducto = { id: number; nombre: string; similitud: number };

export type ProductoItem = {
  id: number | null;
  nombre: string | null;
  nuevo: boolean;
  conjunto: CandidatoProducto[];
  confianza: "alta" | "baja" | "confirmada" | string;
};

export type ItemComprobante = {
  cantidad: string;
  unidad: string | null;
  descripcion: string;
  valor_unitario: string;
  importe: string;
  producto: ProductoItem;
};

export type ItemEntrada = {
  cantidad: string;
  descripcion: string;
  valor_unitario: string;
  producto_id: number | null;
  crear_producto: boolean;
};

export type ValidacionSunat = {
  valido: boolean;
  verificado_en_linea: boolean;
  estado: string | null;
  razon_social_sunat: string | null;
  detalle: string;
};

export type EstadoComprobante = "pendiente_revision" | "registrado_automaticamente" | "registrado_con_revision";

export type Comprobante = {
  id: number;
  estado: EstadoComprobante;
  ruc_validado: boolean;
  campos: Record<CampoComprobante, CampoOCR>;
  items: ItemComprobante[];
  validaciones: {
    subtotal_mas_igv_igual_total?: boolean;
    emisor_es_la_empresa?: boolean;
    items_suma_coincide?: boolean;
    items_suma?: string;
    sunat?: ValidacionSunat;
  };
  venta_id: number | null;
  puede_registrar: boolean;
  pendientes: string[];
  tiempo_procesamiento_ms: number | null;
  creado_en: string;
};

export type EstadisticasComprobantes = {
  automaticos: number;
  manuales: number;
  pendientes: number;
  campos_revisados: number;
  fallas_cobertura: number;
  cobertura_empirica: number | null;
  cobertura_objetivo: number;
};

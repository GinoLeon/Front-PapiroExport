export type EvaluacionPrediccion = {
  meses_evaluados: number;
  mae: Record<string, number | null>;
  supera_linea_base: boolean;
};

export type PrediccionVentas = {
  suficiente: boolean;
  advertencia: string | null;
  historico: { mes: string; total: number }[];
  pronostico: { mes: string; total: number; minimo: number; maximo: number }[];
  evaluacion: EvaluacionPrediccion | null;
  nivel_intervalo?: number;
};

export type PrediccionProductos = {
  suficiente: boolean;
  advertencia?: string;
  mes_objetivo?: string;
  evaluacion?: EvaluacionPrediccion;
  items: { producto_id: number; nombre: string; cantidad_esperada: number; unidades_ultimos_12_meses: number; meses_con_venta_12: number }[];
};

export type PrediccionClientes = {
  suficiente: boolean;
  advertencia?: string;
  mes_objetivo?: string;
  evaluacion?: EvaluacionPrediccion;
  items: { cliente_id: number; nombre: string; ruc: string | null; monto_esperado: number; meses_con_compra_12: number; productos_habituales: string[] }[];
};

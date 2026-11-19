import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

import { digitalizarComprobante } from "../service/comprobanteService";
import type { Comprobante } from "../types/comprobante";

/* El estado de la carga por carpeta vive aquí y no en la página: así seguir navegando por la app no corta el lote ni
   borra su avance. Las facturas ya procesadas además quedan en el servidor (lista de pendientes). */
export type EntradaLote = { archivo: File; estado: "en_cola" | "procesando" | "listo" | "error"; resultado?: Comprobante; error?: string };

type Ctx = {
  lote: EntradaLote[];
  procesandoLote: boolean;
  procesarLote: (facturas: File[], mensajeError: (err: unknown) => string) => Promise<void>;
  actualizarEnLote: (c: Comprobante) => void;
  quitarDelLote: (id: number) => void;
  limpiarLote: () => void;
};

const DigitalizacionContext = createContext<Ctx | null>(null);

export function DigitalizacionProvider({ children }: { children: ReactNode }) {
  const [lote, setLote] = useState<EntradaLote[]>([]);
  const [procesandoLote, setProcesandoLote] = useState(false);
  const enCurso = useRef(false);

  const procesarLote = useCallback(async (facturas: File[], mensajeError: (err: unknown) => string) => {
    if (enCurso.current) return;
    enCurso.current = true;
    setLote(facturas.map((archivo) => ({ archivo, estado: "en_cola" })));
    setProcesandoLote(true);
    for (const [n, f] of facturas.entries()) {  // de a una: el OCR corre en CPU y así no se satura el servidor
      setLote((l) => l.map((e, i) => (i === n ? { ...e, estado: "procesando" } : e)));
      try {
        const data = await digitalizarComprobante(f);
        setLote((l) => l.map((e, i) => (i === n ? { ...e, estado: "listo", resultado: data } : e)));
      } catch (err) {
        setLote((l) => l.map((e, i) => (i === n ? { ...e, estado: "error", error: mensajeError(err) } : e)));
      }
    }
    setProcesandoLote(false);
    enCurso.current = false;
  }, []);

  const actualizarEnLote = useCallback((c: Comprobante) =>
    setLote((l) => l.map((e) => (e.resultado?.id === c.id ? { ...e, resultado: c } : e))), []);
  const quitarDelLote = useCallback((id: number) => setLote((l) => l.filter((e) => e.resultado?.id !== id)), []);
  const limpiarLote = useCallback(() => { if (!enCurso.current) setLote([]); }, []);

  return (
    <DigitalizacionContext.Provider value={{ lote, procesandoLote, procesarLote, actualizarEnLote, quitarDelLote, limpiarLote }}>
      {children}
    </DigitalizacionContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- el hook acompaña a su proveedor
export function useDigitalizacion() {
  const ctx = useContext(DigitalizacionContext);
  if (!ctx) throw new Error("useDigitalizacion debe usarse dentro de DigitalizacionProvider");
  return ctx;
}

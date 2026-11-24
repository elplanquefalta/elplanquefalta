// PPR en bolsa + devolución del SAT — cálculo puro (sin DOM). Ejercicio 2026.
// Tarifa anual: art. 152 LISR, Anexo 8 de la RMF 2026 (DOF 28-dic-2025). UMA 2026: $117.31 diaria, $42,794.64 anual (INEGI).
// Deducción de aportaciones de retiro: art. 151, fracción V (menor entre 10% de los ingresos y 5 UMA anuales).
export const UMA_DIARIA = 117.31;
export const UMA_ANUAL = 42794.64;
export const TOPE_5UMA = 213973.2;
export const TARIFA = [
  [0.01, 0, 1.92], [10135.12, 194.59, 6.4], [86022.12, 5051.37, 10.88], [151176.2, 12140.13, 16],
  [175735.67, 16069.64, 17.92], [210403.7, 22282.14, 21.36], [424353.98, 67981.92, 23.52],
  [668840.15, 125485.07, 30], [1276925.99, 307910.81, 32], [1702567.98, 444116.23, 34], [5107703.93, 1601862.46, 35],
];
const renglon = (base) => { let t = TARIFA[0]; for (const x of TARIFA) if (base >= x[0]) t = x; return t; };
export function isr(base) { if (!(base > 0)) return 0; const t = renglon(base); return t[1] + ((base - t[0]) * t[2]) / 100; }
export function tasaMarginal(base) { return base > 0 ? renglon(base)[2] : 0; }
const n = (v) => (Number.isFinite(+v) && +v > 0 ? +v : 0);

/**
 * tipo: "sueldo" | "honorarios" | "resico"
 * ingresoMensual: sueldo bruto (o ingreso después de gastos si son honorarios)
 * extraAnual: aguinaldo y bonos
 */
export function calcular({ tipo = "sueldo", ingresoMensual, extraAnual = 0, aportacionMensual, edad, rendimiento = 10, inflacion = 4, reinvertir = true }) {
  const ingresoAnual = n(ingresoMensual) * 12 + n(extraAnual);
  const aportacionAnual = n(aportacionMensual) * 12;
  const tope = Math.min(ingresoAnual * 0.1, TOPE_5UMA);
  const deducible = tipo === "resico" ? 0 : Math.min(aportacionAnual, tope);
  const devolucion = tipo === "resico" ? 0 : Math.max(0, isr(ingresoAnual) - isr(ingresoAnual - deducible));
  const anios = Math.max(1, 65 - Math.min(64, Math.max(18, Math.round(n(edad) || 30))));
  const r = n(rendimiento) / 100, inf = n(inflacion) / 100;
  const rm = Math.pow(1 + r, 1 / 12) - 1;
  let saldoAport = 0, saldoDev = 0;
  for (let y = 0; y < anios; y++) {
    for (let m = 0; m < 12; m++) saldoAport = saldoAport * (1 + rm) + n(aportacionMensual);
    saldoDev = saldoDev * (1 + r) + (reinvertir ? devolucion : 0);
  }
  const total = saldoAport + saldoDev;
  return {
    ingresoAnual, aportacionAnual, tope, deducible, devolucion, anios, total,
    totalHoy: total / Math.pow(1 + inf, anios),
    puesto: aportacionAnual * anios,
    devolucionTotal: devolucion * anios,
    marginal: tasaMarginal(ingresoAnual),
    excedente: Math.max(0, aportacionAnual - tope),
    margen: Math.max(0, tope - aportacionAnual),
  };
}

// Devolución del SAT (asalariados) — cálculo puro (sin DOM). Ejercicio 2026.
// Tarifa anual: art. 152 LISR, Anexo 8 de la RMF 2026 (DOF 28-dic-2025). UMA 2026: $117.31 diaria, $42,794.64 anual (INEGI).
export const EJERCICIO = 2026;
export const UMA_DIARIA = 117.31;
export const UMA_ANUAL = 42794.64;
export const TOPE_5UMA = 213973.2;
export const TOPE_185 = 152000;
export const TOPE_LENTES = 2500;
// [límite inferior, cuota fija, % sobre el excedente]
export const TARIFA = [
  [0.01, 0, 1.92], [10135.12, 194.59, 6.4], [86022.12, 5051.37, 10.88], [151176.2, 12140.13, 16],
  [175735.67, 16069.64, 17.92], [210403.7, 22282.14, 21.36], [424353.98, 67981.92, 23.52],
  [668840.15, 125485.07, 30], [1276925.99, 307910.81, 32], [1702567.98, 444116.23, 34], [5107703.93, 1601862.46, 35],
];
export const COLEGIATURAS = { preescolar: 14200, primaria: 12900, secundaria: 19900, tecnico: 17100, bachillerato: 24500 };

const renglon = (base) => { let t = TARIFA[0]; for (const x of TARIFA) if (base >= x[0]) t = x; return t; };
export function isr(base) { if (!(base > 0)) return 0; const t = renglon(base); return t[1] + ((base - t[0]) * t[2]) / 100; }
export function tasaMarginal(base) { return base > 0 ? renglon(base)[2] : 0; }

/** Ingresos del año a partir del sueldo bruto mensual. El aguinaldo está exento hasta 30 UMA diarias. */
export function ingresos({ sueldoMensual, diasAguinaldo = 15 }) {
  const sueldo = sueldoMensual * 12;
  const aguinaldo = (sueldoMensual / 30) * diasAguinaldo;
  const exento = Math.min(aguinaldo, 30 * UMA_DIARIA);
  return { sueldo, aguinaldo, exento, total: sueldo + aguinaldo, acumulable: sueldo + aguinaldo - exento };
}

const n = (v) => (Number.isFinite(+v) && +v > 0 ? +v : 0);

/** d: montos pagados en el año. colegiaturas: [{nivel, monto}]. isrRetenido: opcional, de la constancia. */
export function calcular({ acumulable, exento = 0, isrRetenido = null, d = {} }) {
  acumulable = n(acumulable); exento = n(exento);
  const topeGlobal = Math.min(0.15 * (acumulable + exento), TOPE_5UMA);
  const lentes = Math.min(n(d.lentes), TOPE_LENTES);
  const funerarios = Math.min(n(d.funerarios), UMA_ANUAL);
  const donativos = Math.min(n(d.donativos), 0.07 * acumulable);
  const sujetas = n(d.medicos) + lentes + n(d.gmm) + n(d.hipoteca) + funerarios + n(d.transporte) + donativos;
  const conTope = Math.min(sujetas, topeGlobal);
  const colegiaturas = (d.colegiaturas ?? []).reduce((a, c) => a + Math.min(n(c.monto), COLEGIATURAS[c.nivel] ?? 0), 0);
  const topeRetiro = Math.min(0.1 * acumulable, TOPE_5UMA);
  const retiro = Math.min(n(d.retiro151), topeRetiro);
  const ahorro185 = Math.min(n(d.ahorro185), TOPE_185);
  const total = Math.min(conTope + colegiaturas + retiro + ahorro185, acumulable);
  const isrSin = isr(acumulable);
  const isrCon = isr(acumulable - total);
  const retenido = isrRetenido == null || isrRetenido === "" ? isrSin : n(isrRetenido);
  return {
    topeGlobal, sujetas, conTope, recorteGlobal: sujetas - conTope, colegiaturas, topeRetiro, retiro,
    recorteRetiro: n(d.retiro151) - retiro, ahorro185, recorte185: n(d.ahorro185) - ahorro185, total,
    base: acumulable - total, isrSin, isrCon, retenido, saldo: retenido - isrCon,
    ahorroPorDeducir: isrSin - isrCon, marginal: tasaMarginal(acumulable),
  };
}

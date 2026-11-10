import test from "node:test";
import assert from "node:assert/strict";
import { isr, ingresos, calcular, TOPE_5UMA, UMA_ANUAL } from "../public/herramientas/sat/calc.mjs";
import { calcular as libertad } from "../public/herramientas/libertad/calc.mjs";
import { PREGUNTAS, PERFILES, resultado } from "../public/herramientas/perfil/calc.mjs";

const cerca = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);

test("SAT: tarifa anual 2026, casos a mano", () => {
  assert.equal(isr(0), 0);
  cerca(isr(10000), 192);                 // 10,000 × 1.92%
  cerca(isr(100000), 5051.37 + (100000 - 86022.12) * 0.1088);
  cerca(isr(540000), 95181.86);           // 67,981.92 + 115,646.02 × 23.52%
  cerca(isr(6000000), 1601862.46 + (6000000 - 5107703.93) * 0.35);
});

test("SAT: cinco UMA anuales 2026", () => { cerca(UMA_ANUAL * 5, TOPE_5UMA); cerca(TOPE_5UMA, 213973.2); });

test("SAT: aguinaldo exento hasta 30 UMA diarias", () => {
  const g = ingresos({ sueldoMensual: 45000, diasAguinaldo: 15 });
  cerca(g.aguinaldo, 22500); cerca(g.exento, 3519.3); cerca(g.acumulable, 558980.7);
  const chico = ingresos({ sueldoMensual: 6000, diasAguinaldo: 15 });
  cerca(chico.exento, 3000);
});

test("SAT: $30,000 a un plan de retiro con sueldo de $45,000 regresa $7,056", () => {
  const g = ingresos({ sueldoMensual: 45000 });
  const r = calcular({ acumulable: g.acumulable, exento: g.exento, d: { retiro151: 30000 } });
  cerca(r.saldo, 7056); assert.equal(r.marginal, 23.52);
});

test("SAT: topes (general, lentes, funerarios, colegiaturas, retiro, art. 185)", () => {
  const g = ingresos({ sueldoMensual: 45000 });
  const r = calcular({ acumulable: g.acumulable, exento: g.exento, d: {
    medicos: 120000, lentes: 9000, funerarios: 90000, retiro151: 80000, ahorro185: 200000,
    colegiaturas: [{ nivel: "primaria", monto: 50000 }, { nivel: "bachillerato", monto: 10000 }, { nivel: "universidad", monto: 99999 }] } });
  cerca(r.topeGlobal, 84375);             // 15% de 562,500
  cerca(r.conTope, 84375);
  cerca(r.colegiaturas, 12900 + 10000);
  cerca(r.retiro, 55898.07);              // 10% de los ingresos acumulables
  cerca(r.ahorro185, 152000);
  cerca(r.saldo, r.isrSin - r.isrCon);
});

test("SAT: con ISR retenido capturado puede salir saldo a cargo", () => {
  const r = calcular({ acumulable: 400000, isrRetenido: 50000, d: {} });
  assert.ok(r.saldo < 0);
  assert.equal(calcular({ acumulable: 400000, d: {} }).saldo, 0);
});

test("SAT: las deducciones nunca dejan base negativa ni números inválidos", () => {
  const r = calcular({ acumulable: 50000, exento: 0, d: { ahorro185: 152000, retiro151: 90000, medicos: 1e6 } });
  assert.ok(r.base >= 0 && Number.isFinite(r.saldo));
  const v = calcular({ acumulable: "", d: { medicos: "abc" } });
  assert.equal(v.saldo, 0);
});

test("Libertad: número, inflación y aportaciones", () => {
  const r = libertad({ gasto: 25000, edad: 28, objetivo: 55 });
  cerca(r.numeroHoy, 7500000);
  cerca(r.numeroFuturo, 7500000 * Math.pow(1.04, 27), 1);
  assert.ok(r.aporteFijo > r.aporteCreciente && r.aporteCreciente > 0);
  // comprobación: aportando aporteFijo cada mes al 8% anual se llega al número futuro
  const rm = Math.pow(1.08, 1 / 12) - 1; let s = 0;
  for (let m = 0; m < 27 * 12; m++) s = s * (1 + rm) + r.aporteFijo;
  cerca(s, r.numeroFuturo, 5);
});

test("Libertad: el ahorro actual baja la aportación y puede cubrirlo todo", () => {
  const a = libertad({ gasto: 25000, edad: 28, objetivo: 55 });
  const b = libertad({ gasto: 25000, edad: 28, objetivo: 55, ahorro: 500000 });
  assert.ok(b.aporteCreciente < a.aporteCreciente && b.aporteFijo < a.aporteFijo);
  assert.ok(libertad({ gasto: 10000, edad: 30, objetivo: 60, ahorro: 5e6 }).cubierto);
  const cero = libertad({ gasto: 20000, edad: 40, objetivo: 60, inflacion: 5, rendimiento: 5 });
  assert.ok(Number.isFinite(cero.aporteCreciente) && cero.aporteCreciente > 0);
});

test("Perfil: ocho preguntas de cinco opciones y mezclas que suman 100", () => {
  assert.equal(PREGUNTAS.length, 8);
  PREGUNTAS.forEach((p) => assert.equal(p.o.length, 5));
  PERFILES.forEach((p) => assert.equal(p.mezcla.reduce((a, m) => a + m[1], 0), 100, p.nombre));
});

test("Perfil: rangos por puntos y límites por plazo y liquidez", () => {
  assert.equal(resultado(Array(8).fill(1)).perfil.id, "conservador");
  assert.equal(resultado(Array(8).fill(3)).perfil.id, "moderado");
  assert.equal(resultado([4, 4, 5, 4, 4, 4, 4, 4]).perfil.id, "agresivo");
  assert.equal(resultado(Array(8).fill(5)).perfil.id, "agresivo");
  const corto = resultado([5, 5, 1, 5, 5, 5, 5, 5]);
  assert.equal(corto.perfil.id, "conservador"); assert.ok(corto.limitado && corto.motivo);
  assert.equal(resultado([5, 5, 5, 5, 5, 5, 1, 5]).perfil.id, "moderado");
  assert.equal(resultado(Array(8).fill(1)).limitado, false);
});

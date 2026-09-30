// Pruebas del Termómetro del Crédito. Corren antes de cada deploy (npm run build).
// Valores esperados: sección 6 del CLAUDE.md del proyecto. Si una actualización de datos los cambia
// a propósito, se actualizan aquí en el mismo commit y se explica por qué.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { profile, rank } from "../public/tarjetas/calc.mjs";

const data = JSON.parse(fs.readFileSync(new URL("../public/tarjetas/data/cards.json", import.meta.url), "utf8"));
const byName = (res, n) => res.all.find((c) => c.n === n);

const BASE = { total: "si", inc: "2", share: "0.5", cats: ["super", "rest", "gas", "deliv", "online", "subs"], chain: "walmart", fee: "si" };

test("perfil por defecto: gasto con tarjeta de $10,000", () => {
  assert.equal(profile(BASE).T, 10000);
});

test("perfil por defecto: netos esperados", () => {
  const res = rank(data.cards, BASE);
  assert.equal(Math.round(byName(res, "HSBC 2Now").net), 2400);
  assert.equal(Math.round(byName(res, "Walmart INVEX").net), 2086);
  assert.equal(Math.round(byName(res, "Stori Black").net), 1800);
  assert.equal(Math.round(byName(res, "Santander LikeU").net), 1445);
  const rappi = byName(res, "RappiCard");
  assert.equal(Math.round(rappi.net), 750);
  assert.equal(rappi.lifeMonths, 14);
  const oro = byName(res, "BBVA Oro");
  assert.equal(Math.round(oro.net), -289);
  assert.equal(oro.tooHigh, true);
});

test("perfil por defecto: top 3 sólo con verificadas y aprobables", () => {
  const { top3 } = rank(data.cards, BASE);
  assert.equal(top3.length, 3);
  assert.equal(top3[0].n, "HSBC 2Now");
  for (const c of top3) {
    assert.ok(c.ok && c.v !== "est" && !c.sub, `${c.n} no debería estar en el top 3`);
  }
});

test("perfil alto: topes mensuales y de por vida", () => {
  const res = rank(data.cards, { ...BASE, inc: "4", share: "0.75" });
  assert.equal(res.P.T, 43100);
  assert.equal(Math.round(byName(res, "HSBC 2Now").net), 10200);
  assert.equal(Math.round(byName(res, "Santander LikeU").net), 6000);
  assert.equal(byName(res, "RappiCard").lifeMonths, 4);
});

test("'sólo sin costo' saca del top 3 las que cuestan o piden membresía", () => {
  const { top3 } = rank(data.cards, { ...BASE, fee: "no" });
  for (const c of top3) assert.ok(c.cost === 0 && !c.sub, c.n);
});

test("datos completos y con fuente", () => {
  assert.match(data.updated, /^\d{4}-\d{2}-\d{2}$/);
  const names = new Set();
  for (const c of data.cards) {
    assert.ok(c.n && c.i && typeof c.d === "number" && typeof c.cost === "number", `campos básicos: ${c.n}`);
    assert.ok(["ok", "warn", "est"].includes(c.v), `verificación: ${c.n}`);
    assert.ok(["oficial", "secundaria"].includes(c.source_type), `source_type: ${c.n}`);
    assert.match(c.verified_at, /^\d{4}-\d{2}-\d{2}$/, `verified_at: ${c.n}`);
    assert.ok(/^https:\/\//.test(c.url), `url: ${c.n}`);
    assert.ok(c.source_type === "oficial" || c.v === "est", `fuente secundaria debe marcarse como estimado: ${c.n}`);
    assert.ok(!names.has(c.n), `duplicada: ${c.n}`);
    names.add(c.n);
  }
});

test("ningún perfil produce números inválidos", () => {
  for (let inc = 0; inc < 6; inc++)
    for (const share of ["0.3", "0.5", "0.75"])
      for (const cats of [[], BASE.cats, ["super", "rest", "gas", "farm", "deliv", "movil", "online", "subs", "viajes"]])
        for (const chain of ["walmart", "sams", "costco", "soriana", "heb", "chedraui", "lacomer", "otro"]) {
          const res = rank(data.cards, { ...BASE, inc: String(inc), share, cats, chain });
          for (const c of res.all) assert.ok(Number.isFinite(c.net) && Number.isFinite(c.rew), `${c.n} inc=${inc} ${chain}`);
        }
});

test("formato de pesos redondea igual que el neto", async () => {
  const { fmt } = await import("../public/tarjetas/calc.mjs");
  assert.equal(fmt(-289.5), "−$289");
  assert.equal(fmt(2086.2), "$2,086");
});

test("súper en varias cadenas: el gasto se reparte entre ellas", async () => {
  const P = profile(BASE);
  const { calc } = await import("../public/tarjetas/calc.mjs");
  const invex = data.cards.find((c) => c.n === "Walmart INVEX");
  // Walmart y Sam's pagan igual (3.5%): elegir las dos no cambia nada
  assert.equal(calc(invex, P, ["walmart", "sams"]).net, calc(invex, P, "walmart").net);
  const costco = data.cards.find((c) => c.n === "Costco Banamex");
  const mix = calc(costco, P, ["costco", "walmart"]).rew;
  const solo = [calc(costco, P, "costco").rew, calc(costco, P, "walmart").rew];
  assert.ok(Math.abs(mix - (solo[0] + solo[1]) / 2) < 0.01, "promedio de las dos cadenas");
  assert.deepEqual(rank(data.cards, { ...BASE, chains: ["walmart"] }).top3.map((c) => c.n),
    rank(data.cards, BASE).top3.map((c) => c.n));
});

test("CAT como número para ordenar", async () => {
  const { catNum } = await import("../public/tarjetas/calc.mjs");
  assert.equal(catNum("91.6%"), 91.6);
  assert.equal(catNum("136.0% (vencido)"), 136);
  assert.equal(catNum("~75%"), 75);
  assert.equal(catNum("No publicado"), null);
  assert.equal(catNum("—"), null);
  for (const c of data.cards) assert.ok(catNum(c.cat) === null || catNum(c.cat) > 0, c.n);
});

test("beneficios: el top 3 sólo trae tarjetas con lo que busca, primero las que cumplen más", () => {
  const base = { i: "X", d: 1, cost: 0, inc: null, cat: "—", v: "ok", why: "", note: "", url: "https://x" };
  const cards = [
    { ...base, n: "Dinero", d: 3 },
    { ...base, n: "Cine", perks: [{ t: "cine", d: "2x1", v: "ok" }] },
    { ...base, n: "Cine y viajes", d: 0.5, perks: [{ t: "cine", d: "2x1", v: "ok" }, { t: "viajes", d: "VIP", v: "ok" }] },
    { ...base, n: "Cine de blog", d: 2, perks: [{ t: "cine", d: "2x1", v: "est" }] },
  ];
  const s = { ...BASE, perks: ["cash", "cine", "viajes"] };
  const res = rank(cards, s);
  assert.deepEqual(res.top3.map((c) => c.n), ["Cine y viajes", "Cine"]);
  assert.equal(res.perkMiss, false);
  // Sólo dinero: orden normal por neto
  assert.equal(rank(cards, { ...BASE, perks: ["cash"] }).top3[0].n, "Dinero");
  // Nadie tiene lo que pide: top normal y aviso
  const miss = rank(cards, { ...BASE, perks: ["proteccion"] });
  assert.equal(miss.perkMiss, true);
  assert.equal(miss.top3[0].n, "Dinero");
});

test("beneficios bien formados en los datos", () => {
  const T = ["cine", "viajes", "membresias", "proteccion"];
  for (const c of data.cards)
    for (const p of c.perks ?? []) {
      assert.ok(T.includes(p.t), `${c.n}: tipo ${p.t}`);
      assert.ok(p.d && p.d.length <= 90, `${c.n}: descripción`);
      assert.ok(["ok", "warn", "est"].includes(p.v), `${c.n}: verificación`);
      assert.ok(/^https:\/\//.test(p.url), `${c.n}: fuente`);
    }
});

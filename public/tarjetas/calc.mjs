// Termómetro del Crédito — cálculo puro (sin DOM). Lo usan la página y las pruebas (tests/tarjetas.test.mjs).

export const CL = {
  super: "súper", rest: "restaurantes", gas: "gasolina", farm: "farmacia", tel: "celular e internet",
  subs: "streaming", deliv: "apps de comida", movil: "Uber o DiDi", online: "compras en línea",
  viajes: "vuelos y hoteles", otros: "todo lo demás",
};
export const KEYS = Object.keys(CL);
// Peso típico de cada categoría dentro del gasto con tarjeta
export const W = { super: .26, rest: .12, gas: .12, farm: .04, tel: .05, subs: .02, deliv: .06, movil: .04, online: .10, viajes: .08, otros: .15 };
export const INC = [
  { min: 7000, mid: 7000, t: "menos de $10,000" },
  { min: 10000, mid: 12500, t: "$10,000 a $15,000" },
  { min: 15000, mid: 20000, t: "$15,000 a $25,000" },
  { min: 25000, mid: 32500, t: "$25,000 a $40,000" },
  { min: 40000, mid: 57500, t: "$40,000 a $75,000" },
  { min: 75000, mid: 100000, t: "más de $75,000" },
];

export const fmt = (n) => { const r = Math.round(n); return (r < 0 ? "−" : "") + "$" + Math.abs(r).toLocaleString("es-MX"); };

/** Perfil de gasto mensual a partir de las respuestas. state: {inc, share, cats:Set|Array} */
export function profile(state) {
  const cats = new Set(state.cats);
  const inc = INC[+state.inc];
  const T = Math.round((inc.mid * +state.share) / 100) * 100;
  const on = KEYS.filter((k) => k === "otros" || k === "tel" || cats.has(k));
  const sum = on.reduce((a, k) => a + W[k], 0);
  const s = {};
  KEYS.forEach((k) => (s[k] = on.includes(k) ? (T * W[k]) / sum : 0));
  return { s, T, inc, line: inc.mid * 1.5 };
}

/** Recompensa, costo y neto anual de una tarjeta para un perfil. El orden de los topes importa.
 *  chains: cadena(s) donde hace el súper; el gasto de súper se reparte en partes iguales entre ellas. */
export function calc(c, P, chains) {
  const { s, T, line } = P;
  const list = [].concat(chains).filter(Boolean);
  const supRate = c.sup && (list.length ? list : ["otro"]).reduce((a, ch, _, arr) => a + c.sup[ch] / arr.length, 0);
  const by = {};
  KEYS.forEach((k) => {
    const rate = k === "super" && c.sup ? supRate : c.r && c.r[k] != null ? c.r[k] : c.d;
    by[k] = (s[k] * rate) / 100;
    if (c.catCap && c.catCap[k] != null) by[k] = Math.min(by[k], c.catCap[k]);
  });
  if (c.six) {
    const best = c.six.reduce((a, k) => (s[k] > s[a] ? k : a), c.six[0]);
    by[best] += Math.min(s[best] * 0.06, c.sixCap ?? 1e9);
  }
  const raw = Object.values(by).reduce((a, b) => a + b, 0);
  let m = raw, capHit = "";
  if (c.lineSpend && T > line) { m *= line / T; capHit = "Topas los puntos a tu línea"; }
  if (c.linePct != null && m > (line * c.linePct) / 100) { m = (line * c.linePct) / 100; capHit = `Llegas al tope (${c.linePct}% de tu línea)`; }
  if (c.cap != null && m > c.cap) { m = c.cap; capHit = `Llegas al tope de ${fmt(c.cap)} al mes`; }
  let cost = c.cost, zero = false;
  if (c.min && T < c.min.amt) {
    if (c.min.zero) { m = 0; zero = true; }
    if (c.min.fee) cost += c.min.fee;
  }
  let rew = m * 12;
  if (c.gold) ["super", "rest", "farm"].forEach((k) => { if (s[k] * 3 >= 5000) rew += 4000; });
  if (c.capYear && rew > c.capYear) { rew = c.capYear; capHit = `Llegas al tope de ${fmt(c.capYear)} al año`; }
  let lifeMonths = null;
  if (c.capLife && m > 0) {
    lifeMonths = Math.ceil(c.capLife / m);
    rew = Math.min(m * 24, c.capLife) / 2; // promedio a 2 años para no inflar el año 1
    capHit = `Tope de ${fmt(c.capLife)} de por vida: lo alcanzas en ${lifeMonths} ${lifeMonths === 1 ? "mes" : "meses"} (neto promediado a 2 años)`;
  }
  if (zero) capHit = "No llegas al gasto mínimo";
  const tot = Object.values(s).reduce((a, b) => a + b, 0);
  const scale = raw ? rew / (raw * 12) : 0;
  const top = Object.entries(by)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k, v]) => `${CL[k]} (${fmt(v * 12 * scale)} al año)`);
  return { rew, cost, net: rew - cost, eff: tot ? (rew / (tot * 12)) * 100 : 0, capHit, top, lifeMonths };
}

/** Calcula todas las tarjetas, marca las aprobables y arma el top 3. state.chains: cadena o lista de cadenas. */
export function rank(cards, state) {
  const P = profile(state);
  const chains = [...new Set([].concat(state.chains ?? state.chain ?? []))];
  const all = cards.map((c) => {
    const r = calc(c, P, chains);
    const tooHigh = c.inc != null && c.inc > P.inc.min;
    const feeOut = state.fee === "no" && (c.cost > 0 || !!c.sub);
    return { ...c, ...r, ok: !tooHigh && !feeOut, tooHigh, feeOut };
  });
  const eligible = all.filter((c) => c.ok).sort((a, b) => b.net - a.net);
  const top3 = eligible.filter((c) => c.v !== "est" && !c.sub).slice(0, 3);
  const sorted = all.slice().sort((a, b) => b.ok - a.ok || b.net - a.net);
  let n = 0;
  sorted.forEach((c) => (c.rank = c.ok ? ++n : null));
  return { P, all: sorted, eligible, top3 };
}

/** CAT como número para ordenar ("91.6%" → 91.6). Sin dato ("—", "No publicado", "No aplica") → null. */
export const catNum = (cat) => {
  const m = /(\d+(?:\.\d+)?)\s*%/.exec(cat ?? "");
  return m ? +m[1] : null;
};

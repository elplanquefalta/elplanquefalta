// Comparador de tarjetas — interfaz. El cálculo vive en calc.mjs; los datos en data/cards.json.
import { CL, fmt, rank, catNum } from "/tarjetas/calc.mjs";

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
const norm = (t) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
// Vercel Web Analytics: los eventos personalizados sólo se registran en planes de pago; en Hobby no hacen nada.
const track = (name, data) => { try { window.va("event", { name, data }); } catch {} };

const VL = { ok: ["ok", "Oficial"], warn: ["warn", "Oficial con dudas"], est: ["est", "Estimado"] };
const LABELS = ["La que más te conviene", "Segunda opción", "Tercera opción"];
const PAGE = 12;

const state = { total: null, inc: null, share: null, cats: new Set(), catsTouched: false, chains: new Set(), fee: null };
const view = { sort: "net", filters: new Set() };
let DATA = null, showAll = false, completed = false, lastRes = null;

const answered = () => {
  const chainOk = state.cats.has("super") ? state.chains.size > 0 : state.catsTouched;
  return [state.total, state.inc, state.share, state.catsTouched, chainOk, state.fee].filter(Boolean).length;
};

const longDate = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

function renderProgress() {
  const n = answered();
  $("progress-txt").textContent = n === 6 ? "Listo: tu resultado está abajo" : `Contestaste ${n} de 6`;
  $("progress-bar").style.width = (n / 6) * 100 + "%";
  const off = !state.cats.has("super");
  $("q-chain").classList.toggle("off", off);
  $("q-chain").querySelectorAll(".chip").forEach((b) => (b.disabled = off));
  $("chain-h").textContent = off
    ? "Sólo aplica si marcaste súper."
    : "Marca todas donde compras. Algunas tarjetas pagan más en una cadena específica.";
  $("alert").innerHTML = state.total === "no"
    ? `<div class="alert"><b>Antes de buscar recompensas, liquida el saldo.</b><p>Con una tasa típica de 60% anual, $10,000 de saldo te cuestan alrededor de $580 al mes en intereses e IVA. Ninguna tarjeta de esta lista te regresa eso. Estas estimaciones sólo te convienen cuando pagas el total cada mes.</p></div>`
    : "";
  return n === 6;
}

function podium(res) {
  const { P, top3 } = res;
  const catsTxt = [...state.cats].map((k) => CL[k]).join(", ") || "sin categorías marcadas";
  const cards = top3.length
    ? top3.map((c, ix) => `<article class="pod ${ix === 0 ? "first" : ""}">
        <span class="k">${LABELS[ix]}</span><span class="n">${esc(c.n)}</span><span class="v">${fmt(c.net)} al año</span>
        <span class="pill ${VL[c.v][0]}">${VL[c.v][1]}</span>
        <ul><li>${esc(c.why)}.</li>${c.top.length ? `<li>Lo que más te paga: ${c.top.join(" y ")}.</li>` : ""}
        <li>${c.cost ? `Ya descontamos ${fmt(c.cost)} al año de costo.` : "No cuesta tenerla."}</li>
        ${c.capHit ? `<li><b>${esc(c.capHit)}.</b></li>` : ""}
        <li>${c.inc ? `Pide ingreso de ${fmt(c.inc)}` : "No publica ingreso mínimo"}. CAT ${esc(c.cat)}.</li></ul></article>`).join("")
    : "<p>Ninguna tarjeta verificada cumple con tus respuestas.</p>";
  return `<div class="stack">
    <p class="profile">Estimación según tus respuestas: ${fmt(P.T)} al mes en tarjeta (${esc(catsTxt)}). El top 3 sólo incluye tarjetas verificadas que piden un ingreso de ${fmt(P.inc.min)} o menos${state.fee === "no" ? " y no cuestan" : ""}.</p>
    <div class="podium">${cards}</div>
    <p class="disclaimer">Cálculo ilustrativo. Beneficios sujetos a términos de cada institución y a aprobación de crédito. CAT promedio sin IVA, para fines informativos y de comparación.</p></div>`;
}

function row(c, pos) {
  const tag = c.tooHigh ? `<br><span class="pill">Pide ${fmt(c.inc)}</span>` : c.feeOut ? `<br><span class="pill">Tiene costo</span>` : "";
  return `<tr class="${c.ok ? "" : "dim"}">
    <td class="rank">${pos}</td>
    <td class="card"><b>${esc(c.n)}</b><small><span class="rk">#${pos} · </span>${esc(c.i)}</small>${tag}</td>
    <td class="num" data-l="Regreso">${c.eff.toFixed(2)}%</td>
    <td class="num" data-l="Recompensa">${fmt(c.rew)}</td>
    <td class="num" data-l="Costo">${fmt(c.cost)}</td>
    <td class="net ${c.net < 0 ? "neg" : ""}" data-l="Neto al año">${fmt(c.net)}</td>
    <td class="num" data-l="Ingreso mín.">${c.inc ? fmt(c.inc) : "—"}</td>
    <td class="num" data-l="CAT">${esc(c.cat)}</td>
    <td class="ver"><span class="pill ${VL[c.v][0]}">${VL[c.v][1]}</span></td>
    <td class="note">${c.capHit ? `<span class="capflag">${esc(c.capHit)}.</span> ` : ""}${esc(c.note)} <a href="${esc(c.url)}" target="_blank" rel="noopener">Fuente</a></td></tr>`;
}

// Orden: las que la persona puede sacar van primero; dentro de cada grupo, el criterio elegido.
// Valores sin dato (CAT no publicado, ingreso no publicado) van al final.
const last = (v, dir) => (v == null ? Infinity : dir * v);
const SORTS = {
  net: (c) => -c.net,
  cat: (c) => last(catNum(c.cat), 1),
  eff: (c) => -c.eff,
  rew: (c) => -c.rew,
  cost: (c) => c.cost,
  inc: (c) => last(c.inc, 1),
};
const FILTERS = {
  ok: (c) => c.ok,
  free: (c) => c.cost === 0,
  official: (c) => c.v === "ok",
  open: (c) => !c.sub,
  nocap: (c) => !c.capHit,
};

function renderTable(res) {
  const q = norm($("q").value.trim());
  const key = SORTS[view.sort];
  let list = res.all.filter((c) => [...view.filters].every((f) => FILTERS[f](c)));
  if (q) list = list.filter((c) => norm(c.n + " " + c.i).includes(q));
  list = list.slice().sort((a, b) => b.ok - a.ok || key(a) - key(b) || b.net - a.net);
  const shown = q || showAll ? list : list.slice(0, PAGE);
  $("count").textContent = `${DATA.cards.length} tarjetas calculadas · ${res.eligible.length} disponibles para tu ingreso` +
    (view.filters.size || q ? ` · ${list.length} con tus filtros` : "");
  $("rows").innerHTML = shown.map((c, i) => row(c, i + 1)).join("");
  const rest = list.length - shown.length;
  $("more").hidden = rest <= 0;
  $("more").textContent = `Ver las ${rest} tarjetas restantes`;
  let nf = "";
  if (q) {
    const inv = DATA.inventory;
    const hits = [
      ...inv.nocalc.map((x) => [x.n, "no se puede calcular: " + x.why]),
      ...inv.store.map((x) => [x.n, x.why]),
      ...inv.norew.map((x) => [x.n, "no da recompensas"]),
      ...inv.disc.map((x) => [x.n, x.why]),
    ].filter(([n]) => norm(n).includes(q));
    if (hits.length) nf = hits.map(([a, b]) => `${a}: ${b}.`).join(" ");
    else if (!list.length) nf = view.filters.size ? "Ninguna tarjeta cumple con esos filtros." : "No encontramos esa tarjeta en el inventario de este mes.";
  } else if (!list.length) nf = "Ninguna tarjeta cumple con esos filtros.";
  $("notfound").textContent = nf;
}

function render() {
  const done = renderProgress();
  if (done) {
    lastRes = rank(DATA.cards, { ...state, cats: [...state.cats], chains: [...state.chains] });
    $("result-body").innerHTML = podium(lastRes);
  }
  // Si la persona desmarca algo después de ver su resultado, se conserva el último hasta que vuelva a completar.
  if (!lastRes) return;
  $("all").hidden = false;
  renderTable(lastRes);
  if (done && !completed) {
    completed = true;
    track("QuizComplete", { top1: lastRes.top3[0]?.n ?? "ninguna", total: state.total });
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    $("result").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    $("result").focus({ preventScroll: true });
  }
}

function toggleMulti(b, v, set, onEmpty) {
  const on = b.getAttribute("aria-pressed") !== "true";
  b.setAttribute("aria-pressed", String(on));
  on ? set.add(v) : set.delete(v);
  if (!set.size) onEmpty?.();
}

document.querySelectorAll(".chips").forEach((g) => {
  const q = g.dataset.q, single = g.hasAttribute("data-single");
  g.addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b || b.disabled) return;
    if (single) {
      g.querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true");
      state[q] = b.dataset.v;
    } else if (q === "chains") {
      toggleMulti(b, b.dataset.v, state.chains);
    } else {
      state.catsTouched = true;
      if (b.dataset.v === "none") {
        const on = b.getAttribute("aria-pressed") !== "true";
        state.cats.clear();
        g.querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-pressed", String(x === b && on)));
        if (!on) state.catsTouched = false;
      } else {
        g.querySelector('[data-v="none"]').setAttribute("aria-pressed", "false");
        toggleMulti(b, b.dataset.v, state.cats, () => (state.catsTouched = false));
      }
    }
    if (DATA) render();
  });
});
document.querySelector(".filters").addEventListener("click", (e) => {
  const b = e.target.closest(".chip");
  if (!b) return;
  toggleMulti(b, b.dataset.f, view.filters);
  lastRes && renderTable(lastRes);
});
$("sort").addEventListener("change", (e) => { view.sort = e.target.value; lastRes && renderTable(lastRes); });
$("q").addEventListener("input", () => lastRes && renderTable(lastRes));
$("more").addEventListener("click", () => { showAll = true; renderTable(lastRes); });
$("ig").addEventListener("click", () => track("InstagramClick"));

try {
  const r = await fetch("/tarjetas/data/cards.json");
  if (!r.ok) throw new Error(r.status);
  DATA = await r.json();
} catch {
  $("result-body").innerHTML = '<p class="placeholder error">No pudimos cargar los datos. Recarga la página en un momento.</p>';
}
if (DATA) {
  const d = longDate(DATA.updated);
  $("updated").textContent = `Datos verificados al ${d} · Se actualiza cada mes`;
  $("updated-foot").textContent = `Actualizado al ${d}`;
  const inv = DATA.inventory;
  $("nocalc").innerHTML = inv.nocalc.map((x) => `<li><b>${esc(x.n)}.</b> ${esc(x.why)}</li>`).join("");
  $("store").innerHTML = inv.store.map((x) => `<li><b>${esc(x.n)}:</b> ${esc(x.why)}</li>`).join("");
  $("norew").innerHTML = inv.norew.map((x) => `<li>${esc(x.n)}</li>`).join("");
  $("disc").innerHTML = inv.disc.map((x) => `<li><b>${esc(x.n)}:</b> ${esc(x.why)}</li>`).join("");
  render();
}

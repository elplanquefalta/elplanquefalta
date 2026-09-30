// Comparador de tarjetas — interfaz. El cálculo vive en calc.mjs; los datos en data/cards.json.
import { CL, fmt, rank, catNum, PERKS } from "/tarjetas/calc.mjs?v=20260929d";

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
const norm = (t) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
// Vercel Web Analytics: los eventos personalizados sólo se registran en planes de pago; en Hobby no hacen nada.
const track = (name, data) => { try { window.va("event", { name, data }); } catch {} };

const VL = { ok: ["ok", "Oficial"], warn: ["warn", "Oficial con dudas"], est: ["est", "Estimado"] };
const LABELS = ["La que más te conviene", "Segunda opción", "Tercera opción"];
const PAGE = 12;

const state = { total: null, perks: new Set(), inc: null, share: null, cats: new Set(), catsTouched: false, chains: new Set(), fee: null };
const view = { sort: "net", filters: new Set() };
let DATA = null, showAll = false, completed = false, lastRes = null;

const answered = () => {
  const chainOk = state.cats.has("super") ? state.chains.size > 0 : state.catsTouched;
  return [state.total, state.perks.size > 0, state.inc, state.share, state.catsTouched, chainOk, state.fee].filter(Boolean).length;
};

const longDate = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

function renderAlert() {
  $("alert").innerHTML = state.total === "no"
    ? `<div class="alert"><b>Antes de buscar recompensas, liquida el saldo.</b><p>Con una tasa típica de 60% anual, $10,000 de saldo te cuestan alrededor de $580 al mes en intereses e IVA. Ninguna tarjeta de esta lista te regresa eso. Estas estimaciones sólo te convienen cuando pagas el total cada mes.</p></div>`
    : "";
}

// Cuestionario de una pregunta a la vez. La del súper sólo aparece si marcaste súper.
const STEPS = ["total", "perks", "inc", "share", "cats", "chains", "fee"];
const SHORT = { total: "¿Pagas el total?", perks: "Buscas", inc: "Ingreso al mes", share: "Gasto con tarjeta", cats: "Pagas con tarjeta", chains: "Haces el súper en", fee: "¿Anualidad o membresía?" };
const MULTI = new Set(["perks", "cats", "chains"]);
const field = (k) => document.querySelector(`[data-q="${k}"]`).closest("fieldset");
const needed = (k) => k !== "chains" || state.cats.has("super");
const isAnswered = (k) => (k === "cats" ? state.catsTouched : k === "chains" || k === "perks" ? state[k].size > 0 : state[k] != null);
const seq = () => STEPS.filter(needed);
// Para el contador: la del súper cuenta hasta saber que no marcó súper, así no salta de "de 5" a "de 6"
const counted = () => STEPS.filter((k) => k !== "chains" || !state.catsTouched || state.cats.has("super"));
let step = "total", editing = false;

function showStep(k, focus = true) {
  step = k;
  STEPS.forEach((s) => (field(s).hidden = s !== k));
  $("summary").hidden = true;
  $("qnav").hidden = false;
  const list = counted(), pos = list.indexOf(k) + 1;
  $("progress-txt").textContent = editing ? "Cambiando una respuesta" : `${pos} de ${list.length}`;
  $("progress-bar").style.width = ((editing ? list.length : pos - 1) / list.length) * 100 + "%";
  $("prev").hidden = editing || pos === 1;
  // Opción única avanza sola; con varias opciones, o si deja saldo (para leer la alerta), se usa el botón
  const manual = MULTI.has(k) || (k === "total" && state.total === "no");
  $("next").hidden = !manual;
  $("next").textContent = editing ? "Listo" : "Siguiente";
  $("next").disabled = !isAnswered(k);
  if (focus) field(k).querySelector("legend").focus({ preventScroll: true });
}

function advance() {
  if (editing) return needed("chains") && !isAnswered("chains") ? showStep("chains") : finish();
  const list = seq(), nxt = list[list.indexOf(step) + 1];
  nxt ? showStep(nxt) : finish();
}

function chosen(k) {
  const on = [...field(k).querySelectorAll('.chip[aria-pressed="true"]')].map((b) => b.textContent);
  return on.join(", ") || "—";
}

function finish() {
  editing = false;
  STEPS.forEach((s) => (field(s).hidden = true));
  $("qnav").hidden = true;
  $("progress-txt").textContent = "Listo: tu resultado está abajo";
  $("progress-bar").style.width = "100%";
  $("summary").innerHTML = "<h2>Tus respuestas</h2>" + seq().map((k) =>
    `<div class="srow"><div><span>${SHORT[k]}</span><b>${esc(chosen(k))}</b></div><button type="button" data-edit="${k}">Cambiar</button></div>`).join("");
  $("summary").hidden = false;
  if (DATA) render();
}

// Beneficios verificados de una tarjeta; primero los que la persona busca
function perkList(c, wanted) {
  const ps = (c.perks ?? []).filter((p) => p.v !== "est");
  return ps.sort((a, b) => wanted.includes(b.t) - wanted.includes(a.t)).map((p) => p.d);
}

function podium(res) {
  const { P, top3, wanted, perkMiss } = res;
  const catsTxt = [...state.cats].map((k) => CL[k]).join(", ") || "sin categorías marcadas";
  const cards = top3.length
    ? top3.map((c, ix) => `<article class="pod ${ix === 0 ? "first" : ""}">
        <span class="k">${LABELS[ix]}</span><span class="n">${esc(c.n)}</span><span class="v">${fmt(c.net)} al año</span>
        <span class="pill ${VL[c.v][0]}">${VL[c.v][1]}</span>
        <ul><li>${esc(c.why)}.</li>${c.top.length ? `<li>Lo que más te paga: ${c.top.join(" y ")}.</li>` : ""}
        <li>${c.cost ? `Ya descontamos ${fmt(c.cost)} al año de costo.` : "No cuesta tenerla."}</li>
        ${c.capHit ? `<li><b>${esc(c.capHit)}.</b></li>` : ""}
        ${perkList(c, wanted).length ? `<li><span class="perkline">Incluye:</span> ${perkList(c, wanted).map(esc).join("; ")}.</li>` : ""}
        <li>${c.inc ? `Pide ingreso de ${fmt(c.inc)}` : "No publica ingreso mínimo"}. CAT ${esc(c.cat)}.</li></ul></article>`).join("")
    : "<p>Ninguna tarjeta verificada cumple con tus respuestas.</p>";
  return `<div class="stack">
    ${perkMiss ? `<p class="alert">Ninguna tarjeta verificada que te aprueben incluye ${wanted.map((t) => PERKS[t]).join(" o ")}. Te mostramos las que más dinero te regresan.</p>` : ""}
    <p class="profile">Estimación según tus respuestas: ${fmt(P.T)} al mes en tarjeta (${esc(catsTxt)}). El top 3 sólo incluye tarjetas verificadas que piden un ingreso de ${fmt(P.inc.min)} o menos${state.fee === "no" ? " y no cuestan" : ""}${wanted.length && !perkMiss ? ` e incluyen ${wanted.map((t) => PERKS[t]).join(", ")}; primero las que cumplen más` : ""}.</p>
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
    <td class="num c-cost" data-l="Costo">${fmt(c.cost)}</td>
    <td class="net ${c.net < 0 ? "neg" : ""}" data-l="Neto al año">${fmt(c.net)}</td>
    <td class="num" data-l="Ingreso mín.">${c.inc ? fmt(c.inc) : "—"}</td>
    <td class="num c-cat" data-l="CAT">${esc(c.cat)}</td>
    <td class="ver"><span class="pill ${VL[c.v][0]}">${VL[c.v][1]}</span></td>
    <td class="note">${c.capHit ? `<span class="capflag">${esc(c.capHit)}.</span> ` : ""}${esc(c.note)}${c.perks?.length ? ` <b>Beneficios:</b> ${c.perks.map((p) => esc(p.d) + (p.v === "est" ? " (estimado)" : "")).join("; ")}.` : ""} <a href="${esc(c.url)}" target="_blank" rel="noopener">Fuente</a></td>
    <td class="catc">${catNum(c.cat) == null ? "—" : catNum(c.cat) + "%"}</td></tr>`;
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
  perk: (c) => c.match > 0,
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
  const done = answered() === 7;
  if (done) {
    lastRes = rank(DATA.cards, { ...state, cats: [...state.cats], chains: [...state.chains], perks: [...state.perks] });
    $("result-body").innerHTML = podium(lastRes);
    $("f-perk").hidden = !lastRes.wanted.length;
    if (!lastRes.wanted.length) { view.filters.delete("perk"); $("f-perk").setAttribute("aria-pressed", "false"); }
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
      renderAlert();
      if (!(q === "total" && state.total === "no")) setTimeout(() => step === q && advance(), 220);
    } else if (q === "chains" || q === "perks") {
      toggleMulti(b, b.dataset.v, state[q]);
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
    $("next").disabled = !isAnswered(step);
    if (q === "total") showStep("total", false);
    if (DATA && editing) render();
  });
});
$("next").addEventListener("click", advance);
$("prev").addEventListener("click", () => { const list = seq(); showStep(list[list.indexOf(step) - 1]); });
$("summary").addEventListener("click", (e) => {
  const b = e.target.closest("[data-edit]");
  if (!b) return;
  editing = true;
  showStep(b.dataset.edit);
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

showStep("total", false);

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

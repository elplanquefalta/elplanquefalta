// Comparador de tarjetas — interfaz sencilla: tres datos, top 3 y "ver más". El cálculo vive en calc.mjs.
import { CL, INC, fmt, rank, catNum } from "/tarjetas/calc.mjs?v=20261110b";

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
const norm = (t) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const track = (name, data) => { try { window.va("event", { name, data }); } catch {} };

const CATS = [["super", "Súper"], ["rest", "Restaurantes"], ["gas", "Gasolina"], ["farm", "Farmacia"], ["deliv", "Apps de comida"], ["movil", "Uber o DiDi"], ["online", "Compras en línea"], ["subs", "Streaming"], ["viajes", "Vuelos y hoteles"]];
const CHAINS = [["walmart", "Walmart o Bodega"], ["sams", "Sam's"], ["costco", "Costco"], ["soriana", "Soriana"], ["heb", "HEB"], ["chedraui", "Chedraui"], ["lacomer", "La Comer"], ["otro", "Otro"]];
const SELLO = { ok: ["ok", "Dato oficial"], warn: ["", "Oficial con dudas"], est: ["est", "Estimado"] };
const PUESTO = ["La que más te conviene", "Segunda opción", "Tercera opción"];
const PAGINA = 9, CMP_MAX = 3;

const st = { cats: new Set(), chains: new Set(), gastoTocado: false };
const cmp = new Set();
let DATA = null, res = null, verMas = false, mostradas = PAGINA;

const longDate = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

function chips(id, items, set) {
  $(id).innerHTML = items.map(([v, t]) => `<button class="chip-h" type="button" data-v="${v}" aria-pressed="false">${esc(t)}</button>`).join("");
  $(id).addEventListener("click", (e) => {
    const b = e.target.closest(".chip-h"); if (!b) return;
    const on = b.getAttribute("aria-pressed") !== "true";
    b.setAttribute("aria-pressed", on); on ? set.add(b.dataset.v) : set.delete(b.dataset.v);
    calcula();
  });
}

function detalles(c) {
  const perks = (c.perks ?? []).map((p) => esc(p.d) + (p.v === "est" ? " (estimado)" : "")).join("; ");
  return `<details><summary>Ver detalles</summary>
    <p>${esc(c.note)}</p>
    ${perks ? `<p><b>Beneficios:</b> ${perks}.</p>` : ""}
    <p>CAT ${esc(c.cat)} · ${c.inc ? `Pide ingreso de ${fmt(c.inc)}` : "No publica ingreso mínimo"} · <a href="${esc(c.url)}" target="_blank" rel="noopener">Fuente</a></p></details>`;
}
const check = (c) => `<label class="check-h"><input type="checkbox" data-cmp="${esc(c.n)}"${cmp.has(c.n) ? " checked" : ""}${!cmp.has(c.n) && cmp.size >= CMP_MAX ? " disabled" : ""}> Comparar</label>`;
const sello = (c) => `<span class="sello ${SELLO[c.v][0]}">${SELLO[c.v][1]}</span>`;

function grande(c, i) {
  return `<article class="tj ${i === 0 ? "uno" : ""}">
    <span class="puesto">${PUESTO[i]}</span>
    <h3>${esc(c.n)}</h3><span class="banco">${esc(c.i)}</span>
    <div class="monto ${c.net < 0 ? "neg" : ""}">${fmt(c.net)}<small>te regresa al año, ya con costos descontados</small></div>
    <ul>
      <li>${esc(c.why)}.</li>
      ${c.top.length ? `<li>Lo que más te paga: ${c.top.join(" y ")}.</li>` : ""}
      <li>${c.cost ? `Cuesta ${fmt(c.cost)} al año.` : "No cuesta tenerla."}</li>
      ${c.capHit ? `<li>${esc(c.capHit)}.</li>` : ""}
    </ul>
    ${sello(c)}${detalles(c)}${check(c)}</article>`;
}
function mini(c) {
  const motivo = c.tooHigh ? `Pide ingreso de ${fmt(c.inc)}` : c.feeOut ? "Tiene costo" : "";
  return `<article class="tj mini ${c.ok ? "" : "gris"}">
    <h3>${esc(c.n)}</h3><span class="banco">${esc(c.i)}${motivo ? " · " + motivo : ""}</span>
    <div class="monto ${c.net < 0 ? "neg" : ""}">${fmt(c.net)}<small>al año</small></div>
    <span class="banco">${esc(c.why)}. ${c.cost ? `Cuesta ${fmt(c.cost)} al año.` : "Sin costo."}</span>
    ${sello(c)}${detalles(c)}${check(c)}</article>`;
}

function pintaComparar() {
  const list = res.all.filter((c) => cmp.has(c.n));
  $("comparar").hidden = list.length < 2;
  if (list.length < 2) { $("cmp").innerHTML = ""; return; }
  const mejor = (f, dir) => { const vs = list.map(f).filter((v) => v != null); return vs.length ? (dir > 0 ? Math.max(...vs) : Math.min(...vs)) : null; };
  const B = { net: mejor((c) => c.net, 1), rew: mejor((c) => c.rew, 1), cost: mejor((c) => c.cost, -1), cat: mejor((c) => catNum(c.cat), -1), inc: mejor((c) => c.inc, -1) };
  const g = (v, b) => (v != null && v === b ? ' class="gana"' : "");
  $("cmp").innerHTML = list.map((c) => `<article class="cmp-c ${c.net === B.net ? "mejor" : ""}">
    <h3>${esc(c.n)}</h3><span class="banco">${esc(c.i)}</span>
    <div class="monto">${fmt(c.net)}</div><span class="banco">te regresa al año</span>
    <dl>
      <dt>Recompensa al año</dt><dd${g(c.rew, B.rew)}>${fmt(c.rew)}</dd>
      <dt>Costo al año</dt><dd${g(c.cost, B.cost)}>${fmt(c.cost)}</dd>
      <dt>CAT</dt><dd${g(catNum(c.cat), B.cat)}>${esc(c.cat)}</dd>
      <dt>Ingreso que pide</dt><dd${g(c.inc, B.inc)}>${c.inc ? fmt(c.inc) : "No publicado"}</dd>
      <dt>¿Te la aprobarían?</dt><dd>${c.ok ? "Sí" : c.tooHigh ? "Pide más ingreso" : "Tiene costo"}</dd>
    </dl>
    <button class="btn-fantasma" type="button" data-quitar="${esc(c.n)}">Quitar</button></article>`).join("");
}

function pintaLista() {
  const q = norm($("q").value.trim());
  const enTop = new Set(res.top3.map((c) => c.n));
  let list = q ? res.all.filter((c) => norm(c.n + " " + c.i).includes(q)) : res.eligible.filter((c) => !enTop.has(c.n));
  $("cuenta").textContent = q ? `${list.length} coinciden` : `${list.length} tarjetas más que te aprobarían`;
  $("lista").innerHTML = list.slice(0, mostradas).map(mini).join("");
  $("nada").hidden = list.length > 0;
  $("otras").hidden = list.length <= mostradas;
}

function pinta() {
  if (!res) return;
  $("top").innerHTML = res.top3.length ? res.top3.map(grande).join("") : `<p class="res-pie">Ninguna tarjeta verificada cumple con tus datos. Prueba quitando "solo sin anualidad".</p>`;
  $("resumen").textContent = `Con ${fmt(res.P.T)} al mes en tarjeta · ${res.eligible.length} de ${DATA.cards.length} te aprobarían por ingreso`;
  $("mas").hidden = !verMas; $("caja-mas").hidden = verMas;
  if (verMas) pintaLista();
  pintaComparar();
}

function calcula() {
  if (!DATA) return;
  const inc = +$("inc").value, mid = INC[inc].mid;
  const gasto = Math.max(parseFloat($("gasto").value) || 0, 0);
  res = rank(DATA.cards, { inc, share: gasto / mid, cats: [...st.cats], chains: st.cats.has("super") ? [...st.chains] : [], fee: $("sincosto").checked ? "no" : "si", perks: ["cash"] });
  pinta();
}

$("inc").innerHTML = INC.map((x, i) => `<option value="${i}">${x.t[0].toUpperCase() + x.t.slice(1)}</option>`).join("");
$("inc").value = "2";
const sugerido = () => Math.round((INC[+$("inc").value].mid * 0.4) / 500) * 500;
$("gasto").value = sugerido();
chips("cats", CATS, st.cats);
chips("chains", CHAINS, st.chains);
$("inc").addEventListener("change", () => { if (!st.gastoTocado) $("gasto").value = sugerido(); calcula(); });
$("gasto").addEventListener("input", () => { st.gastoTocado = true; calcula(); });
$("sincosto").addEventListener("change", calcula);
$("ver-mas").addEventListener("click", () => { verMas = true; pinta(); track("TarjetasVerMas"); });
$("otras").addEventListener("click", () => { mostradas += PAGINA; pintaLista(); });
$("q").addEventListener("input", () => { mostradas = PAGINA; pintaLista(); });
document.addEventListener("change", (e) => {
  const n = e.target.dataset?.cmp; if (!n) return;
  if (e.target.checked) { if (cmp.size < CMP_MAX) cmp.add(n); } else cmp.delete(n);
  pinta();
  if (e.target.checked && cmp.size >= 2) { track("TarjetasComparar", { n: cmp.size }); $("comparar").scrollIntoView({ behavior: "smooth", block: "nearest" }); }
});
$("cmp").addEventListener("click", (e) => { const n = e.target.dataset?.quitar; if (n) { cmp.delete(n); pinta(); } });
$("cmp-limpiar").addEventListener("click", () => { cmp.clear(); pinta(); });

try {
  DATA = await (await fetch("/tarjetas/data/cards.json")).json();
  $("updated").textContent = `Datos verificados al ${longDate(DATA.updated)}.`;
  const inv = DATA.inventory;
  $("nocalc").innerHTML = inv.nocalc.map((x) => `<li><b>${esc(x.n)}.</b> ${esc(x.why)}</li>`).join("");
  $("store").innerHTML = inv.store.map((x) => `<li><b>${esc(x.n)}:</b> ${esc(x.why)}</li>`).join("");
  $("norew").innerHTML = inv.norew.map((x) => `<li>${esc(x.n)}</li>`).join("");
  $("disc").innerHTML = inv.disc.map((x) => `<li><b>${esc(x.n)}:</b> ${esc(x.why)}</li>`).join("");
  calcula();
} catch (err) {
  $("top").innerHTML = '<p class="res-pie">No pudimos cargar los datos. Recarga la página en un momento.</p>';
}

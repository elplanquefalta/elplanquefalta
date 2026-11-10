"""Arma las páginas nuevas de elplanquefalta.com dentro del repo (carpeta public/)."""
import html, json, re, shutil, sys
from pathlib import Path

REPO = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent
PUB = REPO / "public"
HERE = Path(__file__).parent
# Los argumentos 2 y 3 (JSON del correo y portada) ya no se usan: las ediciones salen de site/ediciones/ y assets/.

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap">')


def head(title, desc, path):
    return f"""<!DOCTYPE html>
<html lang="es-MX">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="https://elplanquefalta.com{path}">
<meta property="og:type" content="website">
<meta property="og:locale" content="es_MX">
<meta property="og:site_name" content="El Plan Que Falta">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="https://elplanquefalta.com{path}">
<meta name="theme-color" content="#1E2620">
{FONTS}
<link rel="stylesheet" href="/site.css?v=20261110m1">
<script>window.va = window.va || function () {{ (window.vaq = window.vaq || []).push(arguments); }};</script>
<script defer src="/_vercel/insights/script.js"></script>
</head>
<body>
"""


def nav(actual=""):
    def a(href, txt, key):
        cur = ' aria-current="page"' if key == actual else ""
        return f'<a href="{href}"{cur}>{txt}</a>'
    return f"""<header class="nav">
<div class="wrap">
<a class="marca" href="/">El Plan Que Falta</a>
<nav aria-label="Principal">
{a('/#ediciones', 'Ediciones', 'ediciones')}
{a('/herramientas/', 'Herramientas', 'herramientas')}
{a('/contacto/', 'Contacto', 'asesoria')}
</nav>
<a class="btn" href="/#suscribirme">Suscribirme</a>
</div>
</header>
"""


BREVO = "https://22703a60.sibforms.com/serve/MUIFAGGV8p2ufwIXhCqYjOsompEx08R_dU46BMnhp4TBatdFiEqK93yESB3HH9ava2uqmJqLantksJ274b7SVzwQE7TBKgp_HN900-WtFSrDPEysBqgEOar3rteTPCAChrtL9zuHeRGORtUOjSHWSQB65mjEkuks4vU0fzl46SelSP8YRU4xp7n9nuLeq6k74sytYsl9tZ3gUGbTqg=="


def form(idx):
    return f"""<form class="suscribir" data-suscribir method="POST" action="{BREVO}">
<label class="oculto" for="correo-{idx}">Tu correo electrónico</label>
<input id="correo-{idx}" type="email" name="EMAIL" required placeholder="Tu correo electrónico" autocomplete="email">
<input type="text" name="email_address_check" value="" tabindex="-1" autocomplete="off" aria-hidden="true" style="display:none">
<input type="hidden" name="locale" value="es">
<button class="btn btn-cuadro" type="submit">Suscribirme gratis</button>
</form>
<div class="aviso" role="status" data-aviso></div>
<p class="nota">Gratis. Te das de baja cuando quieras. Al suscribirte aceptas el <a href="/aviso-de-privacidad/">aviso de privacidad</a>.</p>"""


FORM_JS = """<script>
/* Suscripción: envía el correo al formulario de Brevo de la lista "Newsletter" sin salir de la página. */
document.querySelectorAll('[data-suscribir]').forEach(function (f) {
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var aviso = f.parentElement.querySelector('[data-aviso]');
    var boton = f.querySelector('button');
    var correo = f.querySelector('input[type=email]');
    function di(txt) { aviso.textContent = txt; aviso.classList.add('ver'); }
    function listo() { di('¡Listo! Ya estás en la lista. Nos leemos el martes.'); correo.value = ''; try { window.va('event', { name: 'Suscripcion' }); } catch (err) {} }
    function fin() { boton.disabled = false; boton.textContent = 'Suscribirme gratis'; }
    boton.disabled = true; boton.textContent = 'Enviando…';
    fetch(f.action + '?isAjax=1', { method: 'POST', body: new FormData(f) })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (j && j.success) listo(); else di('No pudimos registrar ese correo. Revisa que esté bien escrito e inténtalo de nuevo.'); })
      .catch(function () {
        var fd = new FormData(f); fd.append('html_type', 'simple');
        return fetch(f.action, { method: 'POST', mode: 'no-cors', body: fd }).then(listo)
          .catch(function () { di('No hay conexión. Inténtalo de nuevo en un momento.'); });
      })
      .then(fin);
  });
});
</script>
"""

FOOT = """<footer class="pie">
<div class="wrap">
<div class="cols">
<div class="col ancha">
<div class="marca">El Plan Que Falta</div>
<div>Chris Lamas · Asesora financiera certificada CNSF</div>
<div>chris@elplanquefalta.com</div>
</div>
<div class="col">
<div class="etiqueta">Explorar</div>
<a href="/#ediciones">Ediciones</a>
<a href="/herramientas/">Herramientas</a>
<a href="/contacto/">Contacto</a>
</div>
<div class="col">
<div class="etiqueta">Comunidad</div>
<a href="https://instagram.com/elplanquefalta" target="_blank" rel="noopener noreferrer">Instagram</a>
<a href="https://www.threads.net/@elplanquefalta" target="_blank" rel="noopener noreferrer">Threads</a>
<a href="https://tiktok.com/@elplanquefalta" target="_blank" rel="noopener noreferrer">TikTok</a>
</div>
</div>
<p class="legal">Información educativa, no es una recomendación personalizada. Rendimientos pasados no garantizan rendimientos futuros. Valida tus cálculos fiscales con tu contador.</p>
<p class="copy">© 2026 El Plan Que Falta · <a href="/aviso-de-privacidad/" style="color:#F5F2EB">Aviso de privacidad</a></p>
</div>
</footer>
"""

END = "</body>\n</html>\n"

# ---------- Inicio ----------
# Ediciones del newsletter. Para agregar una: guarda el cuerpo del correo (de <!-- ENCABEZADO --> a antes de
# <!-- PIE -->, sin merge tags) en site/ediciones/<fecha>.html, la portada en assets/portada-<fecha>.jpg y añade su entrada aquí.
MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
EDICIONES = [
    dict(fecha="2026-11-10", titulo="Aguinaldo, ISR y lo que aún cuenta para tu anual",
         ademas="las Afores proponen ahorro voluntario automático, Banxico baja su tasa a 6.25% y un checklist de tus deducciones personales.",
         alt="Sobre color crema con monedas doradas y una caja de regalo verde",
         desc="el ISR de tu aguinaldo y cómo recuperarlo, ahorro voluntario en tu Afore, las tasas de la semana y un checklist de deducciones."),
    dict(fecha="2026-10-27", titulo="La luz subió 18%: ¿tu dinero le gana a la inflación?",
         ademas="el paro de transportistas y tus compras, las tasas de la semana y cómo poner tu ahorro en piloto automático.",
         alt="Foco antiguo encendido junto a una pila de monedas doradas",
         desc="la inflación de 3.62% y el alza de la luz, el paro de transportistas, las tasas de la semana y cómo automatizar tu ahorro."),
    dict(fecha="2026-10-20", titulo="Más gente podrá entrar al RESICO. ¿Te conviene?",
         ademas="cómo detectar ofertas infladas en el Buen Fin, las tasas de la semana y seis preguntas para tu contador antes de cambiarte de régimen.",
         alt="Balanza de latón inclinada, con monedas doradas en un plato y el otro vacío",
         desc="la reforma al ISR que abre el RESICO y lo que pierdes al cambiarte, ofertas infladas en el Buen Fin y las tasas de la semana."),
    dict(fecha="2026-10-13", titulo="Si no tienes patrón, ¿quién ahorra por ti?",
         ademas="el SAT perdona multas y recargos hasta el 31 de octubre, las tasas de la semana y cómo revisar tu Afore en 10 minutos.",
         alt="Alcancía de cerámica color crema con una moneda dorada en la ranura",
         desc="el retiro de quienes trabajan por su cuenta, el programa del SAT para perdonar multas, las tasas de la semana y cómo revisar tu Afore."),
    dict(fecha="2026-10-06", titulo="Hasta Travis Kelce cayó en un Ponzi",
         ademas="los casos de este año en México, las tasas de la semana y cinco preguntas antes de darle tu dinero a alguien.",
         alt="Fila de fichas de dominó lisas, color crema y doradas, cayendo una sobre otra",
         desc="cómo funciona un esquema Ponzi con números, los casos en México, las tasas de la semana y qué revisar antes de invertir."),
]
EDICIONES.sort(key=lambda x: x["fecha"], reverse=True)


def fecha_larga(iso):
    y, m, d = iso.split("-")
    return f"{int(d)} de {MESES[int(m) - 1]} de {y}"


def tarjeta_edicion(x):
    return f"""<a class="tarjeta" href="/ediciones/{x['fecha']}/">
<img src="/img/portada-{x['fecha']}.jpg" alt="{x['alt']}" width="1600" height="893">
<div class="cuerpo">
<h3>{x['titulo']}</h3>
<p>Además: {x['ademas']}</p>
<div class="fecha">Publicado: {fecha_larga(x['fecha'])}</div>
</div>
</a>"""


CARDS = "\n".join(tarjeta_edicion(x) for x in EDICIONES)

inicio = head("El Plan Que Falta · Newsletter de finanzas personales en México",
              "Cada martes: las noticias de dinero que sí te pegan en el bolsillo, las tasas de la semana y una cosa concreta para hacer. Gratis.",
              "/") + nav() + f"""<main>
<section class="hero" id="suscribirme">
<div class="wrap">
<div class="etiqueta">Newsletter semanal · Martes 7:00</div>
<h1>Tienes ingresos.<br><span class="dorado">Te falta el plan.</span></h1>
<p class="sub">Cada martes: las noticias de dinero que sí te pegan en el bolsillo, las tasas de la semana y una cosa concreta para hacer.</p>
{form(1)}
</div>
</section>

<section class="ediciones" id="ediciones">
<div class="wrap">
<div class="cab">
<h2>Ediciones</h2>
<p class="nota">Una nueva cada martes.</p>
</div>
<div class="rejilla">
<!-- EDICIONES:INICIO (la más reciente va primero) -->
{CARDS}
<!-- EDICIONES:FIN -->
</div>
</div>
</section>

<section class="cierre">
<div class="wrap">
<h2>El próximo martes, <span class="dorado">en tu correo.</span></h2>
{form(2)}
</div>
</section>
</main>
""" + FOOT + FORM_JS + END

# ---------- Herramientas ----------
def hcard(href, cat, tag, img, alt, title, desc, cta, ext=False, k=''):
    extra = ' target="_blank" rel="noopener noreferrer"' if ext else ""
    return f"""<a class="tarjeta" href="{href}" data-cat="{cat}" data-k="{k}"{extra}>
<div class="img"><img src="/img/{img}" alt="{alt}" width="1600" height="893"><span class="tag">{tag}</span></div>
<div class="cuerpo">
<h3>{title}</h3>
<p>{desc}</p>
<div class="ir">{cta} →</div>
</div>
</a>"""


HCARDS = "\n".join([
    hcard("/herramientas/sat/", "calc", "Calculadora", "h-sat.jpg", "Pila de hojas color crema con un clip dorado y monedas",
          "¿Cuánto te devuelve el SAT?", "Tu devolución de 2026 con deducciones personales, colegiaturas y ahorro para el retiro (art. 151 y 185).", "Abrir calculadora", k="sat impuestos isr devolucion deducciones declaracion anual ppr 151 185"),
    hcard("/tarjetas/", "calc", "Comparador", "h-tarjetas.jpg", "Tres tarjetas en abanico: crema, dorada y verde",
          "¿Qué tarjeta de crédito te conviene?", "7 preguntas y 103 tarjetas comparadas, con topes, anualidades e IVA ya descontados.", "Abrir comparador", k="tarjeta credito cashback puntos anualidad"),
    hcard("/herramientas/libertad/", "calc", "Calculadora", "h-libertad.jpg", "Reloj de arena junto a pilas de monedas doradas",
          "Tu Número de Libertad Financiera", "Cuánto capital necesitas y cuánto apartar al mes para retirarte a la edad que quieres.", "Abrir calculadora", k="retiro jubilacion ahorro libertad financiera pension"),
    hcard("/herramientas/perfil/", "calc", "Test", "h-perfil.jpg", "Brújula de latón abierta junto a una moneda dorada",
          "Tu perfil de inversor", "8 preguntas para saber qué tipo de inversionista eres.", "Hacer el test", k="inversion invertir riesgo perfil"),
    hcard("https://forms.gle/LDvbtsaUaYV4GFVPA", "rec", "Reto", "h-reto.jpg", "Cuaderno abierto con una pluma dorada",
          "Reto Claridad Financiera", "Regístrate en el formulario para participar.", "Ir al registro", ext=True, k="reto presupuesto gastos claridad"),
])

herr = head("Herramientas gratis · El Plan Que Falta",
            "Comparador de tarjetas de crédito, test de perfil de inversor y calculadora de libertad financiera. Gratis y sin registro.",
            "/herramientas/") + nav("herramientas") + f"""<main>
<section class="kit">
<div class="wrap">
<div class="cabeza">
<span class="insignia">Gratis y sin registro</span>
<h1>Tus <span class="dorado">Herramientas</span></h1>
<p class="sub">Calculadoras, tests y recursos para que hagas la cuenta con tus números. Ves tu resultado al momento.</p>
<div class="pestanas" role="tablist" aria-label="Tipo de herramienta">
<button type="button" role="tab" aria-selected="true" data-tab="calc">Calculadoras y tests</button>
<button type="button" role="tab" aria-selected="false" data-tab="rec">Recursos</button>
</div>
<label class="oculto" for="buscar">Buscar herramienta</label>
<input class="buscar" id="buscar" type="search" placeholder="Busca: tarjetas, retiro, inversión...">
</div>
<div class="rejilla" id="rejilla">
{HCARDS}
</div>
<p class="vacio" id="vacio">No encontré nada con esa búsqueda.</p>
<p class="pronto">Próximamente: descargables.</p>
<div class="caja-cta">
<h2>¿Quieres esto en tu correo?</h2>
<p>Cada martes: las noticias de dinero que sí te pegan en el bolsillo, las tasas de la semana y una cosa concreta para hacer.</p>
<a class="btn btn-cuadro" href="/#suscribirme">Unirme gratis</a>
</div>
</div>
</section>
</main>
""" + FOOT + """<script>
(function () {
  var tab = 'calc', q = '';
  var cards = [].slice.call(document.querySelectorAll('#rejilla .tarjeta'));
  var vacio = document.getElementById('vacio');
  function pinta() {
    var n = 0;
    cards.forEach(function (c) {
      var ok = (q ? true : c.dataset.cat === tab) && (c.textContent + ' ' + (c.dataset.k || '')).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').indexOf(q) !== -1;
      c.style.display = ok ? '' : 'none';
      if (ok) n++;
    });
    vacio.style.display = n ? 'none' : 'block';
  }
  document.querySelectorAll('.pestanas button').forEach(function (b) {
    b.addEventListener('click', function () {
      tab = b.dataset.tab;
      document.querySelectorAll('.pestanas button').forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
      pinta();
    });
  });
  document.getElementById('buscar').addEventListener('input', function (e) { q = e.target.value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); pinta(); });
  pinta();
})();
</script>
""" + END

# ---------- Asesoría (incluye Sobre mí) ----------
OK = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
PLAY = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>'
IZQ = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>'
DER = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>'
CAL1 = "https://calendar.app.google/b12dcLWdyYB7BiMg7"
CAL2 = "https://calendar.app.google/PqH7RBjH1YqH94T39"
WA = "https://wa.me/message/V7LQAXFK254EH1"


def vcard(n):
    return f"""<div class="video-card">
<video src="/videos/testimonio-{n}.mp4" poster="/videos/testimonio-{n}.jpg" preload="none" playsinline></video>
<div class="pie-video">Cliente de El Plan Que Falta</div>
<button class="play" type="button" aria-label="Reproducir recomendación {n}">{PLAY}</button>
</div>"""


VIDEOS = "\n".join(vcard(n) for n in (1, 2, 3, 4))

ases = head("Contacto · Chris Lamas · El Plan Que Falta",
            "Una sesión uno a uno con Chris Lamas, asesora financiera certificada CNSF: qué vemos, qué te llevas y para quién es.",
            "/contacto/") + nav("asesoria") + f"""<main class="pag-contacto">
<section class="sm-hero">
<div class="wrap">
<div class="txt">
<div class="etiqueta">Asesoría uno a uno</div>
<h1>Ganas bien, pero <span class="dorado">tu dinero no tiene plan.</span></h1>
<p>En un diagnóstico gratis de 45 minutos revisamos tu situación real y te llevas la estructura para que tu dinero tenga un destino.</p>
<div class="acciones">
<a class="btn btn-cuadro" href="{CAL1}" target="_blank" rel="noopener noreferrer" data-agenda="AcZssZ2gD0eoLi6TJUgbro9fpbhPyzRWQ2wDsOfrf8wuYr9W_P_mKTsaRIHP8etQ_X5sdxFpBVgYWAr4" data-titulo="Diagnóstico Financiero">Agendar mi diagnóstico</a>
<a class="btn-linea" href="#recomendaciones">Ver qué dicen mis clientes</a>
</div>
</div>
<div class="retrato">
<div class="marco"><img src="/imagen-perfil-verde.png" alt="Chris Lamas"></div>
<div class="flota a">Asesora certificada<small>CNSF</small></div>
<div class="flota b">Diagnóstico gratis<small>45 minutos</small></div>
</div>
</div>
</section>

<section class="sm-sec">
<div class="wrap">
<div class="cab">
<div class="etiqueta">Lo que te llevas</div>
<h2>No sales con un folleto. <span class="dorado">Sales con claridad.</span></h2>
</div>
<div class="pilares">
<div class="resultado"><div class="marca-ok">{OK}</div><h3>Tu foto financiera real</h3><p>Cuánto entra, cuánto sale y dónde estás parado hoy.</p></div>
<div class="resultado"><div class="marca-ok">{OK}</div><h3>Una estrategia según tus metas</h3><p>Qué hacer con tu dinero para llegar a lo que quieres, y qué va primero.</p></div>
<div class="resultado"><div class="marca-ok">{OK}</div><h3>Números, no frases</h3><p>Cada recomendación con su cuenta, para que veas por qué te conviene.</p></div>
<div class="resultado"><div class="marca-ok">{OK}</div><h3>Tus siguientes pasos</h3><p>Qué hacer esta semana, este mes y este año.</p></div>
</div>
</div>
</section>

<section class="sm-sec" id="recomendaciones">
<div class="wrap">
<div class="cab">
<div class="etiqueta">Recomendaciones</div>
<h2>Lo que dicen quienes ya tuvieron <span class="dorado">su sesión</span></h2>
</div>
<div class="carrusel-caja">
<div class="giro" id="carrusel">
{VIDEOS}
</div>
<div class="puntos" id="car-puntos" aria-hidden="true"></div>
<div class="flechas">
<button type="button" id="car-ant" aria-label="Video anterior">{IZQ}</button>
<button type="button" id="car-sig" aria-label="Video siguiente">{DER}</button>
</div>
</div>
</div>
</section>

<section class="sm-sec">
<div class="wrap">
<div class="cab">
<div class="etiqueta">Para quién es</div>
<h2>A quién sí le sirve, <span class="dorado">y a quién no</span></h2>
</div>
<div class="dos">
<div class="lista si">
<h3>Sí es para ti si…</h3>
<ul>
<li>Ya tienes ingresos, pero no un plan.</li>
<li>Quieres estructura: saber qué va primero y por qué.</li>
<li>Quieres empezar o mejorar tu ahorro para el retiro.</li>
<li>Prefieres decidir con números y no con corazonadas.</li>
</ul>
</div>
<div class="lista no">
<h3>No es para ti si…</h3>
<ul>
<li>Buscas duplicar tu dinero en unos meses.</li>
<li>Quieres el tip de inversión de moda.</li>
<li>No piensas cambiar tus hábitos después de la sesión.</li>
</ul>
</div>
</div>
</div>
</section>

<section class="sm-sec" id="sesiones">
<div class="wrap">
<div class="cab">
<div class="etiqueta">Agenda tu sesión</div>
<h2>Elige por <span class="dorado">dónde empezar</span></h2>
</div>
<div class="rejilla">
<div class="sesion">
<span class="pildora">Gratis · 45 min</span>
<h3>Diagnóstico Financiero</h3>
<p>Revisamos tu estado real.</p>
<a class="btn btn-cuadro" href="{CAL1}" target="_blank" rel="noopener noreferrer" data-agenda="AcZssZ2gD0eoLi6TJUgbro9fpbhPyzRWQ2wDsOfrf8wuYr9W_P_mKTsaRIHP8etQ_X5sdxFpBVgYWAr4" data-titulo="Diagnóstico Financiero">Agendar</a>
</div>
<div class="sesion">
<h3>Retiro Inteligente</h3>
<p>Estrategia de largo plazo.</p>
<a class="btn btn-cuadro" href="{CAL2}" target="_blank" rel="noopener noreferrer" data-agenda="AcZssZ1k8XHg8LFPcwRL6QiXQpl4lLaE8qiA_CQiQf6QzfHQR4xL2VjuUOlI-8KKBhx4T7MPmhiOhaWn" data-titulo="Retiro Inteligente">Agendar</a>
</div>
</div>
<p class="nota" style="margin-top:22px;font-size:15px">¿Buscas un taller o conferencia para tu empresa o escuela? <a href="{WA}" target="_blank" rel="noopener noreferrer" style="color:#F5F2EB">Escríbeme por WhatsApp</a>.</p>
</div>
</section>

<section class="sm-sec" id="sobre-mi">
<div class="wrap">
<div class="cab">
<div class="etiqueta">Quién está detrás</div>
</div>
<div class="bio">
<h2>Chris Lamas</h2>
<div class="rol">Creadora de El Plan Que Falta</div>
<p>Soy Química Farmacobióloga por la Universidad de Guadalajara. Antes de dedicarme a las finanzas trabajé como ingeniera en Tequila José Cuervo y en Philip Morris, mejorando procesos: medir, encontrar dónde se pierde valor y corregirlo.</p>
<p>Hoy aplico ese mismo método a tu dinero. Reviso tus números como se revisa un proceso: qué entra, qué se fuga y qué se puede optimizar. De ahí sale una estrategia hecha para tus metas, no una receta genérica.</p>
<p>Soy asesora financiera certificada ante la CNSF, tengo un Diplomado en Administración Financiera por el ITESO y curso la credencial de Wealth Management en The American College of Financial Services.</p>
<ul class="chips">
<li>Certificación CNSF</li>
<li>Diplomado en Administración Financiera, ITESO</li>
<li>Wealth Management en curso, The American College</li>
<li>Química Farmacobióloga, Universidad de Guadalajara</li>
</ul>
<div class="frase">Finanzas con estrategia. Para quien quiere que su dinero tenga un destino claro.</div>
<a class="btn btn-cuadro" href="{CAL1}" target="_blank" rel="noopener noreferrer" data-agenda="AcZssZ2gD0eoLi6TJUgbro9fpbhPyzRWQ2wDsOfrf8wuYr9W_P_mKTsaRIHP8etQ_X5sdxFpBVgYWAr4" data-titulo="Diagnóstico Financiero">Agendar mi diagnóstico gratis</a>
</div>
</div>
</section>

<section class="cierre">
<div class="wrap">
<h2>Tu dinero, <span class="dorado">con destino claro.</span></h2>
<a class="btn btn-cuadro" href="{CAL1}" target="_blank" rel="noopener noreferrer" data-agenda="AcZssZ2gD0eoLi6TJUgbro9fpbhPyzRWQ2wDsOfrf8wuYr9W_P_mKTsaRIHP8etQ_X5sdxFpBVgYWAr4" data-titulo="Diagnóstico Financiero">Agendar mi diagnóstico</a>
<p class="nota">¿Todavía no? <a href="/#suscribirme" style="color:#F5F2EB">Suscríbete al newsletter</a> y nos leemos cada martes.</p>
</div>
</section>
</main>
""" + FOOT + """<dialog class="agenda" id="agenda" aria-labelledby="agenda-titulo">
<div class="barra">
<div class="t"><span class="etiqueta">Agenda tu sesión</span><h2 id="agenda-titulo">Agendar</h2></div>
<button class="cerrar" type="button" id="agenda-cerrar" aria-label="Cerrar"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
</div>
<div class="marco-cal"><div class="cargando" id="agenda-cargando">Cargando calendario…</div><iframe id="agenda-marco" title="Calendario para agendar" loading="lazy"></iframe></div>
<p class="pie-agenda">Elige día y hora. ¿No carga? <a id="agenda-fuera" href="#" target="_blank" rel="noopener noreferrer">Ábrelo en otra pestaña</a>.</p>
</dialog>
<script>
(function () {
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('ya'); io.unobserve(e.target); } }); }, { threshold: 0.12 });
  document.querySelectorAll('.pag-contacto .sm-sec .cab, .pag-contacto .pilares, .pag-contacto .carrusel-caja, .pag-contacto .dos, .pag-contacto .rejilla, .pag-contacto .bio').forEach(function (el) { el.classList.add('aparece'); io.observe(el); });
})();
</script>
<script>
(function () {
  var dlg = document.getElementById('agenda');
  if (!dlg || typeof dlg.showModal !== 'function') return; // sin soporte: los botones abren el calendario en otra pestaña
  var marco = document.getElementById('agenda-marco'), cargando = document.getElementById('agenda-cargando');
  marco.addEventListener('load', function () { if (marco.getAttribute('src')) cargando.style.display = 'none'; });
  document.querySelectorAll('a[data-agenda]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      document.getElementById('agenda-titulo').textContent = a.dataset.titulo || 'Agendar';
      document.getElementById('agenda-fuera').href = a.href;
      cargando.style.display = '';
      marco.src = 'https://calendar.google.com/calendar/appointments/schedules/' + a.dataset.agenda + '?gv=true';
      dlg.showModal();
      document.documentElement.style.overflow = 'hidden';
      try { window.va('event', { name: 'AgendaAbrir', data: { sesion: a.dataset.titulo } }); } catch (err) {}
    });
  });
  function cerrar() { dlg.close(); }
  document.getElementById('agenda-cerrar').addEventListener('click', cerrar);
  dlg.addEventListener('click', function (e) { if (e.target === dlg) cerrar(); });
  dlg.addEventListener('close', function () { marco.removeAttribute('src'); document.documentElement.style.overflow = ''; });
})();
</script>
<script>
(function () {
  var car = document.getElementById('carrusel');
  var cards = [].slice.call(car.querySelectorAll('.video-card'));
  var puntos = document.getElementById('car-puntos');
  var n = cards.length, activo = 0, pausado = false;
  cards.forEach(function () { puntos.appendChild(document.createElement('span')); });
  function pinta() {
    var sep = window.innerWidth <= 640 ? 150 : 250;
    cards.forEach(function (c, i) {
      var d = ((i - activo) % n + n) % n;
      if (d > n / 2) d -= n;
      var a = Math.abs(d);
      c.style.setProperty('--x', (d * sep) + 'px');
      c.style.setProperty('--s', a === 0 ? 1 : (a === 1 ? 0.8 : 0.64));
      c.style.setProperty('--o', a === 0 ? 1 : (a === 1 ? 0.6 : (a === 2 ? 0.28 : 0)));
      c.style.setProperty('--z', 10 - a);
      c.style.pointerEvents = a > 2 ? 'none' : '';
      c.classList.toggle('centro', a === 0);
      puntos.children[i].classList.toggle('on', a === 0);
    });
  }
  function detener() {
    cards.forEach(function (c) { var v = c.querySelector('video'); v.pause(); v.controls = false; c.classList.remove('activo'); });
  }
  function ir(i) { detener(); activo = ((i % n) + n) % n; pinta(); }
  function reproduciendo() { return cards.some(function (c) { var v = c.querySelector('video'); return !v.paused && !v.ended; }); }
  document.getElementById('car-ant').addEventListener('click', function () { ir(activo - 1); });
  document.getElementById('car-sig').addEventListener('click', function () { ir(activo + 1); });
  cards.forEach(function (c, i) {
    var v = c.querySelector('video');
    c.addEventListener('click', function (e) {
      if (i !== activo) { e.preventDefault(); ir(i); return; }
      if (e.target.closest('.play')) { v.controls = true; c.classList.add('activo'); v.play(); }
    });
    v.addEventListener('ended', function () { c.classList.remove('activo'); v.controls = false; });
  });
  car.addEventListener('pointerenter', function () { pausado = true; });
  car.addEventListener('pointerleave', function () { pausado = false; });
  window.addEventListener('resize', pinta);
  pinta();
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setInterval(function () { if (!pausado && !reproduciendo() && !document.hidden) ir(activo + 1); }, 3500);
  }
})();
</script>
""" + END

# ---------- Páginas de cada edición ----------
def pagina_edicion(x):
    rows = (HERE / "ediciones" / f"{x['fecha']}.html").read_text(encoding="utf-8")
    assert "{{" not in rows and "*|" not in rows, f"quedan merge tags en {x['fecha']}"
    correo = ('<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;margin:0 auto;">\n'
              + rows + "\n</table>")
    largo = fecha_larga(x["fecha"])
    return head(f"{x['titulo']} · El Plan Que Falta", f"Edición del {largo}: {x['desc']}",
                f"/ediciones/{x['fecha']}/") + nav("ediciones") + f"""<main>
<section class="edicion">
<div class="wrap">
<div class="cab">
<a class="volver" href="/#ediciones">Todas las ediciones</a>
<h1>{x['titulo']}</h1>
<div class="fecha">Publicado: {largo}</div>
</div>
<img class="portada" src="/img/portada-{x['fecha']}.jpg" alt="{x['alt']}" width="1600" height="893">
<div class="correo">
{correo}
</div>
</div>
</section>
<section class="cierre">
<div class="wrap">
<h2>Recíbelo cada martes, <span class="dorado">en tu correo.</span></h2>
{form(1)}
</div>
</section>
</main>
""" + FOOT + FORM_JS + END


# ---------- Calculadoras y tests (cuerpo en site/tools/*.html, cálculo en *.calc.mjs) ----------
TOOLS = [
    ("libertad", "Número de Libertad Financiera · El Plan Que Falta",
     "Calcula cuánto necesitas tener junto para vivir de tu dinero y cuánto apartar al mes, con supuestos que puedes cambiar."),
    ("perfil", "Test: tu perfil de inversor · El Plan Que Falta",
     "Ocho preguntas para conocer tu perfil de inversor y ver una mezcla de ejemplo para tu portafolio."),
    ("sat", "¿Cuánto te devuelve el SAT? Calculadora 2026 · El Plan Que Falta",
     "Calcula tu devolución de ISR 2026 con deducciones personales, colegiaturas, plan personal de retiro (art. 151) y art. 185."),
]
for slug, title, desc in TOOLS:
    out = PUB / "herramientas" / slug
    out.mkdir(parents=True, exist_ok=True)
    body = (HERE / "tools" / f"{slug}.html").read_text(encoding="utf-8")
    (out / "index.html").write_text(head(title, desc, f"/herramientas/{slug}/") + nav("herramientas") + body + FOOT + END, encoding="utf-8")
    shutil.copy(HERE / "tools" / f"{slug}.calc.mjs", out / "calc.mjs")

# ---------- Comparador de tarjetas (cuerpo en tools/tarjetas.html, interfaz en tools/tarjetas.app.mjs) ----------
tj = head("¿Qué tarjeta de crédito te conviene más? | Comparador de tarjetas en México 2026",
          "Tres datos y ves qué tarjetas de crédito te regresan más dinero al año en México, con topes, anualidades, membresías e IVA ya descontados. 103 tarjetas revisadas.",
          "/tarjetas") + nav("herramientas") + (HERE / "tools" / "tarjetas.html").read_text(encoding="utf-8") + FOOT + END
extra = ('<link rel="modulepreload" href="/tarjetas/calc.mjs?v=20261110b">\n'
         '<link rel="preload" href="/tarjetas/data/cards.json" as="fetch" crossorigin>\n'
         + (HERE / "tools" / "tarjetas.jsonld.html").read_text(encoding="utf-8") + "\n</head>")
tj = tj.replace("</head>", extra, 1)
(PUB / "tarjetas" / "index.html").write_text(tj, encoding="utf-8")
shutil.copy(HERE / "tools" / "tarjetas.app.mjs", PUB / "tarjetas" / "app.mjs")

aviso = head("Aviso de privacidad · El Plan Que Falta",
             "Qué datos personales recaba El Plan Que Falta, para qué los usa y cómo ejercer tus derechos ARCO.",
             "/aviso-de-privacidad/") + nav() + (HERE / "tools" / "aviso.html").read_text(encoding="utf-8") + FOOT + END

for rel, content in [("aviso-de-privacidad/index.html", aviso), ("index.html", inicio), ("herramientas/index.html", herr), ("contacto/index.html", ases)] + [(f"ediciones/{x['fecha']}/index.html", pagina_edicion(x)) for x in EDICIONES]:
    p = PUB / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
shutil.copy(HERE / "site.css", PUB / "site.css")
(PUB / "img").mkdir(exist_ok=True)
for x in EDICIONES:
    shutil.copy(HERE / "assets" / f"portada-{x['fecha']}.jpg", PUB / "img" / f"portada-{x['fecha']}.jpg")
(PUB / "videos").mkdir(exist_ok=True)
for f in (HERE / "videos").glob("testimonio-*"):
    shutil.copy(f, PUB / "videos" / f.name)
for n in ("h-tarjetas", "h-libertad", "h-perfil", "h-reto", "h-sat"):
    shutil.copy(HERE / "assets" / f"{n}.jpg", PUB / "img" / f"{n}.jpg")
print("listo")

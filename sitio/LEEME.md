# Cómo se arma elplanquefalta.com

Lo que Vercel publica es la carpeta `public/`. Las páginas nuevas (inicio, ediciones, herramientas, contacto, aviso de privacidad) **no se editan a mano en `public/`**: se generan con `sitio/build.py`.

```
python3 sitio/build.py     # regenera public/
npm run build              # corre las pruebas (deben pasar todas)
```

## Qué hay en esta carpeta

- `build.py`: arma todas las páginas. Encabezado, menú y pie se definen una sola vez ahí.
- `site.css`: estilos de todo el sitio. Al cambiarlo, sube la versión `site.css?v=...` en `build.py`.
- `tools/`: cuerpo de cada herramienta (`*.html`) y su cálculo (`*.calc.mjs`), más el aviso de privacidad (`aviso.html`).
- `ediciones/AAAA-MM-DD.html`: cuerpo de cada edición del newsletter (las filas del correo, de `<!-- ENCABEZADO -->` a antes de `<!-- PIE -->`, sin merge tags de Brevo).
- `assets/`: fotos de portada (`portada-AAAA-MM-DD.jpg`) y de herramientas (`h-*.jpg`).
- `videos/`: recomendaciones de clientes ya comprimidas.

## Agregar una edición

1. Guarda el cuerpo del correo en `sitio/ediciones/AAAA-MM-DD.html`.
2. Guarda la portada en `sitio/assets/portada-AAAA-MM-DD.jpg` (16:9).
3. Agrega la edición **al inicio** de la lista `EDICIONES` en `build.py`: fecha, título, línea "Además", texto alternativo de la foto y descripción.
4. Corre `python3 sitio/build.py` y `npm run build`.
5. Sube a una rama, revisa la vista previa de Vercel y pasa a `main` para publicar.

La página queda en `https://elplanquefalta.com/ediciones/AAAA-MM-DD/`.

## Suscripción y agenda

- Las cajas de suscripción envían al formulario de Brevo "Web El Plan Que Falta" (lista "Newsletter"). La dirección está en la variable `BREVO` de `build.py`.
- Los botones de agendar abren el calendario de citas de Google dentro de la página (atributo `data-agenda`).

# Te Defiendo Laboral.cl - Sitio Web + App Web instalable

Proyecto listo para subir a **GitHub Pages**. Esta versión está basada en el diseño anterior, pero se eliminó el panel CRM. Se mantienen el sitio web, formularios, chatbot, video, brochure, comunidad/networking, PWA instalable y base de datos local.

## Archivos principales

- `index.html`: sitio web principal.
- `styles.css`: diseño responsive.
- `app.js`: interacción, formularios, chatbot e instalación PWA.
- `db.js`: base de datos local con IndexedDB.
- `sw.js`: Service Worker para funcionamiento offline básico.
- `manifest.webmanifest`: configuración para instalar como App Web.
- `config.js`: conexión opcional futura con Supabase.
- `assets/`: logo, video, brochure e imágenes.
- `data/`: ejemplos para Supabase, Firebase y datos demo.

## Qué incluye

- Diseño responsive para computador, tablet, Android y iPhone.
- Instalación como App Web Progresiva desde navegador.
- Formulario de contacto conectado a WhatsApp.
- Formulario de networking / membresía.
- Foro de preguntas laborales con respuesta automática inicial.
- Newsletter.
- Chatbot flotante.
- Video comercial con avatar.
- Brochure PDF.
- Base de datos local en el navegador.
- Exportación de registros en JSON y CSV.

## Cómo subir a GitHub Pages

1. Crear un repositorio nuevo en GitHub.
2. Subir todos los archivos de esta carpeta.
3. Ir a `Settings > Pages`.
4. En `Build and deployment`, seleccionar `Deploy from a branch`.
5. Elegir la rama `main` y carpeta `/root`.
6. Guardar y esperar la URL publicada.

## Cómo instalar en Android

1. Abrir la URL publicada en Chrome.
2. Tocar el menú de tres puntos.
3. Seleccionar `Instalar app` o `Agregar a pantalla principal`.

## Cómo instalar en iPhone

1. Abrir la URL publicada en Safari.
2. Tocar el botón de compartir.
3. Seleccionar `Agregar a pantalla de inicio`.

## Base de datos

Por defecto, los formularios se guardan en **IndexedDB**, dentro del navegador del usuario. Esto funciona en GitHub Pages sin servidor.

Para una base de datos real compartida por todos los dispositivos, se debe conectar Supabase o Firebase y ajustar `config.js`.

## Nota técnica

GitHub Pages permite publicar sitios estáticos. Por eso esta versión no necesita backend para funcionar. Para funciones avanzadas como usuarios con login, panel administrativo real, membresías automáticas o pagos, se debe desarrollar una segunda etapa con backend.

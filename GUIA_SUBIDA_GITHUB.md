# Guía de subida a GitHub Pages

## Importante

No subas el archivo ZIP como si fuera el sitio, porque GitHub Pages no descomprime archivos ZIP. Primero descomprime este paquete y sube todos los archivos y carpetas de su interior.

El archivo `index.html` debe quedar directamente en la raíz del repositorio, junto a `crm.html`, `styles.css`, `app.js` y las demás carpetas.

## Subida desde el navegador

1. Crea un repositorio nuevo.
2. Abre **Add file > Upload files**.
3. Arrastra el contenido descomprimido de esta carpeta.
4. Confirma el commit.
5. Abre **Settings > Pages**.
6. Selecciona **Deploy from a branch**.
7. Elige la rama `main` y la carpeta `/ (root)`.
8. Guarda y espera la publicación.

## Base de datos

El proyecto inicia en modo local porque `config.js` tiene `mode: 'local'`. Para conectarlo a Supabase debes completar `supabaseUrl`, `supabaseAnonKey` y cambiar el modo según las instrucciones de `docs/CONFIGURAR_SUPABASE_PASO_A_PASO.md`.

Nunca publiques una clave `service_role` en GitHub.

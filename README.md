# Te Defiendo Laboral.cl — Sitio Web + App PWA + CRM Supabase

Proyecto demostrativo funcional que conserva el diseño de Te Defiendo Laboral.cl e incorpora:

- Sitio web responsive para computador, Android, iPhone y tablet.
- Video de presentación integrado en la portada.
- App Web Progresiva (PWA) instalable.
- CRM administrable con base interna IndexedDB.
- Conexión opcional y real a Supabase.
- CRUD para usuarios, perfiles, categorías, publicaciones, avisos, archivos, casos laborales y contenidos.
- Planes Básico, Premium y Administrador con módulos diferenciados.
- Carga de archivos local o en Supabase Storage.
- Chat interno y notificaciones con Supabase Realtime.
- Formulario público de contacto guardado en la base de datos.
- Código compatible con GitHub Pages.

## 1. Abrir la demostración local

No abras `index.html` directamente con doble clic. Usa un servidor local:

```bash
python -m http.server 8080
```

Después abre:

```text
http://localhost:8080
```

CRM:

```text
http://localhost:8080/crm.html
```

Usuarios de demostración interna:

- Administrador: `admin@tedefiendolaboral.cl` / `admin123`
- Básico: `basico@demo.cl` / `basico123`
- Premium: `premium@demo.cl` / `premium123`

Los datos del modo demo se guardan en IndexedDB dentro del navegador.

## 2. Publicar en GitHub Pages

Sube todos los archivos y carpetas a la raíz del repositorio. En GitHub:

1. Abre **Settings**.
2. Entra a **Pages**.
3. Selecciona **Deploy from a branch**.
4. Elige la rama `main` y la carpeta `/ (root)`.
5. Guarda.

GitHub Pages ejecuta el sitio, la PWA y el CRM en modo interno. La conexión a Supabase funciona desde GitHub Pages porque Supabase entrega el backend externo.

## 3. Crear y conectar Supabase

1. Crea un proyecto en Supabase.
2. Abre **SQL Editor**.
3. Ejecuta completo `supabase/schema.sql`.
4. Crea el primer usuario en **Authentication > Users**.
5. En la tabla `profiles`, cambia ese usuario a:
   - `role = admin`
   - `plan = admin`
   - `status = activo`
6. Copia `config.example.js` como `config.js` y completa:

```js
window.TDL_CONFIG = {
  supabaseUrl: 'https://TU-PROYECTO.supabase.co',
  supabaseAnonKey: 'TU-ANON-PUBLIC-KEY',
  storageBucket: 'crm-files',
  mode: 'supabase',
  whatsapp: '56920185428',
  instagramReel: 'https://www.instagram.com/reel/DZL333LMT3h/?igsh=dGtwMDNya3JsOGFs'
};
```

También puedes ingresar la URL y la anon key desde el botón **Configurar conexión Supabase** del CRM. La configuración se guarda localmente en ese navegador.

## 4. Desplegar las Edge Functions para administrar usuarios

La creación y eliminación de cuentas de Supabase Auth necesita ejecutarse en servidor; nunca coloques la `service_role` en el navegador.

Con Supabase CLI:

```bash
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase functions deploy admin-create-user
supabase functions deploy admin-delete-user
```

Las funciones incluidas usan variables que Supabase proporciona en el entorno:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 5. Funciones del CRM

### Administrador

- Crear, editar, actualizar y eliminar usuarios.
- Cambiar planes, roles y estado.
- Crear categorías.
- Aprobar publicaciones y proyectos.
- Crear avisos y notificaciones.
- Subir, reemplazar y eliminar archivos.
- Ver consultas del sitio público.
- Administrar todo el contenido.

### Plan Básico

- Crear y editar perfil.
- Agregar logo, empresa, descripción y enlaces.
- Crear publicaciones para aprobación.
- Ver avisos y publicaciones autorizadas.

### Plan Premium

- Todo el Plan Básico.
- Kit de soluciones y archivos premium.
- Formularios de claves laborales.
- FAQ, casos, objeciones, proyectos, eventos y herramientas.
- Chat comunitario.

## 6. Archivos principales

- `index.html`: sitio público.
- `crm.html`: CRM.
- `app.js`: comportamiento del sitio.
- `crm.js`: comportamiento del CRM.
- `local-db.js`: base interna IndexedDB.
- `data-service.js`: adaptador local/Supabase.
- `config.js`: conexión pública.
- `supabase/schema.sql`: tablas, RLS, Storage y Realtime.
- `supabase/functions/`: administración segura de usuarios.
- `manifest.webmanifest` y `sw.js`: instalación PWA.

## Seguridad

- La anon key puede estar en el frontend solamente con RLS correctamente habilitado.
- Nunca publiques la `service_role`.
- Las contraseñas demo locales son solo para demostración y no deben usarse en producción.
- Para producción, usa Supabase Auth y las Edge Functions incluidas.
- Revisa políticas de privacidad, tratamiento de datos y contenidos legales antes del lanzamiento comercial.

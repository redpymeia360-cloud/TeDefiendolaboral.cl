# Validación funcional incluida

La versión entregada incluye código para:

- Base interna IndexedDB con datos de demostración.
- Inicio de sesión local para Administrador, Básico y Premium.
- Inicio de sesión real con Supabase Auth cuando se configura el proyecto.
- Crear, editar, actualizar y eliminar usuarios.
- Crear, editar y eliminar perfiles.
- Crear, editar, activar y eliminar categorías.
- Crear, editar, aprobar y eliminar publicaciones.
- Subir, editar, descargar y eliminar archivos.
- Crear, editar y eliminar avisos.
- Crear, editar y eliminar formularios/casos laborales.
- Administrar FAQ, casos, objeciones, proyectos, eventos, partners, noticias y herramientas.
- Chat local y conexión preparada a Supabase Realtime.
- Notificaciones internas.
- Consultas del formulario público.
- Exportación JSON de datos.
- PWA instalable y responsive.

## Limitaciones de la demostración

La conexión Supabase no puede quedar activa sin la URL y la anon key del proyecto del cliente. La administración segura de cuentas Auth usa las Edge Functions incluidas y requiere desplegarlas en la cuenta Supabase del cliente.

# Configuración paso a paso de Supabase

## A. Base de datos

1. Crea un proyecto.
2. Abre SQL Editor.
3. Copia y ejecuta `supabase/schema.sql`.
4. Revisa que existan las tablas `profiles`, `categories`, `posts`, `notices`, `files`, `labor_cases`, `content_items`, `chat_messages`, `notifications` y `leads`.
5. Revisa que Storage tenga el bucket privado `crm-files`.

## B. Primer administrador

1. Crea un usuario en Authentication.
2. Busca su UUID.
3. En Table Editor > profiles, cambia role y plan a `admin`.

## C. Conexión del sitio

Completa `config.js` o usa el formulario de conexión del CRM.

## D. Edge Functions

Despliega `admin-create-user` y `admin-delete-user` con Supabase CLI. Estas funciones verifican que el usuario que llama sea administrador antes de usar la API administrativa.

## E. Prueba

1. Inicia sesión en el CRM con el administrador.
2. Crea una categoría.
3. Crea un usuario Básico y otro Premium.
4. Sube un archivo.
5. Crea un aviso y comprueba la notificación.
6. Inicia sesión con cada plan y revisa los permisos.

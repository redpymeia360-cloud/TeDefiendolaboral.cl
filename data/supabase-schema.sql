-- Supabase schema opcional para Te Defiendo Laboral.cl
-- GitHub Pages funciona con IndexedDB local. Usa este SQL solo si conectarás backend real.

create table if not exists public.tdl_leads (
  id text primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  synced boolean default false,
  nombre text,
  apellido text,
  telefono text,
  correo text,
  tipo_cliente text,
  servicio text,
  comentario text,
  respuesta text
);

create table if not exists public.tdl_networking (
  id text primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  synced boolean default false,
  nombre text,
  apellido text,
  telefono text,
  correo text,
  profesion text,
  participacion text,
  comentario text
);

create table if not exists public.tdl_newsletter (
  id text primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  synced boolean default false,
  correo text,
  interes text
);

create table if not exists public.tdl_questions (
  id text primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  synced boolean default false,
  nombre text,
  correo text,
  pregunta text,
  respuesta text
);

-- Recomendación: activar Row Level Security y crear políticas seguras antes de producción.

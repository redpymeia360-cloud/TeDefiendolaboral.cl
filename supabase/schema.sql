-- TE DEFIENDO LABORAL - CRM WEB + SUPABASE
-- Ejecutar completo en Supabase > SQL Editor.
-- Después crea el primer usuario en Authentication y cambia su perfil a role='admin', plan='admin'.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  display_name text,
  company text,
  role text not null default 'member' check (role in ('member','admin')),
  plan text not null default 'basico' check (plan in ('basico','premium','admin')),
  status text not null default 'activo' check (status in ('activo','pendiente','bloqueado')),
  whatsapp text,
  about text,
  social_url text,
  youtube_url text,
  agenda_url text,
  sponsor text,
  logo_url text,
  logo_storage_path text,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'publicacion',
  description text,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  category_id uuid references public.categories(id) on delete set null,
  visibility text not null default 'todos' check (visibility in ('todos','basico','premium')),
  status text not null default 'pendiente' check (status in ('pendiente','aprobado','observado','archivado')),
  featured boolean not null default false,
  url text,
  file_name text,
  mime_type text,
  size_bytes bigint,
  storage_path text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience text not null default 'todos' check (audience in ('todos','basico','premium')),
  published boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category_id uuid references public.categories(id) on delete set null,
  access_level text not null default 'todos' check (access_level in ('todos','basico','premium')),
  file_name text,
  mime_type text,
  size_bytes bigint,
  storage_path text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.labor_cases (
  id uuid primary key default gen_random_uuid(),
  case_name text not null,
  topic text,
  facts text,
  solution text,
  status text not null default 'nuevo' check (status in ('nuevo','revision','cerrado')),
  priority text not null default 'normal' check (priority in ('normal','alta','urgente')),
  created_by uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('faq','caso','objecion','proyecto','evento','sponsor','noticia','herramienta')),
  title text not null,
  body text,
  access_level text not null default 'todos' check (access_level in ('todos','basico','premium')),
  status text not null default 'pendiente' check (status in ('pendiente','publicado','archivado')),
  url text,
  event_date timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  display_name text,
  message text not null,
  file_name text,
  mime_type text,
  size_bytes bigint,
  storage_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  audience text not null default 'todos' check (audience in ('todos','basico','premium')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  email text,
  phone text,
  client_type text,
  service text,
  message text,
  status text not null default 'nuevo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Actualización automática de updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles','categories','posts','notices','files','labor_cases','content_items','leads']
  loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I',t,t);
    execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',t,t);
  end loop;
end $$;

-- Perfil automático al registrarse en Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  insert into public.profiles(id,email,full_name,company,role,plan,status)
  values(
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    coalesce(new.raw_user_meta_data->>'company',''),
    case when new.raw_user_meta_data->>'role'='admin' then 'admin' else 'member' end,
    case when new.raw_user_meta_data->>'plan' in ('premium','admin') then new.raw_user_meta_data->>'plan' else 'basico' end,
    'activo'
  ) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Funciones auxiliares RLS. SECURITY DEFINER evita recursión al consultar profiles.
create or replace function public.current_role()
returns text language sql stable security definer set search_path=public
as $$ select coalesce((select role from public.profiles where id=auth.uid()),'member') $$;

create or replace function public.current_plan()
returns text language sql stable security definer set search_path=public
as $$ select coalesce((select plan from public.profiles where id=auth.uid()),'basico') $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select public.current_role()='admin' or public.current_plan()='admin' $$;

create or replace function public.can_read_level(level text)
returns boolean language sql stable security definer set search_path=public
as $$
  select public.is_admin()
    or level='todos'
    or level=public.current_plan()
    or (public.current_plan()='premium' and level='basico');
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.posts enable row level security;
alter table public.notices enable row level security;
alter table public.files enable row level security;
alter table public.labor_cases enable row level security;
alter table public.content_items enable row level security;
alter table public.chat_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.leads enable row level security;

-- Limpiar políticas para poder volver a ejecutar el archivo.
do $$
declare r record;
begin
  for r in select schemaname,tablename,policyname from pg_policies where schemaname='public' and tablename in ('profiles','categories','posts','notices','files','labor_cases','content_items','chat_messages','notifications','leads')
  loop execute format('drop policy if exists %I on %I.%I',r.policyname,r.schemaname,r.tablename); end loop;
end $$;

create policy "profiles_select_authenticated" on public.profiles for select to authenticated using (true);
create policy "profiles_update_own_or_admin" on public.profiles for update to authenticated using (id=auth.uid() or public.is_admin()) with check (id=auth.uid() or public.is_admin());
create policy "profiles_admin_insert" on public.profiles for insert to authenticated with check (public.is_admin());
create policy "profiles_admin_delete" on public.profiles for delete to authenticated using (public.is_admin());

create policy "categories_read" on public.categories for select to authenticated using (active or public.is_admin());
create policy "categories_admin_all" on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "posts_read" on public.posts for select to authenticated using (
  public.is_admin() or created_by=auth.uid() or (status='aprobado' and public.can_read_level(visibility))
);
create policy "posts_insert" on public.posts for insert to authenticated with check (created_by=auth.uid() or public.is_admin());
create policy "posts_update" on public.posts for update to authenticated using (created_by=auth.uid() or public.is_admin()) with check (created_by=auth.uid() or public.is_admin());
create policy "posts_delete" on public.posts for delete to authenticated using (created_by=auth.uid() or public.is_admin());

create policy "notices_read" on public.notices for select to authenticated using (public.is_admin() or (published and public.can_read_level(audience)));
create policy "notices_admin_all" on public.notices for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "files_read" on public.files for select to authenticated using (public.can_read_level(access_level));
create policy "files_insert_premium" on public.files for insert to authenticated with check ((public.current_plan() in ('premium','admin') or public.is_admin()) and (created_by=auth.uid() or public.is_admin()));
create policy "files_update_owner_admin" on public.files for update to authenticated using (created_by=auth.uid() or public.is_admin()) with check (created_by=auth.uid() or public.is_admin());
create policy "files_delete_owner_admin" on public.files for delete to authenticated using (created_by=auth.uid() or public.is_admin());

create policy "labor_cases_read" on public.labor_cases for select to authenticated using (created_by=auth.uid() or public.is_admin());
create policy "labor_cases_insert" on public.labor_cases for insert to authenticated with check ((public.current_plan() in ('premium','admin') or public.is_admin()) and created_by=auth.uid());
create policy "labor_cases_update" on public.labor_cases for update to authenticated using (created_by=auth.uid() or public.is_admin()) with check (created_by=auth.uid() or public.is_admin());
create policy "labor_cases_delete" on public.labor_cases for delete to authenticated using (created_by=auth.uid() or public.is_admin());

create policy "content_read" on public.content_items for select to authenticated using (public.is_admin() or created_by=auth.uid() or (status='publicado' and public.can_read_level(access_level)));
create policy "content_insert" on public.content_items for insert to authenticated with check ((public.current_plan() in ('premium','admin') or public.is_admin()) and created_by=auth.uid());
create policy "content_update" on public.content_items for update to authenticated using (created_by=auth.uid() or public.is_admin()) with check (created_by=auth.uid() or public.is_admin());
create policy "content_delete" on public.content_items for delete to authenticated using (created_by=auth.uid() or public.is_admin());

create policy "chat_read" on public.chat_messages for select to authenticated using (public.current_plan() in ('premium','admin') or public.is_admin());
create policy "chat_insert" on public.chat_messages for insert to authenticated with check ((public.current_plan() in ('premium','admin') or public.is_admin()) and user_id=auth.uid());
create policy "chat_delete" on public.chat_messages for delete to authenticated using (user_id=auth.uid() or public.is_admin());

create policy "notifications_read" on public.notifications for select to authenticated using (public.can_read_level(audience));
create policy "notifications_admin_write" on public.notifications for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "leads_public_insert" on public.leads for insert to anon,authenticated with check (true);
create policy "leads_admin_read" on public.leads for select to authenticated using (public.is_admin());
create policy "leads_admin_update" on public.leads for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "leads_admin_delete" on public.leads for delete to authenticated using (public.is_admin());

-- Storage privado para documentos, logos, imágenes y videos.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('crm-files','crm-files',false,52428800,null)
on conflict (id) do update set public=false,file_size_limit=52428800;

do $$
declare r record;
begin
  for r in select policyname from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'tdl_%'
  loop execute format('drop policy if exists %I on storage.objects',r.policyname); end loop;
end $$;

create policy "tdl_storage_read" on storage.objects for select to authenticated
using (bucket_id='crm-files');
create policy "tdl_storage_insert" on storage.objects for insert to authenticated
with check (bucket_id='crm-files' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "tdl_storage_update" on storage.objects for update to authenticated
using (bucket_id='crm-files' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()))
with check (bucket_id='crm-files' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));
create policy "tdl_storage_delete" on storage.objects for delete to authenticated
using (bucket_id='crm-files' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));

-- Realtime para chat y notificaciones.
do $$ begin
  alter publication supabase_realtime add table public.chat_messages;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;

-- Categorías iniciales (opcional)
insert into public.categories(name,type,description,active)
select * from (values
 ('Contratación','laboral','Contratos, cláusulas mínimas, anexos y jornadas.',true),
 ('Despido y finiquito','laboral','Cartas, causales, finiquitos, remuneraciones y horas extras.',true),
 ('Ley Karin','laboral','Protocolo, denuncia, investigación y medidas de resguardo.',true),
 ('Networking','publicacion','Alianzas y colaboración entre integrantes.',true),
 ('Emprendimiento','publicacion','Proyectos sujetos a aprobación.',true),
 ('Kit de soluciones','archivo','Plantillas, checklists y herramientas.',true)
) as v(name,type,description,active)
where not exists(select 1 from public.categories);

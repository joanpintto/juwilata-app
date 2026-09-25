-- Juwilata United · Fase 4: compartir el equipo con los compañeros (solo lectura).
-- Pegar entero en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez.
--
-- Seguridad:
-- - Las tablas tienen RLS activado y ninguna política: nadie puede leerlas ni
--   escribirlas directamente con la clave pública de la app.
-- - Solo se usan estas funciones:
--     leer_equipo / leer_fotos  → piden el código del enlace (22 caracteres aleatorios).
--     publicar_* / quitar_fotos / dejar_de_compartir → piden además la clave del
--       administrador (32 caracteres aleatorios, guardada solo en su móvil; aquí se
--       guarda cifrada con bcrypt).

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.equipos_compartidos (
  codigo text primary key,
  clave_hash text not null,
  datos jsonb not null,
  actualizado timestamptz not null default now()
);

create table if not exists public.fotos_compartidas (
  codigo text not null references public.equipos_compartidos(codigo) on delete cascade,
  jugador_id text not null,
  hash text not null,
  dato text not null,
  primary key (codigo, jugador_id)
);

alter table public.equipos_compartidos enable row level security;
alter table public.fotos_compartidas enable row level security;

-- ¿La clave es la del administrador de este equipo?
create or replace function public._clave_ok(p_codigo text, p_clave text)
returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (
    select 1 from equipos_compartidos
    where codigo = p_codigo and clave_hash = crypt(p_clave, clave_hash)
  );
$$;

create or replace function public.leer_equipo(p_codigo text)
returns table (datos jsonb, actualizado timestamptz)
language sql stable security definer set search_path = public as $$
  select e.datos, e.actualizado from equipos_compartidos e where e.codigo = p_codigo;
$$;

-- p_tengo: {jugador_id: hash} de las fotos que el móvil ya tiene; esas no se vuelven a mandar.
create or replace function public.leer_fotos(p_codigo text, p_tengo jsonb default '{}'::jsonb)
returns table (jugador_id text, hash text, dato text)
language sql stable security definer set search_path = public as $$
  select f.jugador_id, f.hash, case when p_tengo ->> f.jugador_id = f.hash then null else f.dato end
  from fotos_compartidas f where f.codigo = p_codigo;
$$;

create or replace function public.publicar_equipo(p_codigo text, p_clave text, p_datos jsonb)
returns timestamptz
language plpgsql security definer set search_path = public, extensions as $$
declare
  ahora timestamptz := now();
begin
  if length(p_codigo) < 16 or length(p_clave) < 24 then
    raise exception 'Código o clave demasiado cortos';
  end if;
  if not exists (select 1 from equipos_compartidos where codigo = p_codigo) then
    insert into equipos_compartidos (codigo, clave_hash, datos, actualizado)
    values (p_codigo, crypt(p_clave, gen_salt('bf')), p_datos, ahora);
  elsif _clave_ok(p_codigo, p_clave) then
    update equipos_compartidos set datos = p_datos, actualizado = ahora where codigo = p_codigo;
  else
    raise exception 'Clave incorrecta';
  end if;
  return ahora;
end;
$$;

create or replace function public.publicar_foto(p_codigo text, p_clave text, p_jugador text, p_hash text, p_dato text)
returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not _clave_ok(p_codigo, p_clave) then raise exception 'Clave incorrecta'; end if;
  if length(p_dato) > 3000000 then raise exception 'Foto demasiado grande'; end if;
  insert into fotos_compartidas (codigo, jugador_id, hash, dato)
  values (p_codigo, p_jugador, p_hash, p_dato)
  on conflict (codigo, jugador_id) do update set hash = excluded.hash, dato = excluded.dato;
end;
$$;

create or replace function public.quitar_fotos(p_codigo text, p_clave text, p_mantener text[])
returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not _clave_ok(p_codigo, p_clave) then raise exception 'Clave incorrecta'; end if;
  delete from fotos_compartidas where codigo = p_codigo and not (jugador_id = any (p_mantener));
end;
$$;

create or replace function public.dejar_de_compartir(p_codigo text, p_clave text)
returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not _clave_ok(p_codigo, p_clave) then raise exception 'Clave incorrecta'; end if;
  delete from equipos_compartidos where codigo = p_codigo;
end;
$$;

-- Solo estas funciones se pueden llamar desde la app.
revoke all on function public._clave_ok(text, text) from public, anon, authenticated;
revoke all on function public.leer_equipo(text) from public;
revoke all on function public.leer_fotos(text, jsonb) from public;
revoke all on function public.publicar_equipo(text, text, jsonb) from public;
revoke all on function public.publicar_foto(text, text, text, text, text) from public;
revoke all on function public.quitar_fotos(text, text, text[]) from public;
revoke all on function public.dejar_de_compartir(text, text) from public;
grant execute on function public.leer_equipo(text) to anon, authenticated;
grant execute on function public.leer_fotos(text, jsonb) to anon, authenticated;
grant execute on function public.publicar_equipo(text, text, jsonb) to anon, authenticated;
grant execute on function public.publicar_foto(text, text, text, text, text) to anon, authenticated;
grant execute on function public.quitar_fotos(text, text, text[]) to anon, authenticated;
grant execute on function public.dejar_de_compartir(text, text) to anon, authenticated;

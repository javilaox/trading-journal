-- Enlaces para compartir resultados de backtesting.
--
-- La página que se comparte es un archivo estático, así que NO puede validar nada por sí misma:
-- si los datos viajaran dentro del HTML, la contraseña y el límite de dispositivos serían
-- decorativos (bastaría con mirar el código fuente). Por eso el archivo solo lleva el token, y
-- los datos se piden a esta función, que es la que comprueba la contraseña y el cupo de
-- dispositivos en el servidor. Las tablas no tienen ninguna política pública de lectura.
--
-- Incremental y NO destructivo: solo crea objetos nuevos.

create extension if not exists pgcrypto;

create table if not exists public.backtest_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Backtesting',
  payload jsonb not null,
  password_hash text not null,
  max_devices int not null default 3,
  revoked boolean not null default false,
  opened_count int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists backtest_reports_user_idx on public.backtest_reports(user_id);

-- Un dispositivo = un identificador aleatorio que el visor guarda en el navegador. No es
-- infalible (borrar los datos del navegador cuenta como dispositivo nuevo), pero es lo que
-- permite limitar de forma razonable a cuánta gente llega el enlace.
create table if not exists public.backtest_report_devices (
  report_id uuid not null references public.backtest_reports(id) on delete cascade,
  device_id text not null,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (report_id, device_id)
);

alter table public.backtest_reports enable row level security;
alter table public.backtest_report_devices enable row level security;

-- Solo el dueño gestiona sus enlaces. Nadie puede leer la tabla en abierto: el acceso público
-- pasa exclusivamente por la función de abajo.
drop policy if exists "Owner manages own backtest reports" on public.backtest_reports;
create policy "Owner manages own backtest reports"
  on public.backtest_reports for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Owner reads own report devices" on public.backtest_report_devices;
create policy "Owner reads own report devices"
  on public.backtest_report_devices for select
  to authenticated
  using (
    exists (
      select 1 from public.backtest_reports r
      where r.id = backtest_report_devices.report_id and r.user_id = auth.uid()
    )
  );

-- Crear un enlace. Devuelve el token; la contraseña se hashea aquí y nunca se guarda en claro.
create or replace function public.create_backtest_report(
  p_title text,
  p_payload jsonb,
  p_password text,
  p_max_devices int
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if coalesce(length(p_password), 0) < 6 then
    raise exception 'WEAK_PASSWORD';
  end if;

  insert into public.backtest_reports (user_id, title, payload, password_hash, max_devices)
  values (
    auth.uid(),
    coalesce(nullif(trim(p_title), ''), 'Backtesting'),
    p_payload,
    crypt(p_password, gen_salt('bf')),
    greatest(1, least(coalesce(p_max_devices, 3), 50))
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Abrir un enlace. Valida contraseña y cupo de dispositivos antes de devolver los datos.
-- Los mensajes de error se devuelven dentro del JSON (no como excepción) para que el visor
-- pueda distinguir "contraseña incorrecta" de "límite alcanzado" y explicarlo.
create or replace function public.open_backtest_report(
  p_token uuid,
  p_password text,
  p_device text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  r public.backtest_reports%rowtype;
  v_devices int;
  v_known boolean;
begin
  select * into r from public.backtest_reports where id = p_token;

  if not found or r.revoked then
    return jsonb_build_object('ok', false, 'error', 'NOT_FOUND');
  end if;

  if r.password_hash <> crypt(coalesce(p_password, ''), r.password_hash) then
    return jsonb_build_object('ok', false, 'error', 'BAD_PASSWORD');
  end if;

  if coalesce(trim(p_device), '') = '' then
    return jsonb_build_object('ok', false, 'error', 'NO_DEVICE');
  end if;

  select exists (
    select 1 from public.backtest_report_devices
    where report_id = r.id and device_id = p_device
  ) into v_known;

  if not v_known then
    select count(*) into v_devices from public.backtest_report_devices where report_id = r.id;
    if v_devices >= r.max_devices then
      return jsonb_build_object('ok', false, 'error', 'DEVICE_LIMIT');
    end if;
    insert into public.backtest_report_devices (report_id, device_id)
    values (r.id, p_device)
    on conflict do nothing;
  else
    update public.backtest_report_devices
    set last_seen = now()
    where report_id = r.id and device_id = p_device;
  end if;

  update public.backtest_reports set opened_count = opened_count + 1 where id = r.id;

  return jsonb_build_object(
    'ok', true,
    'title', r.title,
    'created_at', r.created_at,
    'payload', r.payload
  );
end;
$$;

-- El visor es anónimo: necesita poder llamar a la función (y solo a la función).
grant execute on function public.open_backtest_report(uuid, text, text) to anon, authenticated;
grant execute on function public.create_backtest_report(text, jsonb, text, int) to authenticated;

-- Bucket público solo para el archivo del visor. No contiene datos: únicamente el HTML con el
-- token, así que ser público no expone nada por sí mismo.
insert into storage.buckets (id, name, public)
values ('backtest-reports', 'backtest-reports', true)
on conflict (id) do nothing;

drop policy if exists "Public can read backtest report viewers" on storage.objects;
create policy "Public can read backtest report viewers"
  on storage.objects for select
  to public
  using (bucket_id = 'backtest-reports');

drop policy if exists "Users manage own backtest report viewers" on storage.objects;
create policy "Users manage own backtest report viewers"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'backtest-reports' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'backtest-reports' and (storage.foldername(name))[1] = auth.uid()::text);

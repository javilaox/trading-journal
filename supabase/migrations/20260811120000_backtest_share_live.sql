-- Enlaces de backtesting en vivo + imágenes de las operaciones compartidas.
--
-- Antes, `open_backtest_report` devolvía un `payload` congelado en el momento de crear el enlace.
-- Ahora el informe puede ser "en vivo": guarda a qué sesiones apunta y arma el JSON leyendo las
-- tablas en cada apertura, así que refleja lo que haya en ese momento sin volver a compartir.
--
-- Los informes ya creados siguen funcionando: si `live` es false se devuelve su payload tal cual.
--
-- Incremental y NO destructivo: solo añade columnas (opcionales), un bucket y políticas.

alter table public.backtest_reports
  add column if not exists live boolean not null default false;

-- Sesiones incluidas. Vacío = todas las del usuario.
alter table public.backtest_reports
  add column if not exists session_ids bigint[] not null default '{}'::bigint[];

-- Nombres de las métricas checkbox a analizar en el visor.
alter table public.backtest_reports
  add column if not exists metric_names text[] not null default '{}'::text[];

create or replace function public.create_backtest_report(
  p_title text,
  p_payload jsonb,
  p_password text,
  p_max_devices int,
  p_live boolean default false,
  p_session_ids bigint[] default '{}'::bigint[],
  p_metric_names text[] default '{}'::text[]
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

  insert into public.backtest_reports (
    user_id, title, payload, password_hash, max_devices, live, session_ids, metric_names
  )
  values (
    auth.uid(),
    coalesce(nullif(trim(p_title), ''), 'Backtesting'),
    p_payload,
    crypt(p_password, gen_salt('bf')),
    greatest(1, least(coalesce(p_max_devices, 3), 50)),
    coalesce(p_live, false),
    coalesce(p_session_ids, '{}'::bigint[]),
    coalesce(p_metric_names, '{}'::text[])
  )
  returning id into v_id;

  return v_id;
end;
$$;

/*
 * Arma el payload de un informe en vivo leyendo las tablas del dueño.
 *
 * Se seleccionan campo a campo (y no `select *`) a propósito: el informe es público con
 * contraseña, así que no debe salir nada que no se haya decidido compartir. Fuera quedan los
 * precios de entrada/SL/TP y el riesgo en euros; las rutas de imagen sí salen, para que el
 * visor pueda pedirlas al bucket público de informes.
 */
create or replace function public.build_backtest_live_payload(r public.backtest_reports)
returns jsonb
language sql
stable
security definer
set search_path = public, extensions
as $$
  with sel as (
    select t.*
    from public.backtesting_trades t
    where t.user_id = r.user_id
      and (
        cardinality(r.session_ids) = 0
        or t.session_id = any (r.session_ids)
      )
  )
  select jsonb_build_object(
    'trades', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'date', s.date,
        'session_id', s.session_id,
        'asset', s.asset,
        'strategy', s.strategy,
        'direction', s.direction,
        'result', s.result,
        'pnl', s.pnl,
        'rr_planned', s.rr_planned,
        'rr_result', s.rr_result,
        'entry_time', s.entry_time,
        'exit_time', s.exit_time,
        'notes', s.notes,
        'custom_metrics', (s.custom_metrics - 'risk_eur'),
        'image_before', s.image_before,
        'image_after', s.image_after
      ) order by s.date, s.id)
      from sel s
    ), '[]'::jsonb),
    'sessions', coalesce((
      select jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name) order by b.start_date)
      from public.backtesting_sessions b
      where b.user_id = r.user_id
        and (cardinality(r.session_ids) = 0 or b.id = any (r.session_ids))
    ), '[]'::jsonb),
    'metrics', to_jsonb(r.metric_names),
    'capital', (
      select b.account_capital
      from public.backtesting_sessions b
      where b.user_id = r.user_id and cardinality(r.session_ids) = 1 and b.id = r.session_ids[1]
    ),
    'range', (
      select case
        when min(s.date) is null then ''
        else to_char(min(s.date), 'DD-MM-YYYY') || ' – ' || to_char(max(s.date), 'DD-MM-YYYY')
      end
      from sel s
    ),
    'live', true
  );
$$;

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
  v_payload jsonb;
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

  -- En vivo se arma en el momento; si no, se devuelve la copia guardada al compartir.
  v_payload := case when r.live then public.build_backtest_live_payload(r) else r.payload end;

  return jsonb_build_object(
    'ok', true,
    'title', r.title,
    'created_at', r.created_at,
    'live', r.live,
    'payload', v_payload
  );
end;
$$;

grant execute on function public.open_backtest_report(uuid, text, text) to anon, authenticated;
grant execute on function public.create_backtest_report(text, jsonb, text, int, boolean, bigint[], text[]) to authenticated;

-- Imágenes de las operaciones compartidas. Bucket aparte y público: solo se copian aquí las
-- capturas de los informes que se comparten, nunca las del resto de operaciones, que siguen en
-- el bucket privado 'trade-images'. Las rutas son <report_token>/<archivo>, así que al revocar
-- un enlace basta con borrar su carpeta.
insert into storage.buckets (id, name, public)
values ('backtest-report-images', 'backtest-report-images', true)
on conflict (id) do nothing;

drop policy if exists "Public can read shared report images" on storage.objects;
create policy "Public can read shared report images"
  on storage.objects for select
  to public
  using (bucket_id = 'backtest-report-images');

-- Solo el dueño del informe puede subir o borrar en la carpeta de ese informe.
drop policy if exists "Owner manages shared report images" on storage.objects;
create policy "Owner manages shared report images"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'backtest-report-images'
    and exists (
      select 1 from public.backtest_reports r
      where r.user_id = auth.uid()
        and r.id::text = (storage.foldername(name))[1]
    )
  )
  with check (
    bucket_id = 'backtest-report-images'
    and exists (
      select 1 from public.backtest_reports r
      where r.user_id = auth.uid()
        and r.id::text = (storage.foldername(name))[1]
    )
  );

notify pgrst, 'reload schema';

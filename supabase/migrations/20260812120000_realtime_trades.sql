-- Realtime para la tabla de trades: es lo que hace que un trade metido desde el móvil aparezca
-- solo en la aplicación de escritorio, sin tocar nada.
--
-- Supabase publica los cambios de una tabla a través de la publicación `supabase_realtime`. Si
-- la tabla no está en esa publicación, el canal se suscribe sin error pero no llega ningún
-- evento nunca: un fallo silencioso muy difícil de diagnosticar desde la app.
--
-- `replica identity full` hace que en los UPDATE y DELETE viaje también la fila anterior; sin
-- ello, en un DELETE solo llegaría la clave primaria y el filtro por `user_id=eq.<uid>` del
-- cliente descartaría el evento (no tendría user_id contra el que comparar) y la app no se
-- enteraría de los borrados hechos desde el móvil.
--
-- Incremental y NO destructivo: no toca ni una fila de datos.

alter table public.trades replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'trades'
  ) then
    alter publication supabase_realtime add table public.trades;
  end if;
end
$$;

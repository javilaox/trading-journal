-- Bucket privado para las capturas de los trades (reales y de backtesting), de modo que las
-- imágenes se puedan ver desde cualquier ordenador y no solo en el PC donde se subieron.
--
-- Estructura de rutas: <user_id>/<nombre_archivo>
-- El bucket es PRIVADO: el acceso se hace siempre con signed URLs generadas por la app, y las
-- políticas de abajo garantizan que cada usuario solo pueda tocar su propia carpeta.
--
-- Incremental y no destructivo: no toca ninguna tabla de datos.

insert into storage.buckets (id, name, public)
values ('trade-images', 'trade-images', false)
on conflict (id) do nothing;

-- Lectura: solo los archivos que están dentro de la carpeta del propio usuario.
drop policy if exists "Users can read own trade images" on storage.objects;
create policy "Users can read own trade images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'trade-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can upload own trade images" on storage.objects;
create policy "Users can upload own trade images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'trade-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own trade images" on storage.objects;
create policy "Users can update own trade images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'trade-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own trade images" on storage.objects;
create policy "Users can delete own trade images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'trade-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

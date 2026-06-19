-- Storage bucket for product photos (public read, authenticated write).
-- Run after 0001_init.sql.

insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', true)
on conflict (id) do nothing;

create policy "product photos public read"
  on storage.objects for select
  using (bucket_id = 'product-photos');

create policy "product photos authenticated insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-photos');

create policy "product photos authenticated update"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-photos');

create policy "product photos authenticated delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-photos');

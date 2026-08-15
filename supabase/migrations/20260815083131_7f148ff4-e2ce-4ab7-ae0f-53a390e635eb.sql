
drop policy if exists "contact-photos public upload" on storage.objects;

create policy "contact-photos scoped upload"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'contact-photos'
  and lower(storage.extension(name)) in ('jpg','jpeg','png','webp')
  and (
    exists (select 1 from public.contacts c where c.auth_user_id = auth.uid() and c.is_admin = true)
    or public.current_chat_session_contact() is not null
    or (
      (storage.foldername(name))[1] = 'intake'
      and lower(storage.extension(name)) = 'webp'
    )
  )
);

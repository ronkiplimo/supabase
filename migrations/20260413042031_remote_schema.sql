drop extension if exists "pg_net";


  create policy "Admins can delete files"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'ppb-files'::text) AND public.has_admin_access(auth.uid())));



  create policy "Admins can update files"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'ppb-files'::text) AND public.has_admin_access(auth.uid())));



  create policy "Admins can upload files"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'ppb-files'::text) AND public.has_admin_access(auth.uid())));



  create policy "Public can download files"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'ppb-files'::text));




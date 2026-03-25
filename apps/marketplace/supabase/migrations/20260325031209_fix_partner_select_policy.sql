drop policy "partners_select" on "public"."partners";


  create policy "partners_select"
  on "public"."partners"
  as permissive
  for select
  to public
using ((public.is_admin_member() OR (created_by = auth.uid()) OR public.is_partner_member(id) OR public.is_reviewer_member() OR (EXISTS ( SELECT 1
   FROM public.items i
  WHERE ((i.partner_id = partners.id) AND (i.published = true) AND public.item_latest_review_is_approved(i.id))))));




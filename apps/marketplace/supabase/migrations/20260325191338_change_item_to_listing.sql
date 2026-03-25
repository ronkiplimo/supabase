create type "public"."marketplace_initiation_method" as enum ('POST', 'GET');

create type "public"."marketplace_listing_type" as enum ('oauth', 'template');

drop policy "category_items_delete" on "public"."category_items";

drop policy "category_items_insert" on "public"."category_items";

drop policy "category_items_select" on "public"."category_items";

drop policy "category_items_update" on "public"."category_items";

drop policy "item_reviews_delete_reviewer" on "public"."item_reviews";

drop policy "item_reviews_insert_partner_request" on "public"."item_reviews";

drop policy "item_reviews_insert_reviewer" on "public"."item_reviews";

drop policy "item_reviews_select" on "public"."item_reviews";

drop policy "item_reviews_update_reviewer" on "public"."item_reviews";

drop policy "items_delete" on "public"."items";

drop policy "items_insert" on "public"."items";

drop policy "items_select" on "public"."items";

drop policy "items_select_published_with_latest_approved_review" on "public"."items";

drop policy "items_update" on "public"."items";

drop policy "partners_select" on "public"."partners";

revoke delete on table "public"."category_items" from "anon";

revoke insert on table "public"."category_items" from "anon";

revoke references on table "public"."category_items" from "anon";

revoke select on table "public"."category_items" from "anon";

revoke trigger on table "public"."category_items" from "anon";

revoke truncate on table "public"."category_items" from "anon";

revoke update on table "public"."category_items" from "anon";

revoke delete on table "public"."category_items" from "authenticated";

revoke insert on table "public"."category_items" from "authenticated";

revoke references on table "public"."category_items" from "authenticated";

revoke select on table "public"."category_items" from "authenticated";

revoke trigger on table "public"."category_items" from "authenticated";

revoke truncate on table "public"."category_items" from "authenticated";

revoke update on table "public"."category_items" from "authenticated";

revoke delete on table "public"."category_items" from "service_role";

revoke insert on table "public"."category_items" from "service_role";

revoke references on table "public"."category_items" from "service_role";

revoke select on table "public"."category_items" from "service_role";

revoke trigger on table "public"."category_items" from "service_role";

revoke truncate on table "public"."category_items" from "service_role";

revoke update on table "public"."category_items" from "service_role";

revoke delete on table "public"."item_reviews" from "anon";

revoke insert on table "public"."item_reviews" from "anon";

revoke references on table "public"."item_reviews" from "anon";

revoke select on table "public"."item_reviews" from "anon";

revoke trigger on table "public"."item_reviews" from "anon";

revoke truncate on table "public"."item_reviews" from "anon";

revoke update on table "public"."item_reviews" from "anon";

revoke delete on table "public"."item_reviews" from "authenticated";

revoke insert on table "public"."item_reviews" from "authenticated";

revoke references on table "public"."item_reviews" from "authenticated";

revoke select on table "public"."item_reviews" from "authenticated";

revoke trigger on table "public"."item_reviews" from "authenticated";

revoke truncate on table "public"."item_reviews" from "authenticated";

revoke update on table "public"."item_reviews" from "authenticated";

revoke delete on table "public"."item_reviews" from "service_role";

revoke insert on table "public"."item_reviews" from "service_role";

revoke references on table "public"."item_reviews" from "service_role";

revoke select on table "public"."item_reviews" from "service_role";

revoke trigger on table "public"."item_reviews" from "service_role";

revoke truncate on table "public"."item_reviews" from "service_role";

revoke update on table "public"."item_reviews" from "service_role";

revoke delete on table "public"."items" from "anon";

revoke insert on table "public"."items" from "anon";

revoke references on table "public"."items" from "anon";

revoke select on table "public"."items" from "anon";

revoke trigger on table "public"."items" from "anon";

revoke truncate on table "public"."items" from "anon";

revoke update on table "public"."items" from "anon";

revoke delete on table "public"."items" from "authenticated";

revoke insert on table "public"."items" from "authenticated";

revoke references on table "public"."items" from "authenticated";

revoke select on table "public"."items" from "authenticated";

revoke trigger on table "public"."items" from "authenticated";

revoke truncate on table "public"."items" from "authenticated";

revoke update on table "public"."items" from "authenticated";

revoke delete on table "public"."items" from "service_role";

revoke insert on table "public"."items" from "service_role";

revoke references on table "public"."items" from "service_role";

revoke select on table "public"."items" from "service_role";

revoke trigger on table "public"."items" from "service_role";

revoke truncate on table "public"."items" from "service_role";

revoke update on table "public"."items" from "service_role";

alter table "public"."category_items" drop constraint "category_items_category_id_fkey";

alter table "public"."category_items" drop constraint "category_items_item_id_fkey";

alter table "public"."item_reviews" drop constraint "item_reviews_item_id_fkey";

alter table "public"."item_reviews" drop constraint "item_reviews_reviewed_by_fkey";

alter table "public"."items" drop constraint "items_partner_id_fkey";

alter table "public"."items" drop constraint "items_slug_format";

alter table "public"."items" drop constraint "items_slug_key";

alter table "public"."items" drop constraint "items_submitted_by_fkey";

alter table "public"."items" drop constraint "items_type_destination_check";

drop function if exists "public"."item_latest_review_is_approved"(target_item_id bigint);

drop function if exists "public"."storage_object_item_id"(object_name text) CASCADE;

alter table "public"."category_items" drop constraint "category_items_pkey";

alter table "public"."item_reviews" drop constraint "item_reviews_pkey";

alter table "public"."items" drop constraint "items_pkey";

drop index if exists "public"."category_items_item_id_idx";

drop index if exists "public"."category_items_pkey";

drop index if exists "public"."item_reviews_featured_idx";

drop index if exists "public"."item_reviews_pkey";

drop index if exists "public"."item_reviews_status_idx";

drop index if exists "public"."items_partner_id_idx";

drop index if exists "public"."items_pkey";

drop index if exists "public"."items_slug_key";

drop index if exists "public"."items_type_idx";

drop table "public"."category_items";

drop table "public"."item_reviews";

drop table "public"."items";


  create table "public"."category_listings" (
    "category_id" bigint not null,
    "listing_id" bigint not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."category_listings" enable row level security;


  create table "public"."listing_reviews" (
    "listing_id" bigint not null,
    "status" public.marketplace_review_status not null default 'pending_review'::public.marketplace_review_status,
    "featured" boolean not null default false,
    "reviewed_by" uuid,
    "reviewed_at" timestamp with time zone,
    "review_notes" text,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."listing_reviews" enable row level security;


  create table "public"."listings" (
    "id" bigint generated always as identity not null,
    "partner_id" bigint not null,
    "slug" text not null,
    "title" text not null,
    "summary" text,
    "content" text,
    "published" boolean not null default false,
    "type" public.marketplace_listing_type not null,
    "url" text,
    "registry_listing_url" text,
    "files" text[] not null default '{}'::text[],
    "documentation_url" text,
    "initiation_action_url" text,
    "initiation_action_method" public.marketplace_initiation_method,
    "submitted_by" uuid default auth.uid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."listings" enable row level security;

drop type "public"."marketplace_item_type";

CREATE INDEX category_listings_listing_id_idx ON public.category_listings USING btree (listing_id);

CREATE UNIQUE INDEX category_listings_pkey ON public.category_listings USING btree (category_id, listing_id);

CREATE INDEX listing_reviews_featured_idx ON public.listing_reviews USING btree (featured) WHERE (featured = true);

CREATE UNIQUE INDEX listing_reviews_pkey ON public.listing_reviews USING btree (listing_id);

CREATE INDEX listing_reviews_status_idx ON public.listing_reviews USING btree (status);

CREATE INDEX listings_partner_id_idx ON public.listings USING btree (partner_id);

CREATE UNIQUE INDEX listings_pkey ON public.listings USING btree (id);

CREATE UNIQUE INDEX listings_slug_key ON public.listings USING btree (slug);

CREATE INDEX listings_type_idx ON public.listings USING btree (type);

alter table "public"."category_listings" add constraint "category_listings_pkey" PRIMARY KEY using index "category_listings_pkey";

alter table "public"."listing_reviews" add constraint "listing_reviews_pkey" PRIMARY KEY using index "listing_reviews_pkey";

alter table "public"."listings" add constraint "listings_pkey" PRIMARY KEY using index "listings_pkey";

alter table "public"."category_listings" add constraint "category_listings_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE not valid;

alter table "public"."category_listings" validate constraint "category_listings_category_id_fkey";

alter table "public"."category_listings" add constraint "category_listings_listing_id_fkey" FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE not valid;

alter table "public"."category_listings" validate constraint "category_listings_listing_id_fkey";

alter table "public"."listing_reviews" add constraint "listing_reviews_listing_id_fkey" FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE not valid;

alter table "public"."listing_reviews" validate constraint "listing_reviews_listing_id_fkey";

alter table "public"."listing_reviews" add constraint "listing_reviews_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."listing_reviews" validate constraint "listing_reviews_reviewed_by_fkey";

alter table "public"."listings" add constraint "listings_initiation_action_check" CHECK ((((initiation_action_url IS NULL) AND (initiation_action_method IS NULL)) OR ((initiation_action_url IS NOT NULL) AND (initiation_action_method IS NOT NULL)))) not valid;

alter table "public"."listings" validate constraint "listings_initiation_action_check";

alter table "public"."listings" add constraint "listings_partner_id_fkey" FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE not valid;

alter table "public"."listings" validate constraint "listings_partner_id_fkey";

alter table "public"."listings" add constraint "listings_slug_format" CHECK ((slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text)) not valid;

alter table "public"."listings" validate constraint "listings_slug_format";

alter table "public"."listings" add constraint "listings_slug_key" UNIQUE using index "listings_slug_key";

alter table "public"."listings" add constraint "listings_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."listings" validate constraint "listings_submitted_by_fkey";

alter table "public"."listings" add constraint "listings_type_destination_check" CHECK ((((type = 'oauth'::public.marketplace_listing_type) AND (registry_listing_url IS NULL) AND ((published = false) OR (url IS NOT NULL))) OR ((type = 'template'::public.marketplace_listing_type) AND (url IS NULL) AND ((published = false) OR (registry_listing_url IS NOT NULL))))) not valid;

alter table "public"."listings" validate constraint "listings_type_destination_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.listing_latest_review_is_approved(target_listing_id bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(
    (
      select lr.status = 'approved'
      from public.listing_reviews lr
      where lr.listing_id = target_listing_id
      order by coalesce(lr.reviewed_at, lr.updated_at, lr.created_at) desc
      limit 1
    ),
    false
  );
$function$
;

CREATE OR REPLACE FUNCTION public.storage_object_listing_id(object_name text)
 RETURNS bigint
 LANGUAGE sql
 STABLE
AS $function$
  select case
    when split_part(object_name, '/', 3) ~ '^[0-9]+$' then split_part(object_name, '/', 3)::bigint
    else null
  end;
$function$
;

grant delete on table "public"."category_listings" to "anon";

grant insert on table "public"."category_listings" to "anon";

grant references on table "public"."category_listings" to "anon";

grant select on table "public"."category_listings" to "anon";

grant trigger on table "public"."category_listings" to "anon";

grant truncate on table "public"."category_listings" to "anon";

grant update on table "public"."category_listings" to "anon";

grant delete on table "public"."category_listings" to "authenticated";

grant insert on table "public"."category_listings" to "authenticated";

grant references on table "public"."category_listings" to "authenticated";

grant select on table "public"."category_listings" to "authenticated";

grant trigger on table "public"."category_listings" to "authenticated";

grant truncate on table "public"."category_listings" to "authenticated";

grant update on table "public"."category_listings" to "authenticated";

grant delete on table "public"."category_listings" to "service_role";

grant insert on table "public"."category_listings" to "service_role";

grant references on table "public"."category_listings" to "service_role";

grant select on table "public"."category_listings" to "service_role";

grant trigger on table "public"."category_listings" to "service_role";

grant truncate on table "public"."category_listings" to "service_role";

grant update on table "public"."category_listings" to "service_role";

grant delete on table "public"."listing_reviews" to "anon";

grant insert on table "public"."listing_reviews" to "anon";

grant references on table "public"."listing_reviews" to "anon";

grant select on table "public"."listing_reviews" to "anon";

grant trigger on table "public"."listing_reviews" to "anon";

grant truncate on table "public"."listing_reviews" to "anon";

grant update on table "public"."listing_reviews" to "anon";

grant delete on table "public"."listing_reviews" to "authenticated";

grant insert on table "public"."listing_reviews" to "authenticated";

grant references on table "public"."listing_reviews" to "authenticated";

grant select on table "public"."listing_reviews" to "authenticated";

grant trigger on table "public"."listing_reviews" to "authenticated";

grant truncate on table "public"."listing_reviews" to "authenticated";

grant update on table "public"."listing_reviews" to "authenticated";

grant delete on table "public"."listing_reviews" to "service_role";

grant insert on table "public"."listing_reviews" to "service_role";

grant references on table "public"."listing_reviews" to "service_role";

grant select on table "public"."listing_reviews" to "service_role";

grant trigger on table "public"."listing_reviews" to "service_role";

grant truncate on table "public"."listing_reviews" to "service_role";

grant update on table "public"."listing_reviews" to "service_role";

grant delete on table "public"."listings" to "anon";

grant insert on table "public"."listings" to "anon";

grant references on table "public"."listings" to "anon";

grant select on table "public"."listings" to "anon";

grant trigger on table "public"."listings" to "anon";

grant truncate on table "public"."listings" to "anon";

grant update on table "public"."listings" to "anon";

grant delete on table "public"."listings" to "authenticated";

grant insert on table "public"."listings" to "authenticated";

grant references on table "public"."listings" to "authenticated";

grant select on table "public"."listings" to "authenticated";

grant trigger on table "public"."listings" to "authenticated";

grant truncate on table "public"."listings" to "authenticated";

grant update on table "public"."listings" to "authenticated";

grant delete on table "public"."listings" to "service_role";

grant insert on table "public"."listings" to "service_role";

grant references on table "public"."listings" to "service_role";

grant select on table "public"."listings" to "service_role";

grant trigger on table "public"."listings" to "service_role";

grant truncate on table "public"."listings" to "service_role";

grant update on table "public"."listings" to "service_role";


  create policy "category_listings_delete"
  on "public"."category_listings"
  as permissive
  for delete
  to public
using ((public.is_admin_member() OR public.is_reviewer_member() OR (EXISTS ( SELECT 1
   FROM public.listings l
  WHERE ((l.id = category_listings.listing_id) AND public.is_partner_member(l.partner_id))))));



  create policy "category_listings_insert"
  on "public"."category_listings"
  as permissive
  for insert
  to public
with check ((public.is_admin_member() OR public.is_reviewer_member() OR (EXISTS ( SELECT 1
   FROM public.listings l
  WHERE ((l.id = category_listings.listing_id) AND public.is_partner_member(l.partner_id))))));



  create policy "category_listings_select"
  on "public"."category_listings"
  as permissive
  for select
  to public
using ((public.is_admin_member() OR public.is_reviewer_member() OR (EXISTS ( SELECT 1
   FROM public.listings l
  WHERE ((l.id = category_listings.listing_id) AND (l.published = true) AND public.listing_latest_review_is_approved(l.id)))) OR (EXISTS ( SELECT 1
   FROM public.listings l
  WHERE ((l.id = category_listings.listing_id) AND public.is_partner_member(l.partner_id))))));



  create policy "category_listings_update"
  on "public"."category_listings"
  as permissive
  for update
  to public
using ((public.is_admin_member() OR public.is_reviewer_member() OR (EXISTS ( SELECT 1
   FROM public.listings l
  WHERE ((l.id = category_listings.listing_id) AND public.is_partner_member(l.partner_id))))))
with check ((public.is_admin_member() OR public.is_reviewer_member() OR (EXISTS ( SELECT 1
   FROM public.listings l
  WHERE ((l.id = category_listings.listing_id) AND public.is_partner_member(l.partner_id))))));



  create policy "listing_reviews_delete_reviewer"
  on "public"."listing_reviews"
  as permissive
  for delete
  to public
using (public.is_review_manager_member());



  create policy "listing_reviews_insert_partner_request"
  on "public"."listing_reviews"
  as permissive
  for insert
  to public
with check (((EXISTS ( SELECT 1
   FROM public.listings l
  WHERE ((l.id = listing_reviews.listing_id) AND public.is_partner_member(l.partner_id)))) AND (status = 'pending_review'::public.marketplace_review_status) AND (featured = false) AND (reviewed_by IS NULL) AND (reviewed_at IS NULL) AND (review_notes IS NULL) AND (published_at IS NULL)));



  create policy "listing_reviews_insert_reviewer"
  on "public"."listing_reviews"
  as permissive
  for insert
  to public
with check (public.is_review_manager_member());



  create policy "listing_reviews_select"
  on "public"."listing_reviews"
  as permissive
  for select
  to public
using ((public.is_admin_member() OR public.is_reviewer_member() OR (EXISTS ( SELECT 1
   FROM public.listings l
  WHERE ((l.id = listing_reviews.listing_id) AND public.is_partner_member(l.partner_id))))));



  create policy "listing_reviews_update_reviewer"
  on "public"."listing_reviews"
  as permissive
  for update
  to public
using (public.is_review_manager_member())
with check (public.is_review_manager_member());



  create policy "listings_delete"
  on "public"."listings"
  as permissive
  for delete
  to public
using ((public.is_admin_member() OR public.is_partner_member(partner_id)));



  create policy "listings_insert"
  on "public"."listings"
  as permissive
  for insert
  to public
with check ((public.is_admin_member() OR (public.is_partner_member(partner_id) AND (submitted_by = auth.uid()))));



  create policy "listings_select"
  on "public"."listings"
  as permissive
  for select
  to public
using ((public.is_admin_member() OR public.is_partner_member(partner_id) OR public.is_reviewer_member()));



  create policy "listings_select_published_with_latest_approved_review"
  on "public"."listings"
  as permissive
  for select
  to public
using (((published = true) AND public.listing_latest_review_is_approved(id)));



  create policy "listings_update"
  on "public"."listings"
  as permissive
  for update
  to public
using ((public.is_admin_member() OR public.is_partner_member(partner_id)))
with check ((public.is_admin_member() OR public.is_partner_member(partner_id)));



  create policy "partners_select"
  on "public"."partners"
  as permissive
  for select
  to public
using ((public.is_admin_member() OR (created_by = auth.uid()) OR public.is_partner_member(id) OR public.is_reviewer_member() OR (EXISTS ( SELECT 1
   FROM public.listings l
  WHERE ((l.partner_id = partners.id) AND (l.published = true) AND public.listing_latest_review_is_approved(l.id))))));


drop policy IF EXISTS "item_files_storage_delete" on "storage"."objects";

drop policy IF EXISTS "item_files_storage_insert" on "storage"."objects";

drop policy IF EXISTS "item_files_storage_select" on "storage"."objects";

drop policy IF EXISTS "item_files_storage_update" on "storage"."objects";


  create policy "listing_files_storage_delete"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'listing_files'::text) AND (split_part(name, '/'::text, 2) = 'listings'::text) AND (public.storage_object_partner_id(name) IS NOT NULL) AND (public.storage_object_listing_id(name) IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.listings l
  WHERE ((l.id = public.storage_object_listing_id(objects.name)) AND (l.partner_id = public.storage_object_partner_id(objects.name)) AND (public.is_admin_member() OR public.is_partner_member(l.partner_id)))))));



  create policy "listing_files_storage_insert"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'listing_files'::text) AND (split_part(name, '/'::text, 2) = 'listings'::text) AND (public.storage_object_partner_id(name) IS NOT NULL) AND (public.storage_object_listing_id(name) IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.listings l
  WHERE ((l.id = public.storage_object_listing_id(objects.name)) AND (l.partner_id = public.storage_object_partner_id(objects.name)) AND (public.is_admin_member() OR public.is_partner_member(l.partner_id)))))));



  create policy "listing_files_storage_select"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'listing_files'::text) AND (split_part(name, '/'::text, 2) = 'listings'::text) AND (public.storage_object_partner_id(name) IS NOT NULL) AND (public.storage_object_listing_id(name) IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.listings l
  WHERE ((l.id = public.storage_object_listing_id(objects.name)) AND (l.partner_id = public.storage_object_partner_id(objects.name)) AND (public.is_admin_member() OR public.is_review_manager_member() OR public.is_partner_member(l.partner_id)))))));



  create policy "listing_files_storage_update"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'listing_files'::text) AND (split_part(name, '/'::text, 2) = 'listings'::text) AND (public.storage_object_partner_id(name) IS NOT NULL) AND (public.storage_object_listing_id(name) IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.listings l
  WHERE ((l.id = public.storage_object_listing_id(objects.name)) AND (l.partner_id = public.storage_object_partner_id(objects.name)) AND (public.is_admin_member() OR public.is_partner_member(l.partner_id)))))))
with check (((bucket_id = 'listing_files'::text) AND (split_part(name, '/'::text, 2) = 'listings'::text) AND (public.storage_object_partner_id(name) IS NOT NULL) AND (public.storage_object_listing_id(name) IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.listings l
  WHERE ((l.id = public.storage_object_listing_id(objects.name)) AND (l.partner_id = public.storage_object_partner_id(objects.name)) AND (public.is_admin_member() OR public.is_partner_member(l.partner_id)))))));




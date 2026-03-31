  create table "public"."listing_initiation_configs" (
    "listing_id" bigint not null,
    "signing_key_pem" text not null,
    "key_id" text not null,
    "audience" text not null,
    "issuer" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."listing_initiation_configs" enable row level security;

alter table "public"."listings" drop column "registry_item_url";

CREATE UNIQUE INDEX listing_initiation_configs_pkey ON public.listing_initiation_configs USING btree (listing_id);

alter table "public"."listing_initiation_configs" add constraint "listing_initiation_configs_pkey" PRIMARY KEY using index "listing_initiation_configs_pkey";

alter table "public"."listing_initiation_configs" add constraint "listing_initiation_configs_listing_id_fkey" FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE not valid;

alter table "public"."listing_initiation_configs" validate constraint "listing_initiation_configs_listing_id_fkey";

alter table "public"."listings" add constraint "listings_type_destination_check" CHECK ((((type = 'oauth'::public.marketplace_listing_type) AND (registry_listing_url IS NULL) AND ((published = false) OR (url IS NOT NULL))) OR ((type = 'template'::public.marketplace_listing_type) AND (url IS NULL) AND ((published = false) OR (registry_listing_url IS NOT NULL))))) not valid;

alter table "public"."listings" validate constraint "listings_type_destination_check";



grant delete on table "public"."listing_initiation_configs" to "anon";

grant insert on table "public"."listing_initiation_configs" to "anon";

grant references on table "public"."listing_initiation_configs" to "anon";

grant select on table "public"."listing_initiation_configs" to "anon";

grant trigger on table "public"."listing_initiation_configs" to "anon";

grant truncate on table "public"."listing_initiation_configs" to "anon";

grant update on table "public"."listing_initiation_configs" to "anon";

grant delete on table "public"."listing_initiation_configs" to "authenticated";

grant insert on table "public"."listing_initiation_configs" to "authenticated";

grant references on table "public"."listing_initiation_configs" to "authenticated";

grant select on table "public"."listing_initiation_configs" to "authenticated";

grant trigger on table "public"."listing_initiation_configs" to "authenticated";

grant truncate on table "public"."listing_initiation_configs" to "authenticated";

grant update on table "public"."listing_initiation_configs" to "authenticated";

grant delete on table "public"."listing_initiation_configs" to "service_role";

grant insert on table "public"."listing_initiation_configs" to "service_role";

grant references on table "public"."listing_initiation_configs" to "service_role";

grant select on table "public"."listing_initiation_configs" to "service_role";

grant trigger on table "public"."listing_initiation_configs" to "service_role";

grant truncate on table "public"."listing_initiation_configs" to "service_role";

grant update on table "public"."listing_initiation_configs" to "service_role";

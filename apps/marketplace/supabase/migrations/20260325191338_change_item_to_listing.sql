-- New enum types
CREATE TYPE "public"."marketplace_initiation_method" AS ENUM ('POST', 'GET');
-- CREATE TYPE "public"."marketplace_listing_type" AS ENUM ('oauth', 'template');

-- Rename tables
ALTER TABLE "public"."items" RENAME TO "listings";
ALTER TABLE "public"."category_items" RENAME TO "category_listings";
ALTER TABLE "public"."item_reviews" RENAME TO "listing_reviews";

-- Rename columns that referenced "item"
ALTER TABLE "public"."category_listings" RENAME COLUMN "item_id" TO "listing_id";
ALTER TABLE "public"."listing_reviews" RENAME COLUMN "item_id" TO "listing_id";

-- Drop constraints that reference the old enum type
-- ALTER TABLE "public"."listings" DROP CONSTRAINT IF EXISTS "items_type_destination_check";

-- Rename the old enum type and replace it
ALTER TYPE "public"."marketplace_item_type" RENAME TO "marketplace_listing_type";
-- ALTER TABLE "public"."listings" ALTER COLUMN "type" TYPE "public"."marketplace_listing_type" USING "type"::text::"public"."marketplace_listing_type";
-- DROP TYPE "public"."marketplace_item_type_old";

-- Add new columns to listings
ALTER TABLE "public"."listings"
  ADD COLUMN "registry_listing_url" text,
  ADD COLUMN "initiation_action_url" text,
  ADD COLUMN "initiation_action_method" public.marketplace_initiation_method;

-- Drop old constraints that will be replaced
-- ALTER TABLE "public"."listings" DROP CONSTRAINT IF EXISTS "items_slug_format";
ALTER TABLE "public"."listings" RENAME CONSTRAINT "items_slug_format" TO "listings_slug_format";
ALTER TABLE "public"."listings" RENAME CONSTRAINT "items_type_destination_check" TO "listings_type_destination_check";

ALTER TABLE "public"."listings"
  ADD CONSTRAINT "listings_initiation_action_check" CHECK (
    (initiation_action_url IS NULL AND initiation_action_method IS NULL) OR
    (initiation_action_url IS NOT NULL AND initiation_action_method IS NOT NULL)
  );


-- Rename indexes (Postgres renames PK indexes automatically with table rename, but others need manual rename)
ALTER INDEX IF EXISTS "public"."category_items_item_id_idx" RENAME TO "category_listings_listing_id_idx";
ALTER INDEX IF EXISTS "public"."category_items_pkey" RENAME TO "category_listings_pkey";
ALTER INDEX IF EXISTS "public"."item_reviews_featured_idx" RENAME TO "listing_reviews_featured_idx";
ALTER INDEX IF EXISTS "public"."item_reviews_pkey" RENAME TO "listing_reviews_pkey";
ALTER INDEX IF EXISTS "public"."item_reviews_status_idx" RENAME TO "listing_reviews_status_idx";
ALTER INDEX IF EXISTS "public"."items_partner_id_idx" RENAME TO "listings_partner_id_idx";
ALTER INDEX IF EXISTS "public"."items_pkey" RENAME TO "listings_pkey";
ALTER INDEX IF EXISTS "public"."items_slug_key" RENAME TO "listings_slug_key";
ALTER INDEX IF EXISTS "public"."items_type_idx" RENAME TO "listings_type_idx";

-- Rename foreign key constraints
ALTER TABLE "public"."category_listings" RENAME CONSTRAINT "category_items_category_id_fkey" TO "category_listings_category_id_fkey";
ALTER TABLE "public"."category_listings" RENAME CONSTRAINT "category_items_item_id_fkey" TO "category_listings_listing_id_fkey";
ALTER TABLE "public"."listing_reviews" RENAME CONSTRAINT "item_reviews_item_id_fkey" TO "listing_reviews_listing_id_fkey";
ALTER TABLE "public"."listing_reviews" RENAME CONSTRAINT "item_reviews_reviewed_by_fkey" TO "listing_reviews_reviewed_by_fkey";
ALTER TABLE "public"."listings" RENAME CONSTRAINT "items_partner_id_fkey" TO "listings_partner_id_fkey";
ALTER TABLE "public"."listings" RENAME CONSTRAINT "items_submitted_by_fkey" TO "listings_submitted_by_fkey";

-- Rename functions
ALTER FUNCTION public.item_latest_review_is_approved(bigint) RENAME TO listing_latest_review_is_approved;
ALTER FUNCTION public.storage_object_item_id(text) RENAME TO storage_object_listing_id;

-- Rename RLS policies after table and column renames
-- category_listings policies
ALTER POLICY "category_items_delete" ON "public"."category_listings" RENAME TO "category_listings_delete";
ALTER POLICY "category_items_insert" ON "public"."category_listings" RENAME TO "category_listings_insert";
ALTER POLICY "category_items_select" ON "public"."category_listings" RENAME TO "category_listings_select";
ALTER POLICY "category_items_update" ON "public"."category_listings" RENAME TO "category_listings_update";

-- listing_reviews policies
ALTER POLICY "item_reviews_delete_reviewer" ON "public"."listing_reviews" RENAME TO "listing_reviews_delete_reviewer";
ALTER POLICY "item_reviews_insert_partner_request" ON "public"."listing_reviews" RENAME TO "listing_reviews_insert_partner_request";
ALTER POLICY "item_reviews_insert_reviewer" ON "public"."listing_reviews" RENAME TO "listing_reviews_insert_reviewer";
ALTER POLICY "item_reviews_select" ON "public"."listing_reviews" RENAME TO "listing_reviews_select";
ALTER POLICY "item_reviews_update_reviewer" ON "public"."listing_reviews" RENAME TO "listing_reviews_update_reviewer";

-- listings policies
ALTER POLICY "items_delete" ON "public"."listings" RENAME TO "listings_delete";
ALTER POLICY "items_insert" ON "public"."listings" RENAME TO "listings_insert";
ALTER POLICY "items_select" ON "public"."listings" RENAME TO "listings_select";
ALTER POLICY "items_select_published_with_latest_approved_review" ON "public"."listings" RENAME TO "listings_select_published_with_latest_approved_review";
ALTER POLICY "items_update" ON "public"."listings" RENAME TO "listings_update";

-- partners_select keeps the same name; referenced objects are updated by the preceding renames

-- Storage policy names are unchanged here because storage.objects is owned by
-- supabase_storage_admin, and this migration runs without that role.
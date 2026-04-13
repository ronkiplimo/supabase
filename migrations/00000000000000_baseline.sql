


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."app_role" AS ENUM (
    'super_admin',
    'editor',
    'viewer'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_dashboard_stats"() RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    stats jsonb;
BEGIN
    SELECT jsonb_build_object(
        'news_count', (SELECT count(*) FROM public.news),
        'downloads_count', (SELECT count(*) FROM public.downloads),
        'alerts_count', (SELECT count(*) FROM public.alerts_recalls WHERE is_active = true),
        'complaints_count', (SELECT count(*) FROM public.complaints WHERE status = 'pending'),
        'recent_news', (SELECT jsonb_agg(t) FROM (SELECT id, title, created_at FROM public.news ORDER BY created_at DESC LIMIT 5) t),
        'recent_complaints', (SELECT jsonb_agg(t) FROM (SELECT id, name, type, created_at FROM public.complaints ORDER BY created_at DESC LIMIT 5) t)
    ) INTO stats;
    RETURN stats;
END;
$$;


ALTER FUNCTION "public"."get_admin_dashboard_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"("_user_id" "uuid") RETURNS "public"."app_role"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
$$;


ALTER FUNCTION "public"."get_user_role"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_admin_access"("_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin', 'editor', 'viewer')
  );
$$;


ALTER FUNCTION "public"."has_admin_access"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."alerts_recalls" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "type" "text" NOT NULL,
    "summary" "text" NOT NULL,
    "pdf_url" "text",
    "affected_products" "text"[],
    "published_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "inn_name" "text",
    "batch_number" "text",
    "manufacturer" "text",
    "product_type" "text",
    "source" "text",
    "safety_communication_type" "text",
    "target_audience" "text",
    CONSTRAINT "alerts_recalls_type_check" CHECK (("type" = ANY (ARRAY['Safety Communication'::"text", 'Rapid Alert'::"text", 'Recall'::"text"])))
);


ALTER TABLE "public"."alerts_recalls" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audience_cards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "icon" "text" DEFAULT 'Users'::"text",
    "links" "jsonb" DEFAULT '[]'::"jsonb",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audience_cards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."board_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "position" "text" NOT NULL,
    "bio" "text",
    "photo_url" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."board_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."careers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "department" "text",
    "location" "text" DEFAULT 'Nairobi, Kenya'::"text",
    "type" "text" DEFAULT 'Full-time'::"text",
    "deadline" "date",
    "description" "text",
    "requirements" "text",
    "pdf_url" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "is_archived" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."careers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."complaints" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "type" "text" NOT NULL,
    "message" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "admin_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "complaints_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'in_review'::"text", 'resolved'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."complaints" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "phone" "text" DEFAULT '+254 709 770 100'::"text",
    "email_general" "text" DEFAULT 'info@ppb.go.ke'::"text",
    "email_webmaster" "text" DEFAULT 'webmaster@ppb.go.ke'::"text",
    "address" "text" DEFAULT 'P.O. Box 27663 – 00506, Nairobi. Lenana Road Opp. DOD'::"text",
    "hours" "text" DEFAULT 'Mon-Fri 8:00 AM - 5:00 PM'::"text",
    "toll_free" "text" DEFAULT '0800 720 855'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."departments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "functions" "text"[],
    "services" "text"[],
    "icon" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."departments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."directorates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "short_description" "text",
    "full_overview" "text",
    "key_functions" "text"[],
    "type" "text",
    "parent_entity" "text",
    "icon" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "directorates_type_check" CHECK (("type" = ANY (ARRAY['Directorate'::"text", 'Department'::"text", 'Unit'::"text"])))
);


ALTER TABLE "public"."directorates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."downloads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "category" "text" NOT NULL,
    "file_path" "text",
    "file_url" "text",
    "tags" "text"[],
    "year" integer DEFAULT (EXTRACT(year FROM "now"()))::integer NOT NULL,
    "download_count" integer DEFAULT 0 NOT NULL,
    "is_published" boolean DEFAULT true NOT NULL,
    "department" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."downloads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."faqs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category" "text" NOT NULL,
    "question" "text" NOT NULL,
    "answer" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_published" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."faqs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."global_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vision_statement" "text" DEFAULT 'To be a centre of excellence in regulation of Pharmacy Profession, Medical Products and Health Technologies.'::"text",
    "avoid_self_medication_text" "text" DEFAULT 'The Pharmacy and Poisons Board (PPB) is concerned over the high level of self-medication among the general public. Self-medication is the selection and use of medicines by individuals to treat self-recognized illnesses or symptoms without medical supervision. Patients should always seek medical advice before using medicines.'::"text",
    "buy_safe_medicines_text" "text" DEFAULT 'Be safe — buy medicines from a licensed pharmacy. Licensed pharmacies are inspected by PPB and meet the required standards for storage, dispensing, and quality of medicines.'::"text",
    "citizen_charter_english_url" "text",
    "citizen_charter_kiswahili_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "show_news_ticker" boolean DEFAULT true
);


ALTER TABLE "public"."global_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hero_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "number" "text" NOT NULL,
    "label" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."hero_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."news" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "excerpt" "text",
    "rich_content" "text",
    "published_at" timestamp with time zone DEFAULT "now"(),
    "image_url" "text",
    "category" "text" DEFAULT 'Announcements'::"text" NOT NULL,
    "is_published" boolean DEFAULT true NOT NULL,
    "meta_description" "text",
    "department" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "category_id" "uuid"
);


ALTER TABLE "public"."news" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."news_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "badge_color" "text" DEFAULT 'bg-primary-subtle text-primary'::"text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."news_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."online_services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "url" "text",
    "icon" "text" DEFAULT 'ExternalLink'::"text",
    "color" "text" DEFAULT 'blue'::"text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_published" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."online_services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quick_actions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "icon" "text" DEFAULT 'ArrowRight'::"text",
    "link_url" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."quick_actions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rapid_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "alert_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "title" "text" NOT NULL,
    "product_type" "text",
    "source" "text",
    "manufacturer" "text",
    "pdf_url" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."rapid_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recalls" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recall_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "reference_number" "text",
    "product_name" "text" NOT NULL,
    "pdf_url" "text",
    "inn_name" "text",
    "batch_number" "text",
    "manufacturer" "text",
    "reasons" "text",
    "status" "text" DEFAULT 'Active'::"text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."recalls" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."regional_offices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "region" "text",
    "address" "text",
    "phone" "text",
    "email" "text",
    "hours" "text" DEFAULT 'Mon-Fri: 8:00 AM - 5:00 PM'::"text",
    "office_type" "text" DEFAULT 'Regional'::"text",
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."regional_offices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."registered_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trade_name" "text" NOT NULL,
    "registration_no" "text",
    "inn_api" "text",
    "dosage_form" "text",
    "strength" "text",
    "manufacturer_mah" "text",
    "local_technical_representative" "text",
    "category" "text",
    "human_vet" "text",
    "registration_date" "text",
    "expiry_date" "text",
    "status" "text",
    "atc_code" "text",
    "product_link" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."registered_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "file_url" "text",
    "category" "text" DEFAULT 'General'::"text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_published" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."resources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."safety_communications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "published_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "title" "text" NOT NULL,
    "product_type" "text",
    "source" "text",
    "communication_type" "text",
    "target_audience" "text",
    "pdf_url" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."safety_communications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stakeholder_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "category" "text" DEFAULT 'Public Notice'::"text" NOT NULL,
    "description" "text",
    "document_url" "text",
    "published_at" timestamp with time zone DEFAULT "now"(),
    "is_published" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."stakeholder_documents" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."unified_publications" AS
 SELECT "downloads"."id",
    "downloads"."title",
    "downloads"."description",
    "downloads"."category",
    "downloads"."file_url",
    "downloads"."year",
    "downloads"."department",
    "downloads"."created_at",
    'download'::"text" AS "type",
    NULL::"text" AS "image_url",
    NULL::"text" AS "slug",
    "downloads"."is_published"
   FROM "public"."downloads"
UNION ALL
 SELECT "news"."id",
    "news"."title",
    "news"."excerpt" AS "description",
    'News & Media'::"text" AS "category",
    ('/news/'::"text" || "news"."slug") AS "file_url",
    (COALESCE(EXTRACT(year FROM "news"."published_at"), EXTRACT(year FROM "news"."created_at")))::integer AS "year",
    COALESCE("news"."department", 'Corporate Communications'::"text") AS "department",
    COALESCE("news"."published_at", "news"."created_at") AS "created_at",
    'news'::"text" AS "type",
    "news"."image_url",
    "news"."slug",
    "news"."is_published"
   FROM "public"."news"
  WHERE ("news"."category" = ANY (ARRAY['Publications'::"text", 'News & Media'::"text"]));


ALTER VIEW "public"."unified_publications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" DEFAULT 'viewer'::"public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."alerts_recalls"
    ADD CONSTRAINT "alerts_recalls_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audience_cards"
    ADD CONSTRAINT "audience_cards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."board_members"
    ADD CONSTRAINT "board_members_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."board_members"
    ADD CONSTRAINT "board_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."careers"
    ADD CONSTRAINT "careers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."complaints"
    ADD CONSTRAINT "complaints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."directorates"
    ADD CONSTRAINT "directorates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."directorates"
    ADD CONSTRAINT "directorates_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."downloads"
    ADD CONSTRAINT "downloads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."faqs"
    ADD CONSTRAINT "faqs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."global_settings"
    ADD CONSTRAINT "global_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hero_stats"
    ADD CONSTRAINT "hero_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."news_categories"
    ADD CONSTRAINT "news_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."news_categories"
    ADD CONSTRAINT "news_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."news_categories"
    ADD CONSTRAINT "news_categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."news"
    ADD CONSTRAINT "news_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."news"
    ADD CONSTRAINT "news_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."online_services"
    ADD CONSTRAINT "online_services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quick_actions"
    ADD CONSTRAINT "quick_actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rapid_alerts"
    ADD CONSTRAINT "rapid_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recalls"
    ADD CONSTRAINT "recalls_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."regional_offices"
    ADD CONSTRAINT "regional_offices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registered_products"
    ADD CONSTRAINT "registered_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resources"
    ADD CONSTRAINT "resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."safety_communications"
    ADD CONSTRAINT "safety_communications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stakeholder_documents"
    ADD CONSTRAINT "stakeholder_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_key" UNIQUE ("user_id");



CREATE INDEX "idx_alerts_active_date" ON "public"."alerts_recalls" USING "btree" ("is_active", "published_at" DESC) WHERE ("is_active" = true);



CREATE INDEX "idx_alerts_type" ON "public"."alerts_recalls" USING "btree" ("type", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_alerts_type_date" ON "public"."alerts_recalls" USING "btree" ("is_active", "type", "published_at" DESC) WHERE ("is_active" = true);



CREATE INDEX "idx_board_members_active_sort" ON "public"."board_members" USING "btree" ("is_active", "sort_order") WHERE ("is_active" = true);



CREATE INDEX "idx_board_sort" ON "public"."board_members" USING "btree" ("is_active", "sort_order") WHERE ("is_active" = true);



CREATE INDEX "idx_careers_active" ON "public"."careers" USING "btree" ("is_active", "sort_order") WHERE ("is_active" = true);



CREATE INDEX "idx_departments_active_sort" ON "public"."directorates" USING "btree" ("is_active", "sort_order") WHERE ("is_active" = true);



CREATE INDEX "idx_departments_slug" ON "public"."directorates" USING "btree" ("slug");



CREATE INDEX "idx_downloads_category_year" ON "public"."downloads" USING "btree" ("is_published", "category", "year" DESC) WHERE ("is_published" = true);



CREATE INDEX "idx_downloads_department" ON "public"."downloads" USING "btree" ("department");



CREATE INDEX "idx_downloads_is_published_created_at" ON "public"."downloads" USING "btree" ("is_published", "created_at" DESC, "id" DESC);



CREATE INDEX "idx_downloads_published_category" ON "public"."downloads" USING "btree" ("is_published", "category", "created_at" DESC) WHERE ("is_published" = true);



CREATE INDEX "idx_downloads_year" ON "public"."downloads" USING "btree" ("year", "is_published") WHERE ("is_published" = true);



CREATE INDEX "idx_faqs_category_sort" ON "public"."faqs" USING "btree" ("is_published", "category", "sort_order") WHERE ("is_published" = true);



CREATE INDEX "idx_faqs_published_category" ON "public"."faqs" USING "btree" ("is_published", "category", "sort_order") WHERE ("is_published" = true);



CREATE INDEX "idx_news_categories_active" ON "public"."news_categories" USING "btree" ("is_active", "sort_order") WHERE ("is_active" = true);



CREATE INDEX "idx_news_categories_name" ON "public"."news_categories" USING "btree" ("name");



CREATE INDEX "idx_news_categories_slug" ON "public"."news_categories" USING "btree" ("slug");



CREATE INDEX "idx_news_category_id" ON "public"."news" USING "btree" ("category_id");



CREATE INDEX "idx_news_category_published" ON "public"."news" USING "btree" ("category_id", "is_published", "published_at" DESC) WHERE ("is_published" = true);



CREATE INDEX "idx_news_category_published_at" ON "public"."news" USING "btree" ("category", "published_at" DESC) WHERE ("is_published" = true);



CREATE INDEX "idx_news_department" ON "public"."news" USING "btree" ("department");



CREATE INDEX "idx_news_fts" ON "public"."news" USING "gin" ("to_tsvector"('"english"'::"regconfig", (("title" || ' '::"text") || COALESCE("excerpt", ''::"text"))));



CREATE INDEX "idx_news_is_published_published_at" ON "public"."news" USING "btree" ("is_published", "published_at" DESC, "id" DESC);



CREATE INDEX "idx_news_list_perf" ON "public"."news" USING "btree" ("is_published", "category", "published_at" DESC) WHERE ("is_published" = true);



CREATE INDEX "idx_news_published_at" ON "public"."news" USING "btree" ("published_at" DESC);



CREATE INDEX "idx_news_published_date" ON "public"."news" USING "btree" ("is_published", "published_at" DESC) WHERE ("is_published" = true);



CREATE INDEX "idx_news_search" ON "public"."news" USING "gin" ("to_tsvector"('"english"'::"regconfig", (("title" || ' '::"text") || COALESCE("excerpt", ''::"text")))) WHERE ("is_published" = true);



CREATE INDEX "idx_news_slug" ON "public"."news" USING "btree" ("slug");



CREATE INDEX "idx_products_category_trade_name" ON "public"."registered_products" USING "btree" ("category", "trade_name", "id");



CREATE INDEX "idx_products_human_vet_trade_name" ON "public"."registered_products" USING "btree" ("human_vet", "trade_name", "id");



CREATE INDEX "idx_products_reg_no" ON "public"."registered_products" USING "gin" ("registration_no" "public"."gin_trgm_ops");



CREATE INDEX "idx_products_search" ON "public"."registered_products" USING "gin" ("to_tsvector"('"english"'::"regconfig", ((((((((COALESCE("trade_name", ''::"text") || ' '::"text") || COALESCE("registration_no", ''::"text")) || ' '::"text") || COALESCE("inn_api", ''::"text")) || ' '::"text") || COALESCE("manufacturer_mah", ''::"text")) || ' '::"text") || COALESCE("atc_code", ''::"text"))));



CREATE INDEX "idx_products_search_composite" ON "public"."registered_products" USING "btree" ("status", "trade_name") WHERE ("status" IS NOT NULL);



CREATE INDEX "idx_products_status_trade_name" ON "public"."registered_products" USING "btree" ("status", "trade_name", "id");



CREATE INDEX "idx_products_trade_name" ON "public"."registered_products" USING "gin" ("trade_name" "public"."gin_trgm_ops");



CREATE INDEX "idx_products_trade_name_id" ON "public"."registered_products" USING "btree" ("trade_name", "id");



CREATE INDEX "idx_registered_products_search" ON "public"."registered_products" USING "gin" ("to_tsvector"('"english"'::"regconfig", ((((((((COALESCE("trade_name", ''::"text") || ' '::"text") || COALESCE("registration_no", ''::"text")) || ' '::"text") || COALESCE("inn_api", ''::"text")) || ' '::"text") || COALESCE("manufacturer_mah", ''::"text")) || ' '::"text") || COALESCE("atc_code", ''::"text"))));



CREATE INDEX "idx_user_roles_user_id" ON "public"."user_roles" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "update_alerts_updated_at" BEFORE UPDATE ON "public"."alerts_recalls" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_audience_cards_updated_at" BEFORE UPDATE ON "public"."audience_cards" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_board_members_updated_at" BEFORE UPDATE ON "public"."board_members" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_careers_updated_at" BEFORE UPDATE ON "public"."careers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_complaints_updated_at" BEFORE UPDATE ON "public"."complaints" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_contacts_updated_at" BEFORE UPDATE ON "public"."contacts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_departments_updated_at" BEFORE UPDATE ON "public"."departments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_directorates_updated_at" BEFORE UPDATE ON "public"."directorates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_downloads_updated_at" BEFORE UPDATE ON "public"."downloads" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_faqs_updated_at" BEFORE UPDATE ON "public"."faqs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_global_settings_updated_at" BEFORE UPDATE ON "public"."global_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_news_categories_updated_at" BEFORE UPDATE ON "public"."news_categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_news_updated_at" BEFORE UPDATE ON "public"."news" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_online_services_updated_at" BEFORE UPDATE ON "public"."online_services" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_quick_actions_updated_at" BEFORE UPDATE ON "public"."quick_actions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_rapid_alerts_updated_at" BEFORE UPDATE ON "public"."rapid_alerts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_recalls_updated_at" BEFORE UPDATE ON "public"."recalls" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_regional_offices_updated_at" BEFORE UPDATE ON "public"."regional_offices" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_registered_products_updated_at" BEFORE UPDATE ON "public"."registered_products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_resources_updated_at" BEFORE UPDATE ON "public"."resources" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_safety_communications_updated_at" BEFORE UPDATE ON "public"."safety_communications" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_stakeholder_documents_updated_at" BEFORE UPDATE ON "public"."stakeholder_documents" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_roles_updated_at" BEFORE UPDATE ON "public"."user_roles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."news"
    ADD CONSTRAINT "news_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."news_categories"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can manage alerts" ON "public"."alerts_recalls" USING ("public"."has_admin_access"("auth"."uid"()));



CREATE POLICY "Admins can manage audience_cards" ON "public"."audience_cards" USING ("public"."has_admin_access"("auth"."uid"()));



CREATE POLICY "Admins can manage board members" ON "public"."board_members" USING ("public"."has_admin_access"("auth"."uid"()));



CREATE POLICY "Admins can manage careers" ON "public"."careers" USING ("public"."has_admin_access"("auth"."uid"()));



CREATE POLICY "Admins can manage categories" ON "public"."news_categories" USING ("public"."has_admin_access"("auth"."uid"()));



CREATE POLICY "Admins can manage complaints" ON "public"."complaints" USING ("public"."has_admin_access"("auth"."uid"()));



CREATE POLICY "Admins can manage contacts" ON "public"."contacts" USING ("public"."has_admin_access"("auth"."uid"()));



CREATE POLICY "Admins can manage departments" ON "public"."departments" USING ("public"."has_admin_access"("auth"."uid"()));



CREATE POLICY "Admins can manage directorates" ON "public"."directorates" USING ("public"."has_admin_access"("auth"."uid"()));



CREATE POLICY "Admins can manage downloads" ON "public"."downloads" USING ("public"."has_admin_access"("auth"."uid"()));



CREATE POLICY "Admins can manage faqs" ON "public"."faqs" USING ("public"."has_admin_access"("auth"."uid"()));



CREATE POLICY "Admins can manage global_settings" ON "public"."global_settings" USING ("public"."has_admin_access"("auth"."uid"()));



CREATE POLICY "Admins can manage hero_stats" ON "public"."hero_stats" USING ("public"."has_admin_access"("auth"."uid"()));



CREATE POLICY "Admins can manage news" ON "public"."news" USING ("public"."has_admin_access"("auth"."uid"()));



CREATE POLICY "Admins can manage online_services" ON "public"."online_services" USING ("public"."has_admin_access"("auth"."uid"()));



CREATE POLICY "Admins can manage quick_actions" ON "public"."quick_actions" USING ("public"."has_admin_access"("auth"."uid"()));



CREATE POLICY "Admins can manage regional offices" ON "public"."regional_offices" USING ("public"."has_admin_access"("auth"."uid"()));



CREATE POLICY "Admins can manage registered products" ON "public"."registered_products" USING ("public"."has_admin_access"("auth"."uid"()));



CREATE POLICY "Admins can manage registered_products" ON "public"."registered_products" USING ("public"."has_admin_access"("auth"."uid"()));



CREATE POLICY "Admins can manage resources" ON "public"."resources" USING ("public"."has_admin_access"("auth"."uid"()));



CREATE POLICY "Admins can manage stakeholder docs" ON "public"."stakeholder_documents" USING ("public"."has_admin_access"("auth"."uid"()));



CREATE POLICY "Admins can update complaints" ON "public"."complaints" FOR UPDATE USING ("public"."has_admin_access"("auth"."uid"()));



CREATE POLICY "Admins can view complaints" ON "public"."complaints" FOR SELECT USING ("public"."has_admin_access"("auth"."uid"()));



CREATE POLICY "Admins manage rapid alerts" ON "public"."rapid_alerts" USING ("public"."has_admin_access"("auth"."uid"()));



CREATE POLICY "Admins manage recalls" ON "public"."recalls" USING ("public"."has_admin_access"("auth"."uid"()));



CREATE POLICY "Admins manage safety communications" ON "public"."safety_communications" USING ("public"."has_admin_access"("auth"."uid"()));



CREATE POLICY "Anyone can submit a complaint" ON "public"."complaints" FOR INSERT WITH CHECK (true);



CREATE POLICY "Public can read active alerts" ON "public"."alerts_recalls" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Public can read active careers" ON "public"."careers" FOR SELECT USING ((("is_active" = true) OR ("is_archived" = true)));



CREATE POLICY "Public can read active categories" ON "public"."news_categories" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Public can read active departments" ON "public"."departments" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Public can read active rapid alerts" ON "public"."rapid_alerts" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Public can read active recalls" ON "public"."recalls" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Public can read active regional offices" ON "public"."regional_offices" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Public can read active safety communications" ON "public"."safety_communications" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Public can read audience_cards" ON "public"."audience_cards" FOR SELECT USING (true);



CREATE POLICY "Public can read board members" ON "public"."board_members" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Public can read contacts" ON "public"."contacts" FOR SELECT USING (true);



CREATE POLICY "Public can read directorates" ON "public"."directorates" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Public can read global_settings" ON "public"."global_settings" FOR SELECT USING (true);



CREATE POLICY "Public can read hero_stats" ON "public"."hero_stats" FOR SELECT USING (true);



CREATE POLICY "Public can read published downloads" ON "public"."downloads" FOR SELECT USING (("is_published" = true));



CREATE POLICY "Public can read published faqs" ON "public"."faqs" FOR SELECT USING (("is_published" = true));



CREATE POLICY "Public can read published news" ON "public"."news" FOR SELECT USING (("is_published" = true));



CREATE POLICY "Public can read published online_services" ON "public"."online_services" FOR SELECT USING (("is_published" = true));



CREATE POLICY "Public can read published resources" ON "public"."resources" FOR SELECT USING (("is_published" = true));



CREATE POLICY "Public can read published stakeholder docs" ON "public"."stakeholder_documents" FOR SELECT USING (("is_published" = true));



CREATE POLICY "Public can read quick_actions" ON "public"."quick_actions" FOR SELECT USING (true);



CREATE POLICY "Public can read registered products" ON "public"."registered_products" FOR SELECT USING (true);



CREATE POLICY "Public can read registered_products" ON "public"."registered_products" FOR SELECT USING (true);



CREATE POLICY "Super admins manage roles" ON "public"."user_roles" USING (("public"."get_user_role"("auth"."uid"()) = 'super_admin'::"public"."app_role"));



CREATE POLICY "Users can view own role" ON "public"."user_roles" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."alerts_recalls" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audience_cards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."board_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."careers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."complaints" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."departments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."directorates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."downloads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."faqs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."global_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hero_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."news" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."news_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."online_services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quick_actions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rapid_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recalls" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."regional_offices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."registered_products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."resources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."safety_communications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stakeholder_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_admin_dashboard_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_dashboard_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_dashboard_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_admin_access"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_admin_access"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_admin_access"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."alerts_recalls" TO "anon";
GRANT ALL ON TABLE "public"."alerts_recalls" TO "authenticated";
GRANT ALL ON TABLE "public"."alerts_recalls" TO "service_role";



GRANT ALL ON TABLE "public"."audience_cards" TO "anon";
GRANT ALL ON TABLE "public"."audience_cards" TO "authenticated";
GRANT ALL ON TABLE "public"."audience_cards" TO "service_role";



GRANT ALL ON TABLE "public"."board_members" TO "anon";
GRANT ALL ON TABLE "public"."board_members" TO "authenticated";
GRANT ALL ON TABLE "public"."board_members" TO "service_role";



GRANT ALL ON TABLE "public"."careers" TO "anon";
GRANT ALL ON TABLE "public"."careers" TO "authenticated";
GRANT ALL ON TABLE "public"."careers" TO "service_role";



GRANT ALL ON TABLE "public"."complaints" TO "anon";
GRANT ALL ON TABLE "public"."complaints" TO "authenticated";
GRANT ALL ON TABLE "public"."complaints" TO "service_role";



GRANT ALL ON TABLE "public"."contacts" TO "anon";
GRANT ALL ON TABLE "public"."contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."contacts" TO "service_role";



GRANT ALL ON TABLE "public"."departments" TO "anon";
GRANT ALL ON TABLE "public"."departments" TO "authenticated";
GRANT ALL ON TABLE "public"."departments" TO "service_role";



GRANT ALL ON TABLE "public"."directorates" TO "anon";
GRANT ALL ON TABLE "public"."directorates" TO "authenticated";
GRANT ALL ON TABLE "public"."directorates" TO "service_role";



GRANT ALL ON TABLE "public"."downloads" TO "anon";
GRANT ALL ON TABLE "public"."downloads" TO "authenticated";
GRANT ALL ON TABLE "public"."downloads" TO "service_role";



GRANT ALL ON TABLE "public"."faqs" TO "anon";
GRANT ALL ON TABLE "public"."faqs" TO "authenticated";
GRANT ALL ON TABLE "public"."faqs" TO "service_role";



GRANT ALL ON TABLE "public"."global_settings" TO "anon";
GRANT ALL ON TABLE "public"."global_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."global_settings" TO "service_role";



GRANT ALL ON TABLE "public"."hero_stats" TO "anon";
GRANT ALL ON TABLE "public"."hero_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."hero_stats" TO "service_role";



GRANT ALL ON TABLE "public"."news" TO "anon";
GRANT ALL ON TABLE "public"."news" TO "authenticated";
GRANT ALL ON TABLE "public"."news" TO "service_role";



GRANT ALL ON TABLE "public"."news_categories" TO "anon";
GRANT ALL ON TABLE "public"."news_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."news_categories" TO "service_role";



GRANT ALL ON TABLE "public"."online_services" TO "anon";
GRANT ALL ON TABLE "public"."online_services" TO "authenticated";
GRANT ALL ON TABLE "public"."online_services" TO "service_role";



GRANT ALL ON TABLE "public"."quick_actions" TO "anon";
GRANT ALL ON TABLE "public"."quick_actions" TO "authenticated";
GRANT ALL ON TABLE "public"."quick_actions" TO "service_role";



GRANT ALL ON TABLE "public"."rapid_alerts" TO "anon";
GRANT ALL ON TABLE "public"."rapid_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."rapid_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."recalls" TO "anon";
GRANT ALL ON TABLE "public"."recalls" TO "authenticated";
GRANT ALL ON TABLE "public"."recalls" TO "service_role";



GRANT ALL ON TABLE "public"."regional_offices" TO "anon";
GRANT ALL ON TABLE "public"."regional_offices" TO "authenticated";
GRANT ALL ON TABLE "public"."regional_offices" TO "service_role";



GRANT ALL ON TABLE "public"."registered_products" TO "anon";
GRANT ALL ON TABLE "public"."registered_products" TO "authenticated";
GRANT ALL ON TABLE "public"."registered_products" TO "service_role";



GRANT ALL ON TABLE "public"."resources" TO "anon";
GRANT ALL ON TABLE "public"."resources" TO "authenticated";
GRANT ALL ON TABLE "public"."resources" TO "service_role";



GRANT ALL ON TABLE "public"."safety_communications" TO "anon";
GRANT ALL ON TABLE "public"."safety_communications" TO "authenticated";
GRANT ALL ON TABLE "public"."safety_communications" TO "service_role";



GRANT ALL ON TABLE "public"."stakeholder_documents" TO "anon";
GRANT ALL ON TABLE "public"."stakeholder_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."stakeholder_documents" TO "service_role";



GRANT ALL ON TABLE "public"."unified_publications" TO "anon";
GRANT ALL ON TABLE "public"."unified_publications" TO "authenticated";
GRANT ALL ON TABLE "public"."unified_publications" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";








import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_products_unit" AS ENUM('kg', 'pcs', 'pack', 'box', 'l');
  CREATE TYPE "public"."enum_products_storage" AS ENUM('frozen', 'chilled', 'fresh', 'dry');
  CREATE TYPE "public"."enum_collections_kind" AS ENUM('cuisine', 'promo', 'season');
  CREATE TYPE "public"."enum_price_agreements_kind" AS ENUM('tender', 'individual');
  CREATE TYPE "public"."enum_customers_segment" AS ENUM('horeca', 'retail', 'wholesale', 'individual');
  CREATE TYPE "public"."enum_customers_status" AS ENUM('pending', 'active', 'blocked');
  CREATE TYPE "public"."enum_buyers_kind" AS ENUM('counterparty', 'partner');
  CREATE TYPE "public"."enum_supplier_applications_status" AS ENUM('new', 'review', 'contract', 'rejected');
  CREATE TYPE "public"."enum_orders_items_price_source" AS ENUM('individual', 'tender', 'price-type', 'guest');
  CREATE TYPE "public"."enum_orders_status" AS ENUM('new', 'accepted', 'picking', 'shipping', 'delivered', 'cancelled');
  CREATE TYPE "public"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_imports_status" AS ENUM('pending', 'done', 'partial', 'failed');
  CREATE TYPE "public"."enum_users_roles" AS ENUM('admin', 'manager', 'content');
  CREATE TABLE "products_prices" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"price_type_id" integer NOT NULL,
  	"value" numeric NOT NULL
  );
  
  CREATE TABLE "products" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"sku" varchar,
  	"brand" varchar,
  	"country" varchar,
  	"category_id" integer NOT NULL,
  	"description" jsonb,
  	"unit" "enum_products_unit" DEFAULT 'kg' NOT NULL,
  	"min_qty" numeric DEFAULT 1,
  	"step" numeric DEFAULT 1,
  	"weight" numeric,
  	"pack_qty" varchar,
  	"shelf_life" varchar,
  	"storage" "enum_products_storage",
  	"is_halal" boolean,
  	"is_vet" boolean,
  	"is_marked" boolean,
  	"stock" numeric DEFAULT 0,
  	"next_delivery" timestamp(3) with time zone,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"slug" varchar,
  	"is_active" boolean DEFAULT true,
  	"guid1c" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "products_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"collections_id" integer,
  	"media_id" integer
  );
  
  CREATE TABLE "categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar,
  	"parent_id" integer,
  	"image_id" integer,
  	"description" jsonb,
  	"sort" numeric DEFAULT 500,
  	"is_visible" boolean DEFAULT true,
  	"guid1c" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "collections" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar,
  	"kind" "enum_collections_kind" DEFAULT 'cuisine',
  	"image_id" integer,
  	"sort" numeric DEFAULT 100,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "price_types" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"is_guest_default" boolean DEFAULT false,
  	"sort" numeric DEFAULT 100,
  	"guid1c" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "price_agreements_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_id" integer NOT NULL,
  	"price" numeric NOT NULL
  );
  
  CREATE TABLE "price_agreements" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"kind" "enum_price_agreements_kind" DEFAULT 'tender' NOT NULL,
  	"group_id" integer,
  	"buyer_id" integer,
  	"valid_from" timestamp(3) with time zone NOT NULL,
  	"valid_to" timestamp(3) with time zone NOT NULL,
  	"guid1c" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "customers_requested_orgs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"inn" varchar NOT NULL,
  	"title" varchar,
  	"kpp" varchar
  );
  
  CREATE TABLE "customers_addresses" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"address" varchar NOT NULL,
  	"comment" varchar
  );
  
  CREATE TABLE "customers_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "customers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"phone" varchar,
  	"segment" "enum_customers_segment" DEFAULT 'horeca' NOT NULL,
  	"status" "enum_customers_status" DEFAULT 'pending',
  	"manager_id" integer,
  	"consent_accepted" boolean,
  	"consent_accepted_at" timestamp(3) with time zone,
  	"guid1c" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "customers_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"buyers_id" integer
  );
  
  CREATE TABLE "buyers_delivery_points" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"address" varchar NOT NULL,
  	"comment" varchar,
  	"guid1c" varchar
  );
  
  CREATE TABLE "buyers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"inn" varchar,
  	"kpp" varchar,
  	"kind" "enum_buyers_kind" DEFAULT 'counterparty',
  	"parent_id" integer,
  	"group_id" integer,
  	"price_type_id" integer,
  	"manager_id" integer,
  	"is_active" boolean DEFAULT true,
  	"guid1c" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "customer_groups" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"note" varchar,
  	"guid1c" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "supplier_applications" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"company" varchar NOT NULL,
  	"inn" varchar NOT NULL,
  	"contact_name" varchar NOT NULL,
  	"phone" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"website" varchar,
  	"assortment" varchar,
  	"offer_id" integer,
  	"consent" boolean DEFAULT false NOT NULL,
  	"status" "enum_supplier_applications_status" DEFAULT 'new',
  	"manager_note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "orders_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_id" integer NOT NULL,
  	"qty" numeric NOT NULL,
  	"price" numeric NOT NULL,
  	"sum" numeric NOT NULL,
  	"title" varchar,
  	"sku" varchar,
  	"price_source" "enum_orders_items_price_source"
  );
  
  CREATE TABLE "orders" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"number" varchar,
  	"customer_id" integer NOT NULL,
  	"buyer_id" integer,
  	"delivery_date" timestamp(3) with time zone NOT NULL,
  	"address" varchar,
  	"delivery_point_guid1_c" varchar,
  	"total" numeric NOT NULL,
  	"comment" varchar,
  	"status" "enum_orders_status" DEFAULT 'new',
  	"exported_to1_c" boolean DEFAULT false,
  	"guid1c" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "pages_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar
  );
  
  CREATE TABLE "pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"lead" varchar,
  	"content" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_pages_v_version_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_lead" varchar,
  	"version_content" jsonb,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumb_url" varchar,
  	"sizes_thumb_width" numeric,
  	"sizes_thumb_height" numeric,
  	"sizes_thumb_mime_type" varchar,
  	"sizes_thumb_filesize" numeric,
  	"sizes_thumb_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_large_url" varchar,
  	"sizes_large_width" numeric,
  	"sizes_large_height" numeric,
  	"sizes_large_mime_type" varchar,
  	"sizes_large_filesize" numeric,
  	"sizes_large_filename" varchar
  );
  
  CREATE TABLE "documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "imports" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"status" "enum_imports_status" DEFAULT 'pending',
  	"summary" varchar,
  	"errors_text" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "users_roles" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_users_roles",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"phone" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" integer,
  	"categories_id" integer,
  	"collections_id" integer,
  	"price_types_id" integer,
  	"price_agreements_id" integer,
  	"customers_id" integer,
  	"buyers_id" integer,
  	"customer_groups_id" integer,
  	"supplier_applications_id" integer,
  	"orders_id" integer,
  	"pages_id" integer,
  	"media_id" integer,
  	"documents_id" integer,
  	"imports_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"customers_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_settings_banners" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL,
  	"title" varchar,
  	"link" varchar
  );
  
  CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"phone" varchar DEFAULT '',
  	"email" varchar,
  	"whatsapp" varchar,
  	"telegram" varchar,
  	"address" varchar,
  	"work_hours" varchar,
  	"requisites" varchar,
  	"order_cutoff" varchar DEFAULT '17:00',
  	"guest_price_type_id" integer,
  	"segments_horeca_min_order_sum" numeric DEFAULT 0,
  	"segments_horeca_default_price_type_id" integer,
  	"segments_horeca_auto_approve" boolean DEFAULT false,
  	"segments_retail_min_order_sum" numeric DEFAULT 0,
  	"segments_retail_default_price_type_id" integer,
  	"segments_retail_auto_approve" boolean DEFAULT false,
  	"segments_wholesale_min_order_sum" numeric DEFAULT 0,
  	"segments_wholesale_default_price_type_id" integer,
  	"segments_wholesale_auto_approve" boolean DEFAULT false,
  	"segments_individual_min_order_sum" numeric DEFAULT 0,
  	"segments_individual_default_price_type_id" integer,
  	"segments_individual_auto_approve" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "products_prices" ADD CONSTRAINT "products_prices_price_type_id_price_types_id_fk" FOREIGN KEY ("price_type_id") REFERENCES "public"."price_types"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_prices" ADD CONSTRAINT "products_prices_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_collections_fk" FOREIGN KEY ("collections_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections" ADD CONSTRAINT "collections_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "price_agreements_items" ADD CONSTRAINT "price_agreements_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "price_agreements_items" ADD CONSTRAINT "price_agreements_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."price_agreements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "price_agreements" ADD CONSTRAINT "price_agreements_group_id_customer_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."customer_groups"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "price_agreements" ADD CONSTRAINT "price_agreements_buyer_id_buyers_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "customers_requested_orgs" ADD CONSTRAINT "customers_requested_orgs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "customers_addresses" ADD CONSTRAINT "customers_addresses_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "customers_sessions" ADD CONSTRAINT "customers_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "customers" ADD CONSTRAINT "customers_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "customers_rels" ADD CONSTRAINT "customers_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "customers_rels" ADD CONSTRAINT "customers_rels_buyers_fk" FOREIGN KEY ("buyers_id") REFERENCES "public"."buyers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "buyers_delivery_points" ADD CONSTRAINT "buyers_delivery_points_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."buyers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "buyers" ADD CONSTRAINT "buyers_parent_id_buyers_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."buyers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "buyers" ADD CONSTRAINT "buyers_group_id_customer_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."customer_groups"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "buyers" ADD CONSTRAINT "buyers_price_type_id_price_types_id_fk" FOREIGN KEY ("price_type_id") REFERENCES "public"."price_types"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "buyers" ADD CONSTRAINT "buyers_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "supplier_applications" ADD CONSTRAINT "supplier_applications_offer_id_documents_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_items" ADD CONSTRAINT "orders_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_items" ADD CONSTRAINT "orders_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_id_buyers_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_faq" ADD CONSTRAINT "pages_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_version_faq" ADD CONSTRAINT "_pages_v_version_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_roles" ADD CONSTRAINT "users_roles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_collections_fk" FOREIGN KEY ("collections_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_price_types_fk" FOREIGN KEY ("price_types_id") REFERENCES "public"."price_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_price_agreements_fk" FOREIGN KEY ("price_agreements_id") REFERENCES "public"."price_agreements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_customers_fk" FOREIGN KEY ("customers_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_buyers_fk" FOREIGN KEY ("buyers_id") REFERENCES "public"."buyers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_customer_groups_fk" FOREIGN KEY ("customer_groups_id") REFERENCES "public"."customer_groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_supplier_applications_fk" FOREIGN KEY ("supplier_applications_id") REFERENCES "public"."supplier_applications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_orders_fk" FOREIGN KEY ("orders_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_documents_fk" FOREIGN KEY ("documents_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_imports_fk" FOREIGN KEY ("imports_id") REFERENCES "public"."imports"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_customers_fk" FOREIGN KEY ("customers_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_banners" ADD CONSTRAINT "site_settings_banners_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_banners" ADD CONSTRAINT "site_settings_banners_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_guest_price_type_id_price_types_id_fk" FOREIGN KEY ("guest_price_type_id") REFERENCES "public"."price_types"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_segments_horeca_default_price_type_id_price_types_id_fk" FOREIGN KEY ("segments_horeca_default_price_type_id") REFERENCES "public"."price_types"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_segments_retail_default_price_type_id_price_types_id_fk" FOREIGN KEY ("segments_retail_default_price_type_id") REFERENCES "public"."price_types"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_segments_wholesale_default_price_type_id_price_types_id_fk" FOREIGN KEY ("segments_wholesale_default_price_type_id") REFERENCES "public"."price_types"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_segments_individual_default_price_type_id_price_types_id_fk" FOREIGN KEY ("segments_individual_default_price_type_id") REFERENCES "public"."price_types"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "products_prices_order_idx" ON "products_prices" USING btree ("_order");
  CREATE INDEX "products_prices_parent_id_idx" ON "products_prices" USING btree ("_parent_id");
  CREATE INDEX "products_prices_price_type_idx" ON "products_prices" USING btree ("price_type_id");
  CREATE INDEX "products_sku_idx" ON "products" USING btree ("sku");
  CREATE INDEX "products_brand_idx" ON "products" USING btree ("brand");
  CREATE INDEX "products_country_idx" ON "products" USING btree ("country");
  CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id");
  CREATE UNIQUE INDEX "products_slug_idx" ON "products" USING btree ("slug");
  CREATE INDEX "products_is_active_idx" ON "products" USING btree ("is_active");
  CREATE UNIQUE INDEX "products_guid1c_idx" ON "products" USING btree ("guid1c");
  CREATE INDEX "products_updated_at_idx" ON "products" USING btree ("updated_at");
  CREATE INDEX "products_created_at_idx" ON "products" USING btree ("created_at");
  CREATE INDEX "products_rels_order_idx" ON "products_rels" USING btree ("order");
  CREATE INDEX "products_rels_parent_idx" ON "products_rels" USING btree ("parent_id");
  CREATE INDEX "products_rels_path_idx" ON "products_rels" USING btree ("path");
  CREATE INDEX "products_rels_collections_id_idx" ON "products_rels" USING btree ("collections_id");
  CREATE INDEX "products_rels_media_id_idx" ON "products_rels" USING btree ("media_id");
  CREATE UNIQUE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");
  CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id");
  CREATE INDEX "categories_image_idx" ON "categories" USING btree ("image_id");
  CREATE UNIQUE INDEX "categories_guid1c_idx" ON "categories" USING btree ("guid1c");
  CREATE INDEX "categories_updated_at_idx" ON "categories" USING btree ("updated_at");
  CREATE INDEX "categories_created_at_idx" ON "categories" USING btree ("created_at");
  CREATE UNIQUE INDEX "collections_slug_idx" ON "collections" USING btree ("slug");
  CREATE INDEX "collections_image_idx" ON "collections" USING btree ("image_id");
  CREATE INDEX "collections_updated_at_idx" ON "collections" USING btree ("updated_at");
  CREATE INDEX "collections_created_at_idx" ON "collections" USING btree ("created_at");
  CREATE UNIQUE INDEX "price_types_guid1c_idx" ON "price_types" USING btree ("guid1c");
  CREATE INDEX "price_types_updated_at_idx" ON "price_types" USING btree ("updated_at");
  CREATE INDEX "price_types_created_at_idx" ON "price_types" USING btree ("created_at");
  CREATE INDEX "price_agreements_items_order_idx" ON "price_agreements_items" USING btree ("_order");
  CREATE INDEX "price_agreements_items_parent_id_idx" ON "price_agreements_items" USING btree ("_parent_id");
  CREATE INDEX "price_agreements_items_product_idx" ON "price_agreements_items" USING btree ("product_id");
  CREATE INDEX "price_agreements_group_idx" ON "price_agreements" USING btree ("group_id");
  CREATE INDEX "price_agreements_buyer_idx" ON "price_agreements" USING btree ("buyer_id");
  CREATE INDEX "price_agreements_valid_from_idx" ON "price_agreements" USING btree ("valid_from");
  CREATE INDEX "price_agreements_valid_to_idx" ON "price_agreements" USING btree ("valid_to");
  CREATE UNIQUE INDEX "price_agreements_guid1c_idx" ON "price_agreements" USING btree ("guid1c");
  CREATE INDEX "price_agreements_updated_at_idx" ON "price_agreements" USING btree ("updated_at");
  CREATE INDEX "price_agreements_created_at_idx" ON "price_agreements" USING btree ("created_at");
  CREATE INDEX "customers_requested_orgs_order_idx" ON "customers_requested_orgs" USING btree ("_order");
  CREATE INDEX "customers_requested_orgs_parent_id_idx" ON "customers_requested_orgs" USING btree ("_parent_id");
  CREATE INDEX "customers_addresses_order_idx" ON "customers_addresses" USING btree ("_order");
  CREATE INDEX "customers_addresses_parent_id_idx" ON "customers_addresses" USING btree ("_parent_id");
  CREATE INDEX "customers_sessions_order_idx" ON "customers_sessions" USING btree ("_order");
  CREATE INDEX "customers_sessions_parent_id_idx" ON "customers_sessions" USING btree ("_parent_id");
  CREATE INDEX "customers_manager_idx" ON "customers" USING btree ("manager_id");
  CREATE INDEX "customers_guid1c_idx" ON "customers" USING btree ("guid1c");
  CREATE INDEX "customers_updated_at_idx" ON "customers" USING btree ("updated_at");
  CREATE INDEX "customers_created_at_idx" ON "customers" USING btree ("created_at");
  CREATE UNIQUE INDEX "customers_email_idx" ON "customers" USING btree ("email");
  CREATE INDEX "customers_rels_order_idx" ON "customers_rels" USING btree ("order");
  CREATE INDEX "customers_rels_parent_idx" ON "customers_rels" USING btree ("parent_id");
  CREATE INDEX "customers_rels_path_idx" ON "customers_rels" USING btree ("path");
  CREATE INDEX "customers_rels_buyers_id_idx" ON "customers_rels" USING btree ("buyers_id");
  CREATE INDEX "buyers_delivery_points_order_idx" ON "buyers_delivery_points" USING btree ("_order");
  CREATE INDEX "buyers_delivery_points_parent_id_idx" ON "buyers_delivery_points" USING btree ("_parent_id");
  CREATE INDEX "buyers_inn_idx" ON "buyers" USING btree ("inn");
  CREATE INDEX "buyers_parent_idx" ON "buyers" USING btree ("parent_id");
  CREATE INDEX "buyers_group_idx" ON "buyers" USING btree ("group_id");
  CREATE INDEX "buyers_price_type_idx" ON "buyers" USING btree ("price_type_id");
  CREATE INDEX "buyers_manager_idx" ON "buyers" USING btree ("manager_id");
  CREATE UNIQUE INDEX "buyers_guid1c_idx" ON "buyers" USING btree ("guid1c");
  CREATE INDEX "buyers_updated_at_idx" ON "buyers" USING btree ("updated_at");
  CREATE INDEX "buyers_created_at_idx" ON "buyers" USING btree ("created_at");
  CREATE UNIQUE INDEX "customer_groups_guid1c_idx" ON "customer_groups" USING btree ("guid1c");
  CREATE INDEX "customer_groups_updated_at_idx" ON "customer_groups" USING btree ("updated_at");
  CREATE INDEX "customer_groups_created_at_idx" ON "customer_groups" USING btree ("created_at");
  CREATE INDEX "supplier_applications_offer_idx" ON "supplier_applications" USING btree ("offer_id");
  CREATE INDEX "supplier_applications_updated_at_idx" ON "supplier_applications" USING btree ("updated_at");
  CREATE INDEX "supplier_applications_created_at_idx" ON "supplier_applications" USING btree ("created_at");
  CREATE INDEX "orders_items_order_idx" ON "orders_items" USING btree ("_order");
  CREATE INDEX "orders_items_parent_id_idx" ON "orders_items" USING btree ("_parent_id");
  CREATE INDEX "orders_items_product_idx" ON "orders_items" USING btree ("product_id");
  CREATE INDEX "orders_number_idx" ON "orders" USING btree ("number");
  CREATE INDEX "orders_customer_idx" ON "orders" USING btree ("customer_id");
  CREATE INDEX "orders_buyer_idx" ON "orders" USING btree ("buyer_id");
  CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");
  CREATE INDEX "orders_guid1c_idx" ON "orders" USING btree ("guid1c");
  CREATE INDEX "orders_updated_at_idx" ON "orders" USING btree ("updated_at");
  CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");
  CREATE INDEX "pages_faq_order_idx" ON "pages_faq" USING btree ("_order");
  CREATE INDEX "pages_faq_parent_id_idx" ON "pages_faq" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");
  CREATE INDEX "pages_updated_at_idx" ON "pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "pages" USING btree ("created_at");
  CREATE INDEX "pages__status_idx" ON "pages" USING btree ("_status");
  CREATE INDEX "_pages_v_version_faq_order_idx" ON "_pages_v_version_faq" USING btree ("_order");
  CREATE INDEX "_pages_v_version_faq_parent_id_idx" ON "_pages_v_version_faq" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_parent_idx" ON "_pages_v" USING btree ("parent_id");
  CREATE INDEX "_pages_v_version_version_slug_idx" ON "_pages_v" USING btree ("version_slug");
  CREATE INDEX "_pages_v_version_version_updated_at_idx" ON "_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_pages_v_version_version_created_at_idx" ON "_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_pages_v_version_version__status_idx" ON "_pages_v" USING btree ("version__status");
  CREATE INDEX "_pages_v_created_at_idx" ON "_pages_v" USING btree ("created_at");
  CREATE INDEX "_pages_v_updated_at_idx" ON "_pages_v" USING btree ("updated_at");
  CREATE INDEX "_pages_v_latest_idx" ON "_pages_v" USING btree ("latest");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumb_sizes_thumb_filename_idx" ON "media" USING btree ("sizes_thumb_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_large_sizes_large_filename_idx" ON "media" USING btree ("sizes_large_filename");
  CREATE INDEX "documents_updated_at_idx" ON "documents" USING btree ("updated_at");
  CREATE INDEX "documents_created_at_idx" ON "documents" USING btree ("created_at");
  CREATE UNIQUE INDEX "documents_filename_idx" ON "documents" USING btree ("filename");
  CREATE INDEX "imports_updated_at_idx" ON "imports" USING btree ("updated_at");
  CREATE INDEX "imports_created_at_idx" ON "imports" USING btree ("created_at");
  CREATE UNIQUE INDEX "imports_filename_idx" ON "imports" USING btree ("filename");
  CREATE INDEX "users_roles_order_idx" ON "users_roles" USING btree ("order");
  CREATE INDEX "users_roles_parent_idx" ON "users_roles" USING btree ("parent_id");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_products_id_idx" ON "payload_locked_documents_rels" USING btree ("products_id");
  CREATE INDEX "payload_locked_documents_rels_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("categories_id");
  CREATE INDEX "payload_locked_documents_rels_collections_id_idx" ON "payload_locked_documents_rels" USING btree ("collections_id");
  CREATE INDEX "payload_locked_documents_rels_price_types_id_idx" ON "payload_locked_documents_rels" USING btree ("price_types_id");
  CREATE INDEX "payload_locked_documents_rels_price_agreements_id_idx" ON "payload_locked_documents_rels" USING btree ("price_agreements_id");
  CREATE INDEX "payload_locked_documents_rels_customers_id_idx" ON "payload_locked_documents_rels" USING btree ("customers_id");
  CREATE INDEX "payload_locked_documents_rels_buyers_id_idx" ON "payload_locked_documents_rels" USING btree ("buyers_id");
  CREATE INDEX "payload_locked_documents_rels_customer_groups_id_idx" ON "payload_locked_documents_rels" USING btree ("customer_groups_id");
  CREATE INDEX "payload_locked_documents_rels_supplier_applications_id_idx" ON "payload_locked_documents_rels" USING btree ("supplier_applications_id");
  CREATE INDEX "payload_locked_documents_rels_orders_id_idx" ON "payload_locked_documents_rels" USING btree ("orders_id");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_documents_id_idx" ON "payload_locked_documents_rels" USING btree ("documents_id");
  CREATE INDEX "payload_locked_documents_rels_imports_id_idx" ON "payload_locked_documents_rels" USING btree ("imports_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_customers_id_idx" ON "payload_preferences_rels" USING btree ("customers_id");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "site_settings_banners_order_idx" ON "site_settings_banners" USING btree ("_order");
  CREATE INDEX "site_settings_banners_parent_id_idx" ON "site_settings_banners" USING btree ("_parent_id");
  CREATE INDEX "site_settings_banners_image_idx" ON "site_settings_banners" USING btree ("image_id");
  CREATE INDEX "site_settings_guest_price_type_idx" ON "site_settings" USING btree ("guest_price_type_id");
  CREATE INDEX "site_settings_segments_horeca_segments_horeca_default_pr_idx" ON "site_settings" USING btree ("segments_horeca_default_price_type_id");
  CREATE INDEX "site_settings_segments_retail_segments_retail_default_pr_idx" ON "site_settings" USING btree ("segments_retail_default_price_type_id");
  CREATE INDEX "site_settings_segments_wholesale_segments_wholesale_defa_idx" ON "site_settings" USING btree ("segments_wholesale_default_price_type_id");
  CREATE INDEX "site_settings_segments_individual_segments_individual_de_idx" ON "site_settings" USING btree ("segments_individual_default_price_type_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "products_prices" CASCADE;
  DROP TABLE "products" CASCADE;
  DROP TABLE "products_rels" CASCADE;
  DROP TABLE "categories" CASCADE;
  DROP TABLE "collections" CASCADE;
  DROP TABLE "price_types" CASCADE;
  DROP TABLE "price_agreements_items" CASCADE;
  DROP TABLE "price_agreements" CASCADE;
  DROP TABLE "customers_requested_orgs" CASCADE;
  DROP TABLE "customers_addresses" CASCADE;
  DROP TABLE "customers_sessions" CASCADE;
  DROP TABLE "customers" CASCADE;
  DROP TABLE "customers_rels" CASCADE;
  DROP TABLE "buyers_delivery_points" CASCADE;
  DROP TABLE "buyers" CASCADE;
  DROP TABLE "customer_groups" CASCADE;
  DROP TABLE "supplier_applications" CASCADE;
  DROP TABLE "orders_items" CASCADE;
  DROP TABLE "orders" CASCADE;
  DROP TABLE "pages_faq" CASCADE;
  DROP TABLE "pages" CASCADE;
  DROP TABLE "_pages_v_version_faq" CASCADE;
  DROP TABLE "_pages_v" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "documents" CASCADE;
  DROP TABLE "imports" CASCADE;
  DROP TABLE "users_roles" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "site_settings_banners" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TYPE "public"."enum_products_unit";
  DROP TYPE "public"."enum_products_storage";
  DROP TYPE "public"."enum_collections_kind";
  DROP TYPE "public"."enum_price_agreements_kind";
  DROP TYPE "public"."enum_customers_segment";
  DROP TYPE "public"."enum_customers_status";
  DROP TYPE "public"."enum_buyers_kind";
  DROP TYPE "public"."enum_supplier_applications_status";
  DROP TYPE "public"."enum_orders_items_price_source";
  DROP TYPE "public"."enum_orders_status";
  DROP TYPE "public"."enum_pages_status";
  DROP TYPE "public"."enum__pages_v_version_status";
  DROP TYPE "public"."enum_imports_status";
  DROP TYPE "public"."enum_users_roles";`)
}

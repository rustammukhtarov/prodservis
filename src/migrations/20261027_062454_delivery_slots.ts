import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_orders_payment_method" AS ENUM('contract', 'cash', 'card', 'online');
  CREATE TABLE "site_settings_delivery_slots" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"code" varchar NOT NULL,
  	"ship_at" varchar NOT NULL,
  	"cutoff_hours" numeric DEFAULT 4
  );
  
  ALTER TABLE "orders" ADD COLUMN "delivery_slot" varchar;
  ALTER TABLE "orders" ADD COLUMN "delivery_slot_title" varchar;
  ALTER TABLE "orders" ADD COLUMN "contact_name" varchar;
  ALTER TABLE "orders" ADD COLUMN "contact_phone" varchar;
  ALTER TABLE "orders" ADD COLUMN "payment_method" "enum_orders_payment_method" DEFAULT 'contract';
  ALTER TABLE "site_settings_delivery_slots" ADD CONSTRAINT "site_settings_delivery_slots_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "site_settings_delivery_slots_order_idx" ON "site_settings_delivery_slots" USING btree ("_order");
  CREATE INDEX "site_settings_delivery_slots_parent_id_idx" ON "site_settings_delivery_slots" USING btree ("_parent_id");
  ALTER TABLE "site_settings" DROP COLUMN "order_cutoff";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "site_settings_delivery_slots" CASCADE;
  ALTER TABLE "site_settings" ADD COLUMN "order_cutoff" varchar DEFAULT '17:00';
  ALTER TABLE "orders" DROP COLUMN "delivery_slot";
  ALTER TABLE "orders" DROP COLUMN "delivery_slot_title";
  ALTER TABLE "orders" DROP COLUMN "contact_name";
  ALTER TABLE "orders" DROP COLUMN "contact_phone";
  ALTER TABLE "orders" DROP COLUMN "payment_method";
  DROP TYPE "public"."enum_orders_payment_method";`)
}

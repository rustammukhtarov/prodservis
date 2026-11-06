import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" ADD COLUMN "segments_horeca_is_open" boolean DEFAULT true;
  ALTER TABLE "site_settings" ADD COLUMN "segments_retail_is_open" boolean DEFAULT true;
  ALTER TABLE "site_settings" ADD COLUMN "segments_wholesale_is_open" boolean DEFAULT true;
  ALTER TABLE "site_settings" ADD COLUMN "segments_individual_is_open" boolean DEFAULT false;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" DROP COLUMN "segments_horeca_is_open";
  ALTER TABLE "site_settings" DROP COLUMN "segments_retail_is_open";
  ALTER TABLE "site_settings" DROP COLUMN "segments_wholesale_is_open";
  ALTER TABLE "site_settings" DROP COLUMN "segments_individual_is_open";`)
}

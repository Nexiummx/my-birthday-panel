import "./env";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL! }),
});
async function main() {
  await prisma.$executeRawUnsafe('DROP INDEX IF EXISTS "invitations_eventId_slug_key"');
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "invitations_slug_key" ON "invitations"("slug")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "invitations_eventId_idx" ON "invitations"("eventId")');
  await prisma.$executeRawUnsafe('DROP INDEX IF EXISTS "events_slug_key"');
  await prisma.$executeRawUnsafe('ALTER TABLE "events" DROP COLUMN IF EXISTS "slug"');
  await prisma.$executeRawUnsafe(`DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20260909100000_eventos_en_la_ruta'`);
  console.log("  migración deshecha");
}
main().finally(() => prisma.$disconnect());

-- Convierte la instalación de un solo evento en una plataforma multi-cuenta.
-- La tabla "events" ya tiene datos, así que ownerId se agrega nullable, se
-- rellena y solo entonces pasa a NOT NULL.

-- 1. Estética de la experiencia pública.
CREATE TYPE "EventTheme" AS ENUM ('BOSQUE', 'VAQUEROS', 'BARBIE', 'DISCO');

-- 2. Cuentas: nombre, cupo de eventos y marca de superadmin.
ALTER TABLE "admin_users"
  ADD COLUMN "name" TEXT,
  ADD COLUMN "eventQuota" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;

-- 3. Eventos: dueño, tema, textos de bienvenida y archivado.
ALTER TABLE "events"
  ADD COLUMN "ownerId" TEXT,
  ADD COLUMN "theme" "EventTheme" NOT NULL DEFAULT 'BOSQUE',
  ADD COLUMN "sealedEyebrow" TEXT,
  ADD COLUMN "sealedHeadline" TEXT,
  ADD COLUMN "sealedCta" TEXT,
  ADD COLUMN "archivedAt" TIMESTAMP(3);

-- 4. Backfill: lo que ya existía queda a nombre de la cuenta más antigua.
--    Si no hubiera ninguna cuenta, el ALTER del paso 5 aborta la transacción
--    antes de dejar la tabla en un estado a medias.
UPDATE "events"
SET "ownerId" = (SELECT "id" FROM "admin_users" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "ownerId" IS NULL;

-- 5. Ya con todas las filas asignadas, el dueño pasa a ser obligatorio.
ALTER TABLE "events" ALTER COLUMN "ownerId" SET NOT NULL;

CREATE INDEX "events_ownerId_idx" ON "events"("ownerId");

ALTER TABLE "events"
  ADD CONSTRAINT "events_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "admin_users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

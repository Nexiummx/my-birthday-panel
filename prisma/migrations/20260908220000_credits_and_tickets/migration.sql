-- Créditos de evento y sistema de tickets.
--
-- El cupo dejaba de contar un evento en cuanto se archivaba, así que un cliente
-- podía pagar una vez y estrenar fiesta cada año: archivar la anterior le
-- devolvía el hueco. A partir de aquí el crédito se consume al crear y no
-- vuelve. Y como la otra vía era editar el evento viejo hasta convertirlo en
-- uno nuevo, la fecha queda anclada a la que tuvo al nacer.

-- ── Créditos ────────────────────────────────────────────────────────────────
ALTER TABLE "admin_users" ADD COLUMN "eventsUsed" INTEGER NOT NULL DEFAULT 0;

-- Lo que ya se creó, ya se consumió.
UPDATE "admin_users" u
SET "eventsUsed" = (SELECT COUNT(*) FROM "events" e WHERE e."ownerId" = u."id");

-- El cupo cambia de significado —de "a la vez" a "en total"—, así que a quien
-- ya tenga más eventos creados que cupo se le acredita lo que usó. Sin esto una
-- cuenta con un evento archivado y otro activo quedaría en números rojos por un
-- cambio de reglas, que no es culpa suya.
UPDATE "admin_users" SET "eventQuota" = "eventsUsed" WHERE "eventsUsed" > "eventQuota";

-- ── Ancla de la fecha ───────────────────────────────────────────────────────
ALTER TABLE "events" ADD COLUMN "originalDate" TIMESTAMP(3);
UPDATE "events" SET "originalDate" = "date";
ALTER TABLE "events" ALTER COLUMN "originalDate" SET NOT NULL;

-- NULL = al evento le queda su cambio de fecha. Los que ya existen empiezan con
-- el suyo intacto: nadie ha gastado todavía algo que no existía.
ALTER TABLE "events" ADD COLUMN "dateChangedAt" TIMESTAMP(3);

-- ── Tickets ─────────────────────────────────────────────────────────────────
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'ANSWERED', 'CLOSED');
CREATE TYPE "TicketCategory" AS ENUM ('DATE_CHANGE', 'BILLING', 'EVENT', 'OTHER');

CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "eventId" TEXT,
    "category" "TicketCategory" NOT NULL DEFAULT 'OTHER',
    "subject" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ticket_messages" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "fromTeam" BOOLEAN NOT NULL DEFAULT false,
    "authorEmail" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tickets_ownerId_idx" ON "tickets"("ownerId");
CREATE INDEX "tickets_status_idx" ON "tickets"("status");
CREATE INDEX "ticket_messages_ticketId_idx" ON "ticket_messages"("ticketId");

ALTER TABLE "tickets" ADD CONSTRAINT "tickets_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SetNull y no Cascade: el ticket es la prueba de lo que se pidió y tiene que
-- sobrevivir a que el evento se borre.
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

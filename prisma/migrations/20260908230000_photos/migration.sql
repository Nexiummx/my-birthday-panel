-- Fotos de los invitados y código público del evento.

-- ── Código público ──────────────────────────────────────────────────────────
-- Es la puerta de /f/[code] (subir, el QR de las mesas) y /r/[code] (recuerdo).
-- Se genera en dos pasos porque la columna es NOT NULL y única: primero se
-- añade opcional, se rellena y solo entonces se sella.
ALTER TABLE "events" ADD COLUMN "shareCode" TEXT;

-- base36 de 10 caracteres a partir de dos fuentes de azar. Se aplica fila a
-- fila (el DEFAULT no vale: se evaluaría una sola vez para todo el UPDATE).
UPDATE "events"
SET "shareCode" = substr(md5(random()::text || clock_timestamp()::text || "id"), 1, 10);

ALTER TABLE "events" ALTER COLUMN "shareCode" SET NOT NULL;
CREATE UNIQUE INDEX "events_shareCode_key" ON "events"("shareCode");

ALTER TABLE "events" ADD COLUMN "photosEnabled" BOOLEAN NOT NULL DEFAULT true;

-- ── Fotos ───────────────────────────────────────────────────────────────────
CREATE TABLE "photos" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "invitationId" TEXT,
    "authorName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "bytes" INTEGER NOT NULL,
    "caption" TEXT,
    "hiddenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "photos_storagePath_key" ON "photos"("storagePath");
-- La galería siempre filtra por evento y por visible: el índice compuesto es el
-- que resuelve esa consulta sin tocar la tabla.
CREATE INDEX "photos_eventId_hiddenAt_idx" ON "photos"("eventId", "hiddenAt");
CREATE INDEX "photos_invitationId_idx" ON "photos"("invitationId");

ALTER TABLE "photos" ADD CONSTRAINT "photos_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SetNull: borrar a un invitado de la lista no puede borrar las fotos que
-- subió a la fiesta. El nombre ya quedó copiado en authorName.
ALTER TABLE "photos" ADD CONSTRAINT "photos_invitationId_fkey"
  FOREIGN KEY ("invitationId") REFERENCES "invitations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

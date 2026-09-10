-- Envío, seguimiento y entrada.
--
-- Cierra el hueco entre "invitación creada" e "invitado en la fiesta": hasta
-- ahora el anfitrión copiaba enlaces uno por uno y no sabía quién los había
-- abierto. Todas las columnas admiten NULL o traen valor por defecto, así que
-- ninguna invitación existente cambia de comportamiento.

ALTER TABLE "invitations" ADD COLUMN "phone" TEXT;
ALTER TABLE "invitations" ADD COLUMN "sentAt" TIMESTAMP(3);
ALTER TABLE "invitations" ADD COLUMN "firstViewedAt" TIMESTAMP(3);
ALTER TABLE "invitations" ADD COLUMN "lastViewedAt" TIMESTAMP(3);
ALTER TABLE "invitations" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "invitations" ADD COLUMN "checkedInAt" TIMESTAMP(3);
ALTER TABLE "invitations" ADD COLUMN "checkedInCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "events" ADD COLUMN "inviteMessage" TEXT;
ALTER TABLE "events" ADD COLUMN "giftRegistryUrl" TEXT;
ALTER TABLE "events" ADD COLUMN "giftRegistryLabel" TEXT;

-- La pantalla de envío agrupa por "ya salió o no" dentro de un evento.
CREATE INDEX "invitations_eventId_sentAt_idx" ON "invitations"("eventId", "sentAt");

-- El anfitrión elige qué sale en el recuerdo.
--
-- Ambas columnas son NULL por defecto, y eso es la clave del diseño: mientras
-- nadie elija nada, el recuerdo sigue eligiendo solo y no cambia para ningún
-- evento existente. En cuanto una fila del evento tiene posición, manda la
-- selección del anfitrión.
ALTER TABLE "photos" ADD COLUMN "rewindOrder" INTEGER;
ALTER TABLE "rsvps" ADD COLUMN "rewindOrder" INTEGER;

-- La consulta del recuerdo pide las elegidas de un evento, en orden.
CREATE INDEX "photos_eventId_rewindOrder_idx" ON "photos"("eventId", "rewindOrder");

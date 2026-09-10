-- Música del recuerdo.
--
-- Aditivo: las tres columnas admiten NULL o traen valor por defecto, así que
-- ningún evento existente cambia de comportamiento. Un evento sin
-- `soundtrackPath` simplemente no tiene música, que es como estaban todos.

ALTER TABLE "events"
  ADD COLUMN "soundtrackPath"    TEXT,
  ADD COLUMN "soundtrackName"    TEXT,
  ADD COLUMN "soundtrackStartMs" INTEGER NOT NULL DEFAULT 0;

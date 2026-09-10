-- Videos de la fiesta.
--
-- Todo lo que se añade es aditivo: `kind` trae valor por defecto y las dos
-- columnas nuevas admiten NULL, así que ninguna foto existente cambia de
-- comportamiento ni hay que rellenar nada antes de desplegar.

CREATE TYPE "MediaKind" AS ENUM ('PHOTO', 'VIDEO');

ALTER TABLE "photos"
  ADD COLUMN "kind"        "MediaKind" NOT NULL DEFAULT 'PHOTO',
  ADD COLUMN "posterPath"  TEXT,
  ADD COLUMN "durationMs"  INTEGER;

-- La galería pide fotos y videos por separado; sin este índice cada pestaña
-- recorrería las 500 filas del evento para quedarse con la mitad.
CREATE INDEX "photos_eventId_kind_hiddenAt_idx" ON "photos" ("eventId", "kind", "hiddenAt");

-- El evento entra en la ruta pública: /e/[evento]/i/[invitado].
--
-- Dos cambios que van juntos: el evento gana un slug legible propio y el slug
-- del invitado deja de ser único en toda la plataforma para serlo dentro de su
-- evento, que es a quien pertenece.

-- ─────────────────────────── Slug del evento ───────────────────────────

ALTER TABLE "events" ADD COLUMN "slug" TEXT;

-- Slug legible a partir del nombre que ya tiene cada evento. translate() quita
-- acentos y eñes; el resto de la puntuación —incluido el "·" de "Maya · 29"—
-- cae en el regexp_replace y se colapsa en guiones simples.
UPDATE "events"
SET "slug" = trim(both '-' from regexp_replace(
  lower(translate(
    "name",
    'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
    'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC'
  )),
  '[^a-z0-9]+', '-', 'g'
));

-- Un nombre que no deja ninguna letra ("¡¡¡ !!!") no puede quedarse sin ruta.
UPDATE "events" SET "slug" = 'evento' WHERE "slug" IS NULL OR "slug" = '';

-- Dos eventos con el mismo nombre son legítimos: "XV de Sofía" se repite cada
-- año y entre clientes distintos. Se numeran igual que lo hace la aplicación
-- para los eventos nuevos (ver eventSlug en src/lib/slug.ts): -2, -3…
--
-- El número sale de row_number() y no de un bucle porque el orden importa. El
-- evento más antiguo es el que ya puede tener invitaciones enviadas, así que es
-- el que se queda el nombre limpio; numerando fila a fila contra el estado ya
-- escrito ocurría justo lo contrario —los homónimos aún sin renumerar hacían
-- que el primero se apartara— y el más nuevo se llevaba la URL buena.
WITH numeradas AS (
  SELECT
    "id",
    row_number() OVER (PARTITION BY "slug" ORDER BY "createdAt", "id") AS n
  FROM "events"
)
UPDATE "events" e
SET "slug" = e."slug" || '-' || numeradas.n
FROM numeradas
WHERE numeradas."id" = e."id" AND numeradas.n > 1;

-- Red de seguridad. Lo de arriba deja únicos los homónimos entre sí, pero no
-- puede descartar el caso raro de que "maya-29-2" ya fuera el nombre de otro
-- evento distinto. Aquí no queda ninguna probabilidad en juego: si quedara un
-- duplicado, el índice único de abajo abortaría la migración a medias.
DO $$
DECLARE
  fila RECORD;
  base TEXT;
  candidato TEXT;
  n INT;
BEGIN
  FOR fila IN SELECT "id", "slug" FROM "events" ORDER BY "createdAt", "id" LOOP
    base := fila."slug";
    candidato := base;
    n := 1;
    WHILE EXISTS (
      SELECT 1 FROM "events" o WHERE o."slug" = candidato AND o."id" <> fila."id"
    ) LOOP
      n := n + 1;
      candidato := base || '-' || n;
    END LOOP;

    IF candidato <> fila."slug" THEN
      UPDATE "events" SET "slug" = candidato WHERE "id" = fila."id";
    END IF;
  END LOOP;
END $$;

ALTER TABLE "events" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- ────────────────────── Slug del invitado, por evento ──────────────────

-- El compuesto sustituye también al índice suelto sobre eventId: es su mismo
-- prefijo, así que mantener los dos sería pagar dos veces por lo mismo.
DROP INDEX "invitations_slug_key";
DROP INDEX "invitations_eventId_idx";
CREATE UNIQUE INDEX "invitations_eventId_slug_key" ON "invitations"("eventId", "slug");

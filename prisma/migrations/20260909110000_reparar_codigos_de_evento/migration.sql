-- Repara los códigos de evento que la migración de fotos generó con md5.
--
-- Aquel relleno usaba `substr(md5(...), 1, 10)`, que da hexadecimal: incluye
-- "0" y "1". Pero el alfabeto del código son 32 símbolos SIN 0/1/l/o, para que
-- se pueda dictar por teléfono sin confusiones, y `isShareCode()` rechaza todo
-- lo que se salga de ahí. Un código con un cero pasaba la migración y luego
-- dejaba /f/[code] y /r/[code] devolviendo 404: el QR de las mesas y el
-- recuerdo, muertos, sin ningún error en los registros.
--
-- Solo uno de cada cuatro códigos hexadecimales se libra, así que esto no es
-- un caso raro: es el caso normal.
--
-- Se arregla aquí y no editando la migración de fotos a propósito. Esa ya está
-- aplicada en algunas bases, y reescribir una migración aplicada rompe su
-- suma de verificación. Así se cura tanto una instalación vieja como una
-- nueva, que pasa por las dos en orden.
--
-- Regenerar el código es seguro: /f/ y /r/ nunca han funcionado con los
-- códigos malos, así que no hay ningún QR impreso apuntando a ellos.

DO $$
DECLARE
  alfabeto TEXT := '23456789abcdefghijkmnpqrstuvwxyz';
  fila     RECORD;
  nuevo    TEXT;
  i        INT;
BEGIN
  FOR fila IN
    SELECT "id" FROM "events"
    WHERE "shareCode" !~ ('^[' || alfabeto || ']{10}$')
  LOOP
    -- Se reintenta hasta dar con uno libre: la columna es única y un choque
    -- abortaría la migración entera.
    LOOP
      nuevo := '';
      FOR i IN 1..10 LOOP
        nuevo := nuevo || substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1);
      END LOOP;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM "events" WHERE "shareCode" = nuevo);
    END LOOP;

    UPDATE "events" SET "shareCode" = nuevo WHERE "id" = fila."id";
  END LOOP;
END $$;

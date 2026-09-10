-- Da por enviadas las invitaciones que ya existían.
--
-- La columna sentAt nació con la pantalla de envío y se añadió en NULL para
-- todo el mundo. En una base que ya estaba en marcha eso es una mentira
-- peligrosa: NULL significa "todavía no ha salido", y hay un script que se
-- apoya justo en eso.
--
-- scripts/rotar-slugs.ts cambia el enlace de las invitaciones con slug
-- adivinable y, por defecto, respeta las enviadas —cambiarle el enlace a
-- alguien que ya lo tiene en su WhatsApp lo deja fuera de la fiesta, y ese
-- mensaje no se puede editar—. Con todas las filas en NULL, ese script
-- "seguro" habría roto TODOS los enlaces de una fiesta en marcha.
--
-- Se elige el lado conservador. Marcar de más es visible y se deshace desde el
-- panel con un clic; marcar de menos rompe enlaces vivos y no se deshace.
--
-- En una instalación nueva la tabla está vacía y esto no hace nada.

UPDATE "invitations"
SET "sentAt" = "createdAt"
WHERE "sentAt" IS NULL;

/**
 * Cifra los datos sensibles que ya estaban guardados en claro.
 *
 *   npx tsx scripts/cifrar-datos.ts            # cifra lo que falte
 *   npx tsx scripts/cifrar-datos.ts --revisar  # solo cuenta, no escribe
 *
 * Se corre DESPUÉS de desplegar el código con FIELD_ENCRYPTION_KEY_V1 puesta.
 * A partir de ese despliegue todo lo nuevo ya sale cifrado; esto se ocupa de lo
 * viejo.
 *
 * Es idempotente: cada fila se salta si ya tiene forma de sobre cifrado. Si se
 * corta a la mitad —se cae la conexión, se acaba el tiempo— se vuelve a correr
 * y retoma donde iba. No hay una transacción gigante a propósito: mientras
 * corre, la aplicación sigue funcionando con una mezcla de filas cifradas y en
 * claro, que es justo lo que `decryptField` sabe manejar.
 */
import "./env";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { encryptField, encryptionEnabled, isEncrypted } from "../src/lib/crypto/field-crypto";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Falta DATABASE_URL en el entorno.");
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const soloRevisar = process.argv.includes("--revisar");

async function main() {
  if (!encryptionEnabled()) {
    console.error(
      "✖ Falta FIELD_ENCRYPTION_KEY_V1. Genérala con:\n" +
        "    openssl rand -base64 32\n" +
        "  y ponla en .env.local (desarrollo) o en las variables de Vercel."
    );
    process.exit(1);
  }

  let cifradas = 0;
  let yaEstaban = 0;
  let vacias = 0;

  const invitaciones = await prisma.invitation.findMany({
    select: { id: true, phone: true, personalMessage: true },
  });

  for (const fila of invitaciones) {
    const data: { phone?: string; personalMessage?: string } = {};

    for (const campo of ["phone", "personalMessage"] as const) {
      const valor = fila[campo];
      if (valor === null || valor === "") {
        vacias += 1;
        continue;
      }
      if (isEncrypted(valor)) {
        yaEstaban += 1;
        continue;
      }
      data[campo] = encryptField(valor);
      cifradas += 1;
    }

    if (Object.keys(data).length > 0 && !soloRevisar) {
      await prisma.invitation.update({ where: { id: fila.id }, data });
    }
  }

  const rsvps = await prisma.rsvp.findMany({ select: { id: true, comment: true } });
  for (const fila of rsvps) {
    if (fila.comment === null || fila.comment === "") {
      vacias += 1;
      continue;
    }
    if (isEncrypted(fila.comment)) {
      yaEstaban += 1;
      continue;
    }
    if (!soloRevisar) {
      await prisma.rsvp.update({
        where: { id: fila.id },
        data: { comment: encryptField(fila.comment) },
      });
    }
    cifradas += 1;
  }

  console.log(
    soloRevisar
      ? `Faltan por cifrar ${cifradas} valores. Ya cifrados: ${yaEstaban}. Vacíos: ${vacias}.`
      : `✔ Cifrados ${cifradas} valores. Ya lo estaban ${yaEstaban}. Vacíos: ${vacias}.`
  );
}

main()
  .catch((error) => {
    console.error("El cifrado falló:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

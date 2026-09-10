/**
 * Chequeo previo al despliegue. NO ESCRIBE NADA.
 *
 *   DIRECT_URL="postgresql://…" npx tsx scripts/revisar-produccion.ts
 *
 * Se corre ANTES de migrar, contra la base tal como está hoy, y dice qué va a
 * pasar con los datos que ya existen: quién se queda cada evento, si las
 * contraseñas sobreviven, qué URL le va a tocar a cada fiesta y cuántas
 * invitaciones tienen todavía un enlace adivinable.
 *
 * Usa SQL crudo a propósito: el cliente de Prisma habla el esquema NUEVO, y
 * aquí la base todavía está en el viejo. Todo son SELECT.
 */
import "./env";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hasRandomToken, slugify } from "../src/lib/slug";
import { isShareCode } from "../src/lib/share-code";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Falta DIRECT_URL en el entorno.");
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const q = <T>(sql: string) => prisma.$queryRawUnsafe<T[]>(sql);
const titulo = (texto: string) => console.log(`\n${texto}\n${"─".repeat(texto.length)}`);

/** ¿Existe esa columna? Es como se sabe por qué migraciones ha pasado la base. */
async function hayColumna(tabla: string, columna: string) {
  const filas = await q<{ n: number }>(
    `SELECT count(*)::int AS n FROM information_schema.columns
      WHERE table_name = '${tabla}' AND column_name = '${columna}'`
  );
  return filas[0].n > 0;
}

async function main() {
  console.log("Revisión de solo lectura. Este script no escribe nada.");

  /* ── Por dónde va la base ─────────────────────────────────────────── */
  titulo("Migraciones aplicadas");
  const migraciones = await q<{ migration_name: string; finished_at: Date | null }>(
    `SELECT migration_name, finished_at FROM "_prisma_migrations" ORDER BY started_at`
  );
  for (const m of migraciones) {
    console.log(`  ${m.finished_at ? "✔" : "✖ SIN TERMINAR"}  ${m.migration_name}`);
  }
  console.log(`\n  Son ${migraciones.length}. Compáralas con prisma/migrations/ para saber cuántas faltan.`);

  const tieneDueno = await hayColumna("events", "ownerId");
  const tieneHash = await hayColumna("admin_users", "passwordHash");
  const tieneCodigo = await hayColumna("events", "shareCode");
  const tieneSlug = await hayColumna("events", "slug");

  /* ── Las cuentas ──────────────────────────────────────────────────── */
  titulo("Cuentas");
  const cuentas = await q<{ id: string; email: string; createdAt: Date; hash: string | null }>(
    `SELECT "id", "email", "createdAt", ${tieneHash ? '"passwordHash"' : "NULL"} AS hash
       FROM "admin_users" ORDER BY "createdAt" ASC`
  );
  cuentas.forEach((c, i) => {
    const marca = i === 0 ? "  ← la más antigua" : "";
    console.log(`  ${c.email}${marca}`);
    if (tieneHash) {
      console.log(
        c.hash
          ? "     contraseña: se copia a la tabla accounts y sigue funcionando"
          : "     ⚠ SIN contraseña guardada: esta cuenta tendrá que restablecerla"
      );
    }
  });

  /* ── Los eventos ──────────────────────────────────────────────────── */
  titulo("Eventos");
  const eventos = await q<{ id: string; name: string; createdAt: Date; code: string | null }>(
    `SELECT "id", "name", "createdAt", ${tieneCodigo ? '"shareCode"' : "NULL"} AS code
       FROM "events" ORDER BY "createdAt" ASC`
  );

  if (!tieneDueno && cuentas.length > 0) {
    console.log(`  Todos pasan a nombre de ${cuentas[0].email} (la cuenta más antigua).`);
    console.log("  Si el dueño real es otro, hay que cambiarlo a mano después de migrar.\n");
  }

  const vistos = new Map<string, number>();
  for (const evento of eventos) {
    const base = slugify(evento.name) || "evento";
    const repetido = (vistos.get(base) ?? 0) + 1;
    vistos.set(base, repetido);
    const slug = repetido === 1 ? base : `${base}-${repetido}`;

    console.log(`  "${evento.name}"`);
    console.log(`     URL pública:  /e/${slug}/i/[invitado]${tieneSlug ? "  (ya migrado)" : ""}`);
    if (repetido > 1) {
      console.log("     ⚠ nombre repetido: se numera. Renómbralo en el panel si no te gusta.");
    }
    if (base === "evento") {
      console.log("     ⚠ el nombre no deja ninguna letra utilizable. Renómbralo en el panel.");
    }
    if (tieneCodigo && evento.code && !isShareCode(evento.code)) {
      console.log(`     ⚠ código "${evento.code}" fuera del alfabeto: lo repara la migración`);
      console.log("       20260909110000_reparar_codigos_de_evento (el QR y el recuerdo)");
    }
  }

  /* ── Las invitaciones ─────────────────────────────────────────────── */
  titulo("Invitaciones");
  const invitaciones = await q<{ slug: string; guestName: string; sentAt: Date | null }>(
    `SELECT "slug", "guestName", ${await hayColumna("invitations", "sentAt") ? '"sentAt"' : "NULL"} AS "sentAt"
       FROM "invitations" ORDER BY "createdAt" ASC`
  );
  const adivinables = invitaciones.filter((i) => !hasRandomToken(i.slug));

  console.log(`  ${invitaciones.length} en total.`);
  if (adivinables.length === 0) {
    console.log("  ✔ Todas tienen un enlace con azar.");
  } else {
    console.log(`\n  ⚠ ${adivinables.length} tienen un enlace ADIVINABLE.`);
    console.log("    Cualquiera que pruebe nombres comunes abre esa invitación, lee su");
    console.log("    mensaje personal y puede sobrescribir su respuesta.\n");
    for (const i of adivinables.slice(0, 12)) {
      console.log(`      /i/${i.slug}   (${i.guestName})`);
    }
    if (adivinables.length > 12) console.log(`      … y ${adivinables.length - 12} más`);
    console.log("\n    Se arreglan con  npm run rotar:slugs  (ver el manual).");
  }

  console.log("\nListo. No se escribió nada.\n");
}

main()
  .catch((error) => {
    console.error("No se pudo revisar:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

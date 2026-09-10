import "./env";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL! }),
});

async function main() {
  const owner = await prisma.adminUser.findFirstOrThrow({ select: { id: true } });
  // Dos homónimos y un nombre sin una sola letra: los tres casos que el
  // relleno de la migración tiene que resolver.
  for (const [i, name] of ["Maya · 29", "Maya · 29", "¡¿!?"].entries()) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "events" ("id","ownerId","name","date","time","location","theme","originalDate","shareCode","createdAt","updatedAt")
       VALUES ($1,$2,$3,now(),'6:00 pm','Prueba','BOSQUE',now(),$4,now(),now())`,
      `tmp-dup-${i}`,
      owner.id,
      name,
      `tmpcode${i}xx`
    );
  }
  console.log("  3 eventos de prueba insertados");
}

main().finally(() => prisma.$disconnect());

-- Cobros con Mercado Pago.
--
-- Tabla nueva: no toca nada de lo que ya existe. El cupo sigue viviendo en
-- admin_users.eventQuota; esto es el libro de dónde salió cada crédito.

CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REFUNDED', 'CANCELLED');

CREATE TABLE "payments" (
  "id"             TEXT NOT NULL,
  "ownerId"        TEXT NOT NULL,
  "planId"         TEXT NOT NULL,
  "planName"       TEXT NOT NULL,
  "credits"        INTEGER NOT NULL,
  "amountCents"    INTEGER NOT NULL,
  "currency"       TEXT NOT NULL DEFAULT 'MXN',
  "status"         "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "provider"       TEXT NOT NULL DEFAULT 'mercadopago',
  "providerId"     TEXT,
  "preferenceId"   TEXT,
  "providerStatus" TEXT,
  "creditedAt"     TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- Único de verdad y no "comprobamos antes de insertar": el aviso de Mercado
-- Pago llega repetido y a veces dos veces a la vez. Esta restricción es lo que
-- impide acreditar dos veces el mismo cobro.
CREATE UNIQUE INDEX "payments_providerId_key" ON "payments" ("providerId");
CREATE INDEX "payments_ownerId_idx" ON "payments" ("ownerId");
CREATE INDEX "payments_status_idx" ON "payments" ("status");

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_ownerId_fkey" FOREIGN KEY ("ownerId")
  REFERENCES "admin_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Contador de peticiones por clave, para Better Auth.
--
-- Va en base y no en memoria a propósito: en un despliegue sin servidor cada
-- instancia tiene su propia memoria, así que un contador en RAM no limita casi
-- nada. Sin esto, cualquiera puede pedir mil restablecimientos de contraseña y
-- agotar la cuota de correo.
CREATE TABLE "rate_limits" (
  "id" TEXT NOT NULL,
  "key" TEXT,
  "count" INTEGER,
  -- Milisegundos desde epoch: no cabe en un entero de 32 bits.
  "lastRequest" BIGINT,
  CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "rate_limits_key_idx" ON "rate_limits"("key");

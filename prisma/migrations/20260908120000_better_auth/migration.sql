-- Traslada la autenticación a Better Auth.
--
-- Lo delicado es la contraseña: deja de vivir en admin_users y pasa a la tabla
-- accounts, que es como Better Auth permite que una misma cuenta tenga varias
-- formas de entrar (contraseña, Google, Facebook). Se copia ANTES de borrar la
-- columna, y todo va en una transacción: si la copia falla, no se pierde nada.

-- 1. El usuario gana los campos que Better Auth espera.
ALTER TABLE "admin_users"
  ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "image" TEXT;

-- El nombre pasa a obligatorio (Better Auth lo exige). Las filas sin nombre
-- quedan con cadena vacía, no con NULL.
UPDATE "admin_users" SET "name" = '' WHERE "name" IS NULL;
ALTER TABLE "admin_users" ALTER COLUMN "name" SET DEFAULT '';
ALTER TABLE "admin_users" ALTER COLUMN "name" SET NOT NULL;

-- Quien se registre por su cuenta no podrá crear eventos hasta que se le
-- habilite. Las cuentas que ya existen conservan el cupo que tengan.
ALTER TABLE "admin_users" ALTER COLUMN "eventQuota" SET DEFAULT 0;

-- 2. Tablas de Better Auth.
CREATE TABLE "sessions" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

CREATE TABLE "accounts" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMP(3),
  "refreshTokenExpiresAt" TIMESTAMP(3),
  "scope" TEXT,
  "password" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "accounts_providerId_accountId_key" ON "accounts"("providerId", "accountId");
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

CREATE TABLE "verifications" (
  "id" TEXT NOT NULL,
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "verifications_identifier_idx" ON "verifications"("identifier");

ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Las contraseñas existentes pasan a accounts como proveedor "credential".
--    El hash bcrypt se conserva tal cual: la configuración de Better Auth lo
--    verifica, así que nadie tiene que restablecer su contraseña.
INSERT INTO "accounts" ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
SELECT
  'cred_' || "id",
  "id",
  'credential',
  "id",
  "passwordHash",
  "createdAt",
  CURRENT_TIMESTAMP
FROM "admin_users"
WHERE "passwordHash" IS NOT NULL;

-- 4. Ya copiadas, la columna sobra.
ALTER TABLE "admin_users" DROP COLUMN "passwordHash";

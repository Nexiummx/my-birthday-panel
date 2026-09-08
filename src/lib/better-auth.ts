import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/utils";
import { sendPasswordReset, sendVerification } from "@/lib/email";

/** Un proveedor social solo se ofrece si están sus dos credenciales. */
function socialProvider(id: "GOOGLE" | "FACEBOOK") {
  const clientId = process.env[`${id}_CLIENT_ID`];
  const clientSecret = process.env[`${id}_CLIENT_SECRET`];
  return clientId && clientSecret ? { clientId, clientSecret } : undefined;
}

const google = socialProvider("GOOGLE");
const facebook = socialProvider("FACEBOOK");

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  baseURL: siteUrl(),
  secret: process.env.AUTH_SECRET,

  // El modelo de usuario es el que ya existía. Los campos propios se declaran
  // aquí para que Better Auth los conozca sin que dejen de ser nuestros.
  user: {
    modelName: "adminUser",
    additionalFields: {
      eventQuota: { type: "number", defaultValue: 0, input: false },
      isSuperAdmin: { type: "boolean", defaultValue: false, input: false },
    },
  },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordReset(user.email, url);
    },
    // Las cuentas que ya existen tienen hash bcrypt. Verificarlo aquí evita
    // migrarlas: nadie pierde su acceso, y toda contraseña nueva se guarda ya
    // con el algoritmo por defecto de Better Auth.
    password: {
      hash: async (password) => bcrypt.hash(password, 12),
      verify: async ({ hash, password }) => bcrypt.compare(password, hash),
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerification(user.email, url);
    },
  },

  socialProviders: {
    ...(google ? { google } : {}),
    ...(facebook ? { facebook } : {}),
  },

  account: {
    accountLinking: {
      enabled: true,
      // Solo se vincula automáticamente con proveedores que certifican el
      // correo. Facebook no lo hace de forma fiable y enlazar a ciegas por
      // correo es una vía conocida de secuestro de cuentas.
      trustedProviders: ["google"],
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
});

export type Auth = typeof auth;

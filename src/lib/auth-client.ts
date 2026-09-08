"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Cliente de Better Auth para el navegador. Sin baseURL: las rutas viven en
 * el mismo origen que la aplicación.
 */
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;

import type { Database } from "@yres/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { Env } from "../index";

export function createAuth(env: Env, db: Database) {
  return betterAuth({
    baseURL: env.API_URL,
    // Better Auth only trusts baseURL's own origin by default, which would
    // reject every request from the frontend — a separate origin in every
    // environment (Vite dev server vs API dev server locally; Cloudflare
    // Pages vs Workers in production).
    trustedOrigins: [env.WEB_URL],
    database: drizzleAdapter(db, { provider: "pg" }),
    secret: env.BETTER_AUTH_SECRET,
    emailAndPassword: { enabled: true },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
    },
  });
}

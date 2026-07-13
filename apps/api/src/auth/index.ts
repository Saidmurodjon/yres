import type { Database } from "@yres/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { Env } from "../index";
import { sendEmail } from "../lib/email";

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
    emailAndPassword: {
      enabled: true,
      sendResetPassword: async ({ user, url }) => {
        await sendEmail(env, {
          to: user.email,
          subject: "Reset your YRES password",
          html: `<p>Someone requested a password reset for your YRES account.</p><p><a href="${url}">Click here to choose a new password</a>. This link expires in 1 hour.</p><p>If you didn't request this, you can ignore this email.</p>`,
        });
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        await sendEmail(env, {
          to: user.email,
          subject: "Verify your YRES email address",
          html: `<p>Welcome to YRES — please confirm this is your email address.</p><p><a href="${url}">Verify email</a></p>`,
        });
      },
    },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    account: {
      accountLinking: {
        // Google verifies the email itself, so it shouldn't matter whether
        // the *local* password account happens to have finished its own
        // separate verification email — without this, Better Auth's default
        // (require the existing local account's emailVerified to already be
        // true) throws "account_not_linked" for anyone who signed up with
        // email/password and never clicked that link, silently bouncing
        // them back to /login on every Google sign-in attempt.
        requireLocalEmailVerified: false,
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
    },
    // Production serves the web app and this API from sibling subdomains of
    // saidmurod.com (not pages.dev/workers.dev, which are separate public
    // suffixes with no shared registrable domain — cookies can never be
    // shared between those no matter what attributes are set). Scoping the
    // cookie to .saidmurod.com makes auth requests same-site, so the default
    // SameSite=Lax cookie is sent on the frontend's cross-origin fetches.
    advanced: env.WEB_URL.endsWith("saidmurod.com")
      ? {
          crossSubDomainCookies: {
            enabled: true,
            domain: ".saidmurod.com",
          },
        }
      : undefined,
  });
}

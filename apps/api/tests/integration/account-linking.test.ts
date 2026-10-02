import { account, session, user } from "@yres/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createAuth } from "../../src/auth";
import {
  guardNewAccountLink,
  revokeUnverifiedCredentialOnSocialLink,
} from "../../src/auth/account-linking";
import { closeTestDb, resetTestDb, testDb } from "../helpers/test-db";
import { testEnv } from "../helpers/test-env";

async function seedUser(emailVerified: boolean) {
  const id = crypto.randomUUID();
  const email = `${id}@example.com`;
  await testDb.insert(user).values({ id, name: "U", email, username: email, emailVerified });
  await testDb.insert(account).values({
    id: crypto.randomUUID(),
    userId: id,
    accountId: id,
    providerId: "credential",
    password: "hashed-password",
  });
  for (const n of [1, 2]) {
    await testDb.insert(session).values({
      id: crypto.randomUUID(),
      userId: id,
      token: `${id}-${n}`,
      expiresAt: new Date(Date.now() + 60_000),
    });
  }
  return id;
}

const credentialCount = async (userId: string) =>
  (await testDb.select().from(account).where(eq(account.userId, userId))).length;
const sessionCount = async (userId: string) =>
  (await testDb.select().from(session).where(eq(session.userId, userId))).length;

describe("revokeUnverifiedCredentialOnSocialLink (S-1)", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("drops the password account and every session of an unverified user when Google links", async () => {
    const id = await seedUser(false);
    const result = await revokeUnverifiedCredentialOnSocialLink(testDb, {
      userId: id,
      providerId: "google",
    });
    expect(result).toEqual({ revoked: true });
    expect(await credentialCount(id)).toBe(0);
    expect(await sessionCount(id)).toBe(0);
  });

  it("leaves a verified user untouched", async () => {
    const id = await seedUser(true);
    const result = await revokeUnverifiedCredentialOnSocialLink(testDb, {
      userId: id,
      providerId: "google",
    });
    expect(result).toEqual({ revoked: false });
    expect(await credentialCount(id)).toBe(1);
    expect(await sessionCount(id)).toBe(2);
  });

  it("does nothing for the credential account created at ordinary sign-up", async () => {
    const id = await seedUser(false);
    const result = await revokeUnverifiedCredentialOnSocialLink(testDb, {
      userId: id,
      providerId: "credential",
    });
    expect(result).toEqual({ revoked: false });
    expect(await credentialCount(id)).toBe(1);
    expect(await sessionCount(id)).toBe(2);
  });

  it("never touches another user's sessions or password", async () => {
    const victim = await seedUser(false);
    const bystander = await seedUser(false);
    await revokeUnverifiedCredentialOnSocialLink(testDb, { userId: victim, providerId: "google" });
    expect(await credentialCount(bystander)).toBe(1);
    expect(await sessionCount(bystander)).toBe(2);
  });

  it("is a no-op for an unknown user id", async () => {
    const result = await revokeUnverifiedCredentialOnSocialLink(testDb, {
      userId: "missing",
      providerId: "google",
    });
    expect(result).toEqual({ revoked: false });
  });

  it("is wired into Better Auth: linking a Google account through its own adapter triggers the revoke", async () => {
    const id = await seedUser(false);
    const context = await createAuth(testEnv, testDb).$context;
    await context.internalAdapter.linkAccount({
      providerId: "google",
      accountId: "google-sub-123",
      userId: id,
    });
    const providers = (await testDb.select().from(account).where(eq(account.userId, id))).map(
      (a) => a.providerId,
    );
    expect(providers).toEqual(["google"]);
    expect(await sessionCount(id)).toBe(0);
  });

  it("leaves a verified user's password and sessions alone when Google links through Better Auth", async () => {
    const id = await seedUser(true);
    const context = await createAuth(testEnv, testDb).$context;
    await context.internalAdapter.linkAccount({
      providerId: "google",
      accountId: "google-sub-456",
      userId: id,
    });
    const providers = (await testDb.select().from(account).where(eq(account.userId, id))).map(
      (a) => a.providerId,
    );
    expect(providers.sort()).toEqual(["credential", "google"]);
    expect(await sessionCount(id)).toBe(2);
  });

  it("fails closed: if the revoke itself errors, the Google link is removed and the sign-in fails", async () => {
    const id = await seedUser(false);
    // Same database, but batch() (the revoke) throws.
    const failingDb = new Proxy(testDb, {
      get(target, prop) {
        if (prop === "batch") {
          return () => {
            throw new Error("simulated D1 failure");
          };
        }
        const value = Reflect.get(target, prop, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    const context = await createAuth(testEnv, failingDb).$context;
    await expect(
      context.internalAdapter.linkAccount({
        providerId: "google",
        accountId: "google-sub-789",
        userId: id,
      }),
    ).rejects.toThrow("simulated D1 failure");
    const providers = (await testDb.select().from(account).where(eq(account.userId, id))).map(
      (a) => a.providerId,
    );
    expect(providers).toEqual(["credential"]);
  });

  it("logs loudly when the revoke AND the link removal both fail (S-1 left open)", async () => {
    const id = await seedUser(false);
    const brokenDb = new Proxy(testDb, {
      get(target, prop) {
        if (prop === "batch" || prop === "delete") {
          return () => {
            throw new Error("simulated D1 outage");
          };
        }
        const value = Reflect.get(target, prop, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    const errors: string[] = [];
    const original = console.error;
    console.error = (message?: unknown) => {
      errors.push(String(message));
    };
    try {
      await expect(
        guardNewAccountLink(brokenDb, { id: "link-id", userId: id, providerId: "google" }),
      ).rejects.toThrow("simulated D1 outage");
    } finally {
      console.error = original;
    }
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("revoke failed AND link removal failed");
    expect(errors[0]).toContain(id);
    expect(errors[0]).not.toContain("@");
  });
});

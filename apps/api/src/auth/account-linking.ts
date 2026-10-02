import { type Database, account, session, user } from "@yres/db";
import { and, eq } from "drizzle-orm";

/**
 * Pre-account-takeover guard (02-arxitektura S-1, auth.md). Called from
 * databaseHooks.account.create.after — Better Auth runs it *before* it flips
 * emailVerified to true on implicit OAuth linking, so an unverified user here means
 * a social identity is being attached to a local account nobody proved they own.
 * Drop that account's password and every existing session; the OAuth flow creates
 * the rightful owner's fresh session right after this returns.
 */
export async function revokeUnverifiedCredentialOnSocialLink(
  db: Database,
  linked: { userId: string; providerId: string },
): Promise<{ revoked: boolean }> {
  // Ordinary email/password sign-up creates its own `credential` account through this same hook.
  if (linked.providerId === "credential") return { revoked: false };

  const [owner] = await db
    .select({ emailVerified: user.emailVerified })
    .from(user)
    .where(eq(user.id, linked.userId))
    .limit(1);
  if (!owner || owner.emailVerified) return { revoked: false };

  // D1 has no interactive transactions: both deletes or neither (database.md).
  await db.batch([
    db
      .delete(account)
      .where(and(eq(account.userId, linked.userId), eq(account.providerId, "credential"))),
    db.delete(session).where(eq(session.userId, linked.userId)),
  ]);

  console.warn(`[auth] revoked unverified credential on social link userId=${linked.userId}`);
  return { revoked: true };
}

/**
 * `databaseHooks.account.create.after` body. Better Auth has already INSERTed the new social account when this
 * runs (no surrounding transaction), and it awaits the hook, so a throw here fails the sign-in with
 * "unable to link account" — but the link row would stay. The next Google sign-in would then find an
 * already-linked account, skip the linking branch (and this hook) and mark the email verified with the
 * attacker's password intact. So if the revoke fails, remove the link we just made and rethrow: fail closed.
 *
 * Also fires for an explicit `/link-social` by a signed-in, still-unverified user: that user loses their
 * own password and sessions (self-affecting, recoverable via "forgot password") — documented, not special-cased.
 */
export async function guardNewAccountLink(
  db: Database,
  linked: { id: string; userId: string; providerId: string },
): Promise<void> {
  try {
    await revokeUnverifiedCredentialOnSocialLink(db, linked);
  } catch (error) {
    let linkRemoved = true;
    try {
      await db.delete(account).where(eq(account.id, linked.id));
    } catch {
      linkRemoved = false;
    }
    // If the database is down for the revoke it may well be down for this too — then the S-1 hole is open
    // (link kept, password kept) and whoever reads the logs has to know.
    console.error(
      linkRemoved
        ? `[auth] revoke on social link failed, link removed userId=${linked.userId}`
        : `[auth] revoke failed AND link removal failed — S-1 exposure userId=${linked.userId}`,
    );
    throw error;
  }
}

export type UserRole = "admin" | "auditor" | "viewer";

/**
 * Better Auth's client `useSession()` type only reflects its own core
 * fields; `role`/`username` are exposed at runtime via the server's
 * `user.additionalFields` config (apps/api/src/auth/index.ts) but aren't
 * threaded into the client's inferred type here (createAuthClient() isn't
 * wired to the server's auth-instance type). Assert `session.user` to this
 * shape wherever these fields are read. Unverified against a live session
 * response in this sandbox — confirm after deploy if a field ever reads
 * unexpectedly `undefined`.
 */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: UserRole;
  username: string;
}

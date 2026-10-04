import type { Database } from "@yres/db";
import { building, buildingMember } from "@yres/db";
import { and, eq, isNull } from "drizzle-orm";

/**
 * Loads a building and returns it only if it belongs to the given user and
 * hasn't been soft-deleted (A03 — `deletedAt` NULL). Returns null when the
 * building doesn't exist, is owned by someone else, or is deleted —
 * callers should treat all three as a 404 so we never leak the existence of
 * other users' (or the caller's own deleted) buildings.
 *
 * Use this (not `findAccessibleBuilding`) for owner-only actions: deleting
 * the building itself, and managing its members. For restoring a deleted
 * building, use `findOwnedBuildingIncludingDeleted` instead.
 */
export async function findOwnedBuilding(db: Database, buildingId: string, userId: string) {
  const [found] = await db
    .select()
    .from(building)
    .where(and(eq(building.id, buildingId), isNull(building.deletedAt)))
    .limit(1);

  if (!found || found.userId !== userId) {
    return null;
  }

  return found;
}

/**
 * Same as `findOwnedBuilding`, but also returns soft-deleted buildings — the
 * only place that's correct, since `POST /:id/restore` needs to find the
 * building it's about to un-delete. Never use this for anything else.
 */
export async function findOwnedBuildingIncludingDeleted(
  db: Database,
  buildingId: string,
  userId: string,
) {
  const [found] = await db.select().from(building).where(eq(building.id, buildingId)).limit(1);

  if (!found || found.userId !== userId) {
    return null;
  }

  return found;
}

export type BuildingRole = "owner" | "editor" | "viewer";

export interface BuildingAccess {
  building: typeof building.$inferSelect;
  role: BuildingRole;
}

/**
 * Loads a building and the caller's access level: "owner" if they created
 * it, their `building_member` role if they were invited, or null if
 * neither, the building doesn't exist, or it's soft-deleted (A03 —
 * existence and access are all hidden behind the same null, same reasoning
 * as `findOwnedBuilding`). Use this for anything a shared collaborator
 * should be able to reach — most routes should use this instead of
 * `findOwnedBuilding`.
 *
 * One query (A02 budget note): a `LEFT JOIN` against `building_member`
 * scoped to this user, so a non-member still gets their `building` row back
 * (with `memberRole: null`) instead of the join dropping it. Semantics are
 * unchanged from the previous two-query version — only the query count did.
 */
export async function findAccessibleBuilding(
  db: Database,
  buildingId: string,
  userId: string,
): Promise<BuildingAccess | null> {
  const [found] = await db
    .select({ building, memberRole: buildingMember.role })
    .from(building)
    .leftJoin(
      buildingMember,
      and(eq(buildingMember.buildingId, building.id), eq(buildingMember.userId, userId)),
    )
    .where(and(eq(building.id, buildingId), isNull(building.deletedAt)))
    .limit(1);

  if (!found) return null;

  if (found.building.userId === userId) {
    return { building: found.building, role: "owner" };
  }

  if (!found.memberRole) return null;

  return { building: found.building, role: found.memberRole };
}

/** "viewer" is read-only; "owner" and "editor" can modify the building's data. */
export function canWrite(role: BuildingRole): boolean {
  return role !== "viewer";
}

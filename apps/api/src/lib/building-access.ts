import type { Database } from "@yres/db";
import { building, buildingMember } from "@yres/db";
import { and, eq } from "drizzle-orm";

/**
 * Loads a building and returns it only if it belongs to the given user.
 * Returns null both when the building doesn't exist and when it exists but
 * is owned by someone else — callers should treat both as a 404 so we never
 * leak the existence of other users' buildings.
 *
 * Use this (not `findAccessibleBuilding`) for owner-only actions: deleting
 * the building itself, and managing its members.
 */
export async function findOwnedBuilding(db: Database, buildingId: string, userId: string) {
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
 * neither (existence and access are both hidden behind the same null, same
 * reasoning as `findOwnedBuilding`). Use this for anything a shared
 * collaborator should be able to reach — most routes should use this
 * instead of `findOwnedBuilding`.
 */
export async function findAccessibleBuilding(
  db: Database,
  buildingId: string,
  userId: string,
): Promise<BuildingAccess | null> {
  const [found] = await db.select().from(building).where(eq(building.id, buildingId)).limit(1);
  if (!found) return null;

  if (found.userId === userId) {
    return { building: found, role: "owner" };
  }

  const [member] = await db
    .select()
    .from(buildingMember)
    .where(and(eq(buildingMember.buildingId, buildingId), eq(buildingMember.userId, userId)))
    .limit(1);

  if (!member) return null;

  return { building: found, role: member.role };
}

/** "viewer" is read-only; "owner" and "editor" can modify the building's data. */
export function canWrite(role: BuildingRole): boolean {
  return role !== "viewer";
}

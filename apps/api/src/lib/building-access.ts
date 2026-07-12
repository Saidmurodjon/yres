import type { Database } from "@yres/db";
import { building } from "@yres/db";
import { eq } from "drizzle-orm";

/**
 * Loads a building and returns it only if it belongs to the given user.
 * Returns null both when the building doesn't exist and when it exists but
 * is owned by someone else — callers should treat both as a 404 so we never
 * leak the existence of other users' buildings.
 */
export async function findOwnedBuilding(db: Database, buildingId: string, userId: string) {
  const [found] = await db.select().from(building).where(eq(building.id, buildingId)).limit(1);

  if (!found || found.userId !== userId) {
    return null;
  }

  return found;
}

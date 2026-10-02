import {
  building,
  conversation,
  conversationMember,
  energyMeasure,
  insertChunked,
  message,
  user,
} from "@yres/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedClimateRegion } from "../helpers/seed-helpers";
import { authRequest, signUpTestUser } from "../helpers/test-auth";
import { closeTestDb, resetTestDb, testDb } from "../helpers/test-db";

/**
 * D1 allows 100 bound parameters per statement - that includes every element of an `IN (...)` list, not
 * only INSERT values (database.md). These tests use more than 100 rows/ids on routes that used to bind
 * a user-sized JS array, so they fail with "too many SQL variables" if such a list comes back.
 */
const BUILDING_BASE = {
  location: "Tashkent",
  heatingSeasonDurationDays: 163,
  indoorTempNonOperationC: 14,
  indoorTempOperationC: 22,
  outdoorAvgHeatingSeasonTempC: 3.9,
  outdoorDesignTempC: -14,
  nonOperationHoursPerDay: 14,
  operationHoursPerDay: 10,
};

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

describe("D1 100-parameter limit on IN lists", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("selects more than 100 measures for implementation and clears the rest", async () => {
    const { cookie, userId } = await signUpTestUser();
    const region = await seedClimateRegion();
    const buildingId = crypto.randomUUID();
    await testDb.insert(building).values({
      id: buildingId,
      userId,
      name: "Many measures",
      searchText: "many measures",
      climateRegionId: region.id,
      ...BUILDING_BASE,
    });
    const rows = Array.from({ length: 200 }, (_, i) => ({
      id: crypto.randomUUID(),
      buildingId,
      name: `Measure ${i}`,
      category: "other" as const,
      investmentCostUsd: 100,
      proposedForImplementation: i >= 190, // previously proposed; must be cleared
    }));
    await testDb.batch(insertChunked(testDb, energyMeasure, rows) as never);

    const chosen = rows.slice(0, 150).map((r) => r.id);
    const response = await authRequest(
      `/api/buildings/${buildingId}/measures/select`,
      json("POST", { measureIds: chosen }),
      cookie,
    );
    expect(response.status).toBe(200);

    const after = await testDb
      .select({ id: energyMeasure.id, proposed: energyMeasure.proposedForImplementation })
      .from(energyMeasure)
      .where(eq(energyMeasure.buildingId, buildingId));
    const proposed = new Set(after.filter((m) => m.proposed).map((m) => m.id));
    expect(proposed.size).toBe(150);
    expect(chosen.every((id) => proposed.has(id))).toBe(true);
  });

  it("lists a page of 150 buildings with collaborator counts", async () => {
    const { cookie, userId } = await signUpTestUser();
    const region = await seedClimateRegion();
    const rows = Array.from({ length: 150 }, (_, i) => ({
      id: crypto.randomUUID(),
      userId,
      name: `B${i}`,
      searchText: `b${i}`,
      climateRegionId: region.id,
      ...BUILDING_BASE,
    }));
    await testDb.batch(insertChunked(testDb, building, rows) as never);

    const response = await authRequest("/api/buildings?pageSize=150", {}, cookie);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { buildings: unknown[]; total: number };
    expect(body.buildings).toHaveLength(150);
    expect(body.total).toBe(150);
  });

  async function seedConversations(userId: string, count: number, type: "direct" | "group") {
    const other = crypto.randomUUID();
    await testDb.insert(user).values({
      id: other,
      name: "Other",
      email: `${other}@example.com`,
      username: `${other}@example.com`,
    });
    const conversations = Array.from({ length: count }, () => ({
      id: crypto.randomUUID(),
      type,
      name: type === "group" ? "G" : null,
      createdBy: userId,
    }));
    await testDb.batch(insertChunked(testDb, conversation, conversations) as never);
    const members = conversations.flatMap((c) => [
      { conversationId: c.id, userId },
      { conversationId: c.id, userId: other },
    ]);
    await testDb.batch(insertChunked(testDb, conversationMember, members) as never);
    return { conversations, other };
  }

  it("lists the chats of a user who is in more than 100 conversations", async () => {
    const { cookie, userId } = await signUpTestUser();
    const { conversations, other } = await seedConversations(userId, 120, "group");
    const messages = conversations.map((c, i) => ({
      conversationId: c.id,
      senderId: other,
      body: `last-${i}`,
      createdAt: new Date(1_000 + i),
    }));
    await testDb.batch(insertChunked(testDb, message, messages) as never);

    const response = await authRequest("/api/chat/conversations", {}, cookie);
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      conversations: { lastMessage: { body: string } | null; unreadCount: number }[];
    };
    expect(body.conversations).toHaveLength(120);
    expect(body.conversations.every((c) => c.lastMessage !== null)).toBe(true);
    expect(body.conversations.every((c) => c.unreadCount === 1)).toBe(true);
  });

  it("starts a new direct chat for a user who already has more than 100 direct chats", async () => {
    const { cookie, userId } = await signUpTestUser();
    await seedConversations(userId, 110, "direct");
    const friend = await signUpTestUser();

    const response = await authRequest(
      "/api/chat/conversations",
      json("POST", { type: "direct", username: friend.email }),
      cookie,
    );
    expect(response.status).toBe(201);
  });
});

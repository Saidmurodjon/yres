import { describe, expect, it } from "vitest";
import { createBuildingSchema, updateBuildingSchema } from "../../src/schemas/building";
import { createConversationSchema, updateConversationSchema } from "../../src/schemas/chat";
import { createUtilityBillsSchema, replaceUtilityBillsSchema } from "../../src/schemas/consumption";
import { replaceEnvelopeSchema } from "../../src/schemas/envelope";
import {
  createMeasureSchema,
  createNonEeMeasureSchema,
  selectMeasuresSchema,
} from "../../src/schemas/measures";
import { replaceEquipmentSchema, replaceVentilationSchema } from "../../src/schemas/systems";

const UUID = "123e4567-e89b-42d3-a456-426614174000";
const many = <T>(n: number, make: (i: number) => T) => Array.from({ length: n }, (_, i) => make(i));

const validBuilding = {
  name: "School",
  location: "Tashkent",
  climateRegionId: UUID,
  heatingSeasonDurationDays: 163,
  indoorTempNonOperationC: 14,
  indoorTempOperationC: 22,
  outdoorAvgHeatingSeasonTempC: 3.9,
  outdoorDesignTempC: -14,
  nonOperationHoursPerDay: 14,
  operationHoursPerDay: 10,
};

describe("building schema bounds (V-3)", () => {
  it("accepts a realistic building", () => {
    expect(createBuildingSchema.safeParse(validBuilding).success).toBe(true);
  });

  it.each([
    ["indoor temperature above 60 °C", { indoorTempOperationC: 61 }],
    ["design temperature below -60 °C", { outdoorDesignTempC: -61 }],
    ["more than 24 operating hours a day", { operationHoursPerDay: 25 }],
    ["heating season longer than a year", { heatingSeasonDurationDays: 367 }],
    ["year built before 1800", { yearBuilt: 1799 }],
    ["latitude beyond 90", { latitude: 91 }],
    ["longitude beyond 180", { longitude: -181 }],
    ["a 301-character name", { name: "x".repeat(301) }],
    ["a non-finite number", { occupantCount: Number.POSITIVE_INFINITY }],
  ])("rejects %s", (_label, patch) => {
    expect(createBuildingSchema.safeParse({ ...validBuilding, ...patch }).success).toBe(false);
    expect(updateBuildingSchema.safeParse(patch).success).toBe(false);
  });
});

describe("consumption schema bounds (V-3)", () => {
  const bill = { energyCarrier: "gas", year: 2024, month: 1, consumptionNative: 100 };

  it("rejects too many bills, an absurd year and bad amounts", () => {
    expect(createUtilityBillsSchema.safeParse({ bills: many(145, () => bill) }).success).toBe(
      false,
    );
    expect(createUtilityBillsSchema.safeParse({ bills: [{ ...bill, year: 1989 }] }).success).toBe(
      false,
    );
    expect(createUtilityBillsSchema.safeParse({ bills: [{ ...bill, year: 2101 }] }).success).toBe(
      false,
    );
    expect(
      createUtilityBillsSchema.safeParse({ bills: [{ ...bill, consumptionNative: -1 }] }).success,
    ).toBe(false);
    expect(
      createUtilityBillsSchema.safeParse({ bills: [{ ...bill, expenseLocal: Number.NaN }] })
        .success,
    ).toBe(false);
    expect(createUtilityBillsSchema.safeParse({ bills: [bill] }).success).toBe(true);
  });

  it("applies the same year and amount rules to the year-replace endpoint", () => {
    const row = { month: 1, consumptionNative: 5 };
    expect(
      replaceUtilityBillsSchema.safeParse({ energyCarrier: "gas", year: 3000, bills: [row] })
        .success,
    ).toBe(false);
    expect(
      replaceUtilityBillsSchema.safeParse({
        energyCarrier: "gas",
        year: 2024,
        bills: [{ ...row, tariffLocal: -2 }],
      }).success,
    ).toBe(false);
  });
});

describe("envelope schema bounds (V-3 + D1 query budget)", () => {
  const type = (i: number) => ({ code: `W${i}`, elementCategory: "external_wall" });

  it("rejects oversized arrays and strings", () => {
    expect(replaceEnvelopeSchema.safeParse({ constructionTypes: many(16, type) }).success).toBe(
      false,
    );
    expect(
      replaceEnvelopeSchema.safeParse({
        openingTypes: many(15, (i) => ({ code: `O${i}`, category: "window", uValueWm2k: 1 })),
      }).success,
    ).toBe(false);
    expect(
      replaceEnvelopeSchema.safeParse({
        envelopeElements: many(101, () => ({
          blockName: "A",
          orientation: "north",
          constructionTypeCode: "W",
          lengthM: 1,
        })),
      }).success,
    ).toBe(false);
    expect(
      replaceEnvelopeSchema.safeParse({
        constructionTypes: [{ ...type(0), code: "x".repeat(101) }],
      }).success,
    ).toBe(false);
    expect(
      replaceEnvelopeSchema.safeParse({
        constructionTypes: [
          {
            ...type(0),
            layers: many(9, (i) => ({ layerOrder: i, materialId: UUID, thicknessM: 0.1 })),
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects more openings in total than the budget allows", () => {
    const element = {
      blockName: "A",
      orientation: "north",
      constructionTypeCode: "W",
      lengthM: 1,
      openings: many(20, () => ({ openingTypeCode: "Win", count: 1 })),
    };
    expect(
      replaceEnvelopeSchema.safeParse({ envelopeElements: many(9, () => element) }).success,
    ).toBe(false);
    expect(
      replaceEnvelopeSchema.safeParse({ envelopeElements: many(8, () => element) }).success,
    ).toBe(true);
  });
});

describe("systems schema bounds (V-3 + D1 query budget)", () => {
  it("rejects too many rows", () => {
    expect(
      replaceVentilationSchema.safeParse({
        scenario: "before",
        systems: many(21, () => ({ systemType: "natural" })),
      }).success,
    ).toBe(false);
    expect(
      replaceEquipmentSchema.safeParse({
        scenario: "before",
        items: many(201, () => ({ name: "pc", unitPowerKw: 0.1 })),
      }).success,
    ).toBe(false);
  });
});

describe("chat and measures schema bounds (V-3)", () => {
  it("limits group size and username length", () => {
    expect(
      createConversationSchema.safeParse({
        type: "group",
        name: "g",
        usernames: many(51, (i) => `u${i}`),
      }).success,
    ).toBe(false);
    expect(
      createConversationSchema.safeParse({ type: "direct", username: "u".repeat(321) }).success,
    ).toBe(false);
    expect(
      updateConversationSchema.safeParse({ addUsernames: many(51, (i) => `u${i}`) }).success,
    ).toBe(false);
    expect(
      updateConversationSchema.safeParse({ removeUserIds: many(51, (i) => `id${i}`) }).success,
    ).toBe(false);
  });

  it("limits measure selection and text fields", () => {
    expect(selectMeasuresSchema.safeParse({ measureIds: many(501, () => UUID) }).success).toBe(
      false,
    );
    expect(
      createMeasureSchema.safeParse({
        name: "x".repeat(301),
        category: "other",
        investmentCostUsd: 1,
      }).success,
    ).toBe(false);
    expect(
      createNonEeMeasureSchema.safeParse({ description: "x".repeat(10_001), unitCostUsd: 1 })
        .success,
    ).toBe(false);
  });
});

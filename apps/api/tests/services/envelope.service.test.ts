import { describe, expect, it } from "vitest";
import {
  calculateBuildingBlockAreas,
  calculateEnvelopeAreas,
  getEffectiveOpeningType,
  resolveHeatLossGroups,
} from "../../src/services/envelope.service";

describe("EnvelopeService", () => {
  describe("calculateBuildingBlockAreas", () => {
    it("matches the Envelope sheet's footprint-block formula", () => {
      const result = calculateBuildingBlockAreas({
        footprintLengthM: 20,
        footprintWidthM: 15,
        numberOfFloors: 3,
        floorToFloorHeightM: 3,
        perimeterM: 70,
        perimeterLossCoefficient: 0.4,
      });

      // gross = 20*15*3 = 900; perimeter loss = 70*0.4*3 = 84; net = 816
      expect(result.netFloorAreaM2).toBeCloseTo(816, 6);
      expect(result.netVolumeM3).toBeCloseTo(816 * 3, 6);
    });
  });

  describe("calculateEnvelopeAreas", () => {
    it("subtracts opening area from gross wall area and buckets by category", () => {
      const areas = calculateEnvelopeAreas([
        {
          id: "e1",
          constructionTypeId: "ct-wall",
          elementCategory: "external_wall",
          orientation: "south",
          lengthM: 10,
          heightEnvContactM: 3,
          heightGroundContactM: 0,
          openings: [
            {
              openingTypeId: "win1",
              openingCategory: "window",
              widthM: 1.5,
              heightM: 1.2,
              count: 2,
            },
          ],
        },
      ]);

      // gross = 10*3 = 30; openings = 1.5*1.2*2 = 3.6; net wall = 26.4
      expect(areas.externalWallAreaM2).toBeCloseTo(26.4, 6);
      expect(areas.windowAreaM2).toBeCloseTo(3.6, 6);
      expect(areas.totalOpaqueAreaM2).toBeCloseTo(26.4, 6);
    });
  });

  describe("getEffectiveOpeningType", () => {
    const beforeWindowType = {
      id: "win1",
      category: "window" as const,
      scenario: "before" as const,
      uValueWPerM2K: 2.6,
      gValue: 0.75,
      frameFactor: 0.6,
      shadingFactor: 1,
    };
    const afterWindowType = {
      id: "win4",
      category: "window" as const,
      scenario: "after" as const,
      uValueWPerM2K: 1.5,
      gValue: 0.7,
      frameFactor: 0.9,
      shadingFactor: 1,
    };
    const openingTypes = [beforeWindowType, afterWindowType];

    it("uses the opening's own type before renovation", () => {
      expect(getEffectiveOpeningType("win1", openingTypes, "window", "before")?.id).toBe("win1");
    });

    it("consolidates to the building's single after-scenario type of that category", () => {
      expect(getEffectiveOpeningType("win1", openingTypes, "window", "after")?.id).toBe("win4");
    });

    it("falls back to the opening's own type if no after-scenario type exists for that category", () => {
      expect(getEffectiveOpeningType("win1", [beforeWindowType], "window", "after")?.id).toBe(
        "win1",
      );
    });
  });

  describe("resolveHeatLossGroups", () => {
    const elements = [
      {
        id: "e1",
        constructionTypeId: "ct-before",
        elementCategory: "external_wall" as const,
        orientation: "south" as const,
        lengthM: 10,
        heightEnvContactM: 3,
        heightGroundContactM: 0,
        openings: [],
      },
    ];
    const beforeWallType = {
      id: "ct-before",
      scenario: "before" as const,
      retrofitOfId: null,
      uValueWPerM2K: 1.5,
    };
    const afterWallType = {
      id: "ct-after",
      scenario: "after" as const,
      retrofitOfId: "ct-before",
      uValueWPerM2K: 0.3,
    };
    const constructionTypes = [beforeWallType, afterWallType];

    it("uses the element's own construction type before renovation", () => {
      const groups = resolveHeatLossGroups(elements, constructionTypes, [], "before");
      expect(groups.find((g) => g.category === "external_wall")?.uValueWPerM2K).toBeCloseTo(1.5, 6);
    });

    it("swaps in the retrofit target's U-value after renovation", () => {
      const groups = resolveHeatLossGroups(elements, constructionTypes, [], "after");
      expect(groups.find((g) => g.category === "external_wall")?.uValueWPerM2K).toBeCloseTo(0.3, 6);
    });

    it("falls back to the unrenovated U-value when no retrofit type is defined for an element", () => {
      const groups = resolveHeatLossGroups(elements, [beforeWallType], [], "after");
      expect(groups.find((g) => g.category === "external_wall")?.uValueWPerM2K).toBeCloseTo(1.5, 6);
    });
  });
});

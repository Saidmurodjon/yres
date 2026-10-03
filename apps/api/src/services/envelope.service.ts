import type {
  EnvelopeAreaBreakdown,
  EnvelopeElementCategory,
  HeatLossGroup,
  Orientation,
  Scenario,
} from "@yres/types";

export interface EnvelopeOpeningInput {
  openingTypeId: string;
  openingCategory: "window" | "door";
  widthM: number;
  heightM: number;
  count: number;
}

export interface EnvelopeElementInput {
  id: string;
  constructionTypeId: string;
  elementCategory: EnvelopeElementCategory;
  orientation: Orientation;
  lengthM: number;
  heightEnvContactM: number;
  heightGroundContactM: number;
  openings: EnvelopeOpeningInput[];
}

export interface ConstructionTypeUValueInput {
  id: string;
  /** Stable code (`Wall 1`…) — survives `PUT /envelope`'s re-creation of the type rows. */
  code?: string;
  scenario: Scenario;
  retrofitOfId: string | null;
  uValueWPerM2K: number;
}

export interface OpeningTypeUValueInput {
  /** The "before" type this after-type replaces (`opening_type.retrofit_of_id`); null/absent = unlinked. */
  retrofitOfId?: string | null;
  id: string;
  code?: string;
  category: "window" | "door";
  scenario: Scenario;
  uValueWPerM2K: number;
  gValue: number | null;
  frameFactor: number | null;
  shadingFactor: number;
}

/**
 * Resolves which opening type governs a given opening for a scenario.
 * Before-scenario: the opening's own assigned type. After-scenario (F07, same semantics as
 * construction types): the after-type whose `retrofitOfId` points at the opening's type (matched by
 * code, so every size of one type code shares the replacement); an opening whose type nothing
 * replaces keeps its own type. Legacy data — after-types of the category exist but none has
 * `retrofitOfId` — keeps the old behaviour (the first after-type governs every opening of the
 * category); `hasUnlinkedAfterOpeningTypes()` lets the engine warn about it.
 */
export function getEffectiveOpeningType(
  openingTypeId: string,
  openingTypes: OpeningTypeUValueInput[],
  category: "window" | "door",
  scenario: Scenario,
): OpeningTypeUValueInput | undefined {
  const own = openingTypes.find((o) => o.id === openingTypeId);
  if (scenario === "before") return own;

  const afterTypes = openingTypes.filter((o) => o.scenario === "after" && o.category === category);
  if (afterTypes.length === 0) return own;
  if (!afterTypes.some((o) => o.retrofitOfId)) return afterTypes[0] ?? own;

  const codeById = new Map(openingTypes.map((o) => [o.id, o.code]));
  const ownCode = own?.code;
  const replacement = afterTypes.find(
    (o) => o.retrofitOfId && ownCode !== undefined && codeById.get(o.retrofitOfId) === ownCode,
  );
  return replacement ?? own;
}

/** Warnings for after opening types that do not say which before type they replace (F07). */
export function collectOpeningRetrofitWarnings(openingTypes: OpeningTypeUValueInput[]): string[] {
  const out: string[] = [];
  for (const category of ["window", "door"] as const) {
    const after = openingTypes.filter((o) => o.scenario === "after" && o.category === category);
    const unlinked = after.filter((o) => !o.retrofitOfId);
    if (unlinked.length === 0) continue;
    const codes = unlinked.map((o) => o.code ?? o.id).join(", ");
    out.push(
      unlinked.length === after.length
        ? `Opening type(s) ${codes} (after): it is not specified which ${category} type each replaces — the first one was applied to every ${category}.`
        : `Opening type(s) ${codes} (after): it is not specified which ${category} type each replaces — not applied.`,
    );
  }
  return out;
}

export interface BuildingBlockInput {
  footprintLengthM: number;
  footprintWidthM: number;
  numberOfFloors: number;
  floorToFloorHeightM: number;
  perimeterM: number;
  perimeterLossCoefficient: number;
}

/**
 * `Envelope` sheet's footprint-block calc: `G=footprint*floors`,
 * `K=(perimeter*lossCoefficient)*floors`, `L=G-K` (net heated floor area),
 * `M=L*floorHeight` (net heated volume).
 */
export function calculateBuildingBlockAreas(block: BuildingBlockInput): {
  netFloorAreaM2: number;
  netVolumeM3: number;
} {
  const footprintAreaM2 = block.footprintLengthM * block.footprintWidthM;
  const grossFloorAreaM2 = footprintAreaM2 * block.numberOfFloors;
  const perimeterLossM2 = block.perimeterM * block.perimeterLossCoefficient * block.numberOfFloors;
  const netFloorAreaM2 = Math.max(0, grossFloorAreaM2 - perimeterLossM2);
  const netVolumeM3 = netFloorAreaM2 * block.floorToFloorHeightM;
  return { netFloorAreaM2, netVolumeM3 };
}

function openingAreaM2(opening: EnvelopeOpeningInput): number {
  return opening.widthM * opening.heightM * opening.count;
}

function netElementAreaM2(element: EnvelopeElementInput): number {
  const grossAreaM2 = element.lengthM * (element.heightEnvContactM + element.heightGroundContactM);
  const totalOpeningAreaM2 = element.openings.reduce((sum, o) => sum + openingAreaM2(o), 0);
  return Math.max(0, grossAreaM2 - totalOpeningAreaM2);
}

/**
 * Net area per envelope element category, in m². Geometry is the same
 * before/after renovation (only U-values change) so this is computed once.
 */
export function calculateEnvelopeAreas(elements: EnvelopeElementInput[]): EnvelopeAreaBreakdown {
  const breakdown: EnvelopeAreaBreakdown = {
    externalWallAreaM2: 0,
    socleAreaM2: 0,
    roofAreaM2: 0,
    floorAreaM2: 0,
    windowAreaM2: 0,
    doorAreaM2: 0,
    totalOpaqueAreaM2: 0,
  };

  for (const element of elements) {
    const netAreaM2 = netElementAreaM2(element);
    switch (element.elementCategory) {
      case "external_wall":
        breakdown.externalWallAreaM2 += netAreaM2;
        break;
      case "socle_heated":
      case "socle_unheated":
      case "socle_ground":
        breakdown.socleAreaM2 += netAreaM2;
        break;
      case "roof":
        breakdown.roofAreaM2 += netAreaM2;
        break;
      case "floor":
        breakdown.floorAreaM2 += netAreaM2;
        break;
    }

    for (const opening of element.openings) {
      if (opening.openingCategory === "window") {
        breakdown.windowAreaM2 += openingAreaM2(opening);
      } else {
        breakdown.doorAreaM2 += openingAreaM2(opening);
      }
    }
  }

  breakdown.totalOpaqueAreaM2 =
    breakdown.externalWallAreaM2 +
    breakdown.socleAreaM2 +
    breakdown.roofAreaM2 +
    breakdown.floorAreaM2;

  return breakdown;
}

/**
 * Groups envelope elements/openings by category with an area-weighted U-value
 * for the given scenario, for `HeatLossService` to apply the degree-hour
 * method to. Mirrors `Losses env. before/after`'s per-type aggregation.
 *
 * For `scenario: "after"`, an element's construction type is swapped for
 * whichever construction type has `retrofitOfId` pointing back at it (falls
 * back to the element's own — i.e. unrenovated — type/U-value if no retrofit
 * type is defined, meaning that element wasn't targeted by a measure).
 * Openings consolidate the same way the workbook does: all before-scenario
 * openings of a category are replaced, in the after scenario, by a single
 * building-wide after-scenario opening type of that category (if one exists).
 */
export function resolveHeatLossGroups(
  elements: EnvelopeElementInput[],
  constructionTypes: ConstructionTypeUValueInput[],
  openingTypes: OpeningTypeUValueInput[],
  scenario: Scenario,
): HeatLossGroup[] {
  const constructionTypeById = new Map(constructionTypes.map((c) => [c.id, c]));
  const retrofitTargetByBeforeId = new Map(
    constructionTypes.filter((c) => c.retrofitOfId).map((c) => [c.retrofitOfId as string, c]),
  );

  // Groups are keyed by (category, *before* type code): the after scenario keeps the same groups so a
  // measure that replaces one type can be priced from that type's own before/after loss (F06b).
  type Accumulator = {
    category: string;
    typeCode?: string;
    areaM2: number;
    areaWeightedUValue: number;
  };
  const groupKey = (category: string, typeCode: string | undefined) =>
    `${category}\u0000${typeCode ?? ""}`;
  const opaqueGroups = new Map<string, Accumulator>();

  for (const element of elements) {
    const beforeType = constructionTypeById.get(element.constructionTypeId);
    if (!beforeType) continue;

    const effectiveType =
      scenario === "before"
        ? beforeType
        : (retrofitTargetByBeforeId.get(beforeType.id) ?? beforeType);

    const netAreaM2 = netElementAreaM2(element);
    const key = groupKey(element.elementCategory, beforeType.code);
    const existing = opaqueGroups.get(key) ?? {
      category: element.elementCategory,
      typeCode: beforeType.code,
      areaM2: 0,
      areaWeightedUValue: 0,
    };
    existing.areaM2 += netAreaM2;
    existing.areaWeightedUValue += netAreaM2 * effectiveType.uValueWPerM2K;
    opaqueGroups.set(key, existing);
  }

  const openingGroups = new Map<string, Accumulator>();

  for (const element of elements) {
    for (const opening of element.openings) {
      const areaM2 = openingAreaM2(opening);
      const category = opening.openingCategory;
      const effectiveType = getEffectiveOpeningType(
        opening.openingTypeId,
        openingTypes,
        category,
        scenario,
      );
      const uValueWPerM2K = effectiveType?.uValueWPerM2K ?? 0;

      const beforeCode = openingTypes.find((o) => o.id === opening.openingTypeId)?.code;
      const key = groupKey(category, beforeCode);
      const existing = openingGroups.get(key) ?? {
        category,
        typeCode: beforeCode,
        areaM2: 0,
        areaWeightedUValue: 0,
      };
      existing.areaM2 += areaM2;
      existing.areaWeightedUValue += areaM2 * uValueWPerM2K;
      openingGroups.set(key, existing);
    }
  }

  const toGroups = (map: Map<string, Accumulator>): HeatLossGroup[] =>
    Array.from(map.values())
      .filter((v) => v.areaM2 > 0)
      .map((v) => ({
        category: v.category as HeatLossGroup["category"],
        ...(v.typeCode !== undefined ? { typeCode: v.typeCode } : {}),
        areaM2: v.areaM2,
        uValueWPerM2K: v.areaWeightedUValue / v.areaM2,
      }));

  return [...toGroups(opaqueGroups), ...toGroups(openingGroups)];
}

export type EnvelopeElementCategory =
  | "external_wall"
  | "socle_heated"
  | "socle_unheated"
  | "socle_ground"
  | "roof"
  | "floor";

export type Orientation =
  | "north"
  | "south"
  | "east"
  | "west"
  | "northeast"
  | "northwest"
  | "southeast"
  | "southwest"
  | "horizontal";

export type Scenario = "before" | "after";

export interface MaterialLayerInput {
  materialId: string;
  thicknessM: number;
  thermalConductivityWPerMk: number;
}

export interface UValueResult {
  constructionTypeId: string;
  totalThermalResistanceM2KPerW: number;
  uValueWPerM2K: number;
}

/**
 * Net area by envelope element category, in m². Geometry doesn't change between
 * scenarios — retrofit changes U-values, not areas — so this is computed once.
 */
export interface EnvelopeAreaBreakdown {
  externalWallAreaM2: number;
  socleAreaM2: number;
  roofAreaM2: number;
  floorAreaM2: number;
  windowAreaM2: number;
  doorAreaM2: number;
  totalOpaqueAreaM2: number;
}

export interface HeatLossGroup {
  category: EnvelopeElementCategory | "window" | "door";
  /** Code of the *before* construction/opening type this group aggregates (absent for legacy callers). */
  typeCode?: string;
  areaM2: number;
  uValueWPerM2K: number;
}

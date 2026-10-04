export type EnvelopeElementCategory =
  | "external_wall"
  | "socle_heated"
  | "socle_unheated"
  | "socle_ground"
  | "roof"
  | "floor"
  | "floor_ground"
  | "floor_over_unheated";

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

/** One 2 m strip of the ground-floor zone method (v7.20 `U-values!Q113:U117`). */
export interface GroundFloorZone {
  zone: 1 | 2 | 3 | 4;
  /** Strip area of one sample block, m² (zone I includes the 4 corner squares counted twice). */
  areaM2: number;
  /** R of the non-insulated floor of this zone (ShNQ 2.01.04), m²K/W. */
  rNonInsulatedM2KPerW: number;
  /** R_i = R_ni,i + ΣR of the insulating layers, m²K/W. */
  rM2KPerW: number;
}

export interface GroundFloorUValue {
  lengthM: number;
  widthM: number;
  zones: GroundFloorZone[];
  /** ΣR of the layers with 0 < λ < 1.2 W/mK, m²K/W. */
  insulationResistanceM2KPerW: number;
  /** L·W — the divisor of U_eq (the +16 corner overlap is not in it). */
  realFloorAreaM2: number;
  uEqWPerM2K: number;
}

/** Ground-floor zone calculation of one construction type — `AuditResult.groundFloorZones` (Annex 2). */
export interface GroundFloorZonesResult extends GroundFloorUValue {
  constructionTypeCode: string;
  scenario: Scenario;
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

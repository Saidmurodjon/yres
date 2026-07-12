export type EnvelopeElementType =
  | "external_wall"
  | "roof"
  | "ground_floor"
  | "window"
  | "external_door"
  | "internal_partition";

export type ConstructionOrientation =
  | "north"
  | "south"
  | "east"
  | "west"
  | "horizontal";

export interface MaterialLayerInput {
  materialId: string;
  thicknessM: number;
}

export interface UValueResult {
  totalThermalResistanceM2KPerW: number;
  uValueWPerM2K: number;
}

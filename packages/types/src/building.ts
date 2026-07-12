export type BuildingType =
  | "residential_mfh"
  | "residential_sfh"
  | "office"
  | "school"
  | "kindergarten"
  | "hospital"
  | "administrative"
  | "other";

export type HeatingSource = "district_heating" | "gas_boiler" | "electric" | "coal" | "other";

export interface BuildingSummary {
  id: string;
  name: string;
  location: string;
  climateRegionId: string;
  buildingType: BuildingType;
  totalHeatedFloorArea: number;
  totalHeatedVolume: number;
  numberOfFloors: number;
  yearBuilt?: number;
}

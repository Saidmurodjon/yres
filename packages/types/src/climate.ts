export interface MonthlyClimateRecord {
  month: number;
  avgOutdoorTempC: number;
  solarRadiationHorizontalKwhM2: number;
  solarRadiationNorthKwhM2: number;
  solarRadiationSouthKwhM2: number;
  solarRadiationEastKwhM2: number;
  solarRadiationWestKwhM2: number;
  daysInHeatingSeason: number;
}

export interface ClimateRegionSummary {
  id: string;
  name: string;
  heatingDegreeDays: number;
  designOutdoorTempC: number;
  monthly: MonthlyClimateRecord[];
}

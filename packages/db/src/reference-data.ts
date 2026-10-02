import { LAMP_TYPE_NAMES } from "./schemas/materials";

/**
 * Global reference data every environment needs before an audit can run.
 * Pure data, no DB — the source for both `seedReferenceDataWithDb()` (tests)
 * and `scripts/build-reference-migration.ts` (the versioned D1 migration).
 *
 * Every value is transcribed from the source workbook (`3-DMTT v5.xlsx`, see
 * docs/data-dictionary.md) — nothing is invented. Where the workbook only
 * cited a subset of a larger table, only the cited subset is here.
 * Changing anything below means a NEW `generate --custom` migration
 * (INSERT OR IGNORE / UPDATE); an already-applied migration is never edited.
 */

export const UZS_PER_USD = 12024;
/** `energy_tariff.effective_date` of the initial reference migration. */
export const REFERENCE_EFFECTIVE_DATE = "2026-10-02";

// --- Materials (U-values sheet, Y7:Z46 conductivity table) ---
// Full transcription of that lookup table (previously only ~9 of its ~38
// rows were captured). A few source rows were left out rather than added
// as near-duplicates: "Expanded polysterene EPS", "Extruded polysterene
// XPS", and "Mineral wool MW" (plain) match the existing EPS/XPS/Mineral
// wool (MW) rows' values exactly and are the same material under a
// longer name. "Pol taxta" (Uzbek: floor board) and "Tsement-qum
// qorishmasi" (Uzbek: cement-sand mix) likewise duplicate "Wood (pine)"
// and "Concrete/sand mix" at the same conductivity. Rows the sheet only
// gave in Uzbek/Russian are translated here for consistency with every
// other row's English name — conductivity values are untouched.
export const MATERIALS = [
  { name: "Internal plaster", thermalConductivityWPerMk: 0.7 },
  { name: "External plaster", thermalConductivityWPerMk: 0.76 },
  { name: "Concrete", thermalConductivityWPerMk: 1.92 },
  { name: "Mineral wool (MW)", thermalConductivityWPerMk: 0.038 },
  { name: "EPS", thermalConductivityWPerMk: 0.038 },
  { name: "XPS", thermalConductivityWPerMk: 0.035 },
  { name: "Aerated concrete (YTONG)", thermalConductivityWPerMk: 0.41 },
  { name: "Bricks", thermalConductivityWPerMk: 0.7 },
  { name: "Expanded clay", thermalConductivityWPerMk: 0.17 },
  { name: "Concrete mixed with EPS (G-Sort)", thermalConductivityWPerMk: 0.07 },
  { name: "Concrete with stones", thermalConductivityWPerMk: 1.74 },
  { name: "Polystyrene concrete (Polistirolbeton)", thermalConductivityWPerMk: 0.055 },
  { name: "Concrete with expanded clay", thermalConductivityWPerMk: 0.52 },
  { name: "Aggregated slag (from boilers)", thermalConductivityWPerMk: 0.76 },
  { name: "Ruberoid", thermalConductivityWPerMk: 0.17 },
  { name: "Bitumen polymeric materials", thermalConductivityWPerMk: 0.27 },
  { name: "Wood (pine)", thermalConductivityWPerMk: 0.29 },
  { name: "Mosaic", thermalConductivityWPerMk: 1.74 },
  { name: "Marble", thermalConductivityWPerMk: 2.91 },
  { name: "Granite", thermalConductivityWPerMk: 3.49 },
  { name: "Concrete/sand mix", thermalConductivityWPerMk: 0.76 },
  { name: "Limestone", thermalConductivityWPerMk: 0.73 },
  { name: "Hollow bricks", thermalConductivityWPerMk: 0.58 },
  { name: "Linoleum", thermalConductivityWPerMk: 0.35 },
  { name: "Tile", thermalConductivityWPerMk: 1.1 },
  { name: "Clay layer with straw", thermalConductivityWPerMk: 0.65 },
  { name: "Magnesium oxide board", thermalConductivityWPerMk: 0.21 },
  {
    name: "Concrete hollow panels (220mm)",
    thermalConductivityWPerMk: 1.295,
  },
  { name: "Decorative stone", thermalConductivityWPerMk: 2.1 },
  { name: "Synthetic foam gasket (Sintipon)", thermalConductivityWPerMk: 0.04 },
  { name: "Vapor/waterproofing membrane", thermalConductivityWPerMk: 0.4 },
  { name: "Slate sheet", thermalConductivityWPerMk: 0.01 },
  { name: "Gypsum (plaster)", thermalConductivityWPerMk: 0.35 },
  { name: "Gypsum plasterboard (drywall)", thermalConductivityWPerMk: 0.19 },
  { name: "Lime-sand mortar", thermalConductivityWPerMk: 0.7 },
  { name: "Parquet/laminate/linoleum flooring", thermalConductivityWPerMk: 0.38 },
  { name: "Mineral wool MW 150", thermalConductivityWPerMk: 0.22 },
] as const;

// --- Surface thermal resistances (U-values sheet, per SM SR EN ISO 6946) ---
// The workbook cites "per SM SR EN ISO 6946" without capturing its exact
// Rint/Rext numbers in the analyzed dump, so these are the standard's own
// published Table 1 values for the corresponding heat-flow direction —
// horizontal for walls, upward for roofs, downward for floors. Socle
// (basement wall) and ground-contact categories use standard simplified
// proxies; true ground-contact resistance is more accurately modeled by
// EN ISO 13370, out of scope for this steady-state U-value calculator.
export const SURFACE_RESISTANCES = [
  {
    elementCategory: "external_wall",
    interiorResistanceM2kPerW: 0.13,
    exteriorResistanceM2kPerW: 0.04,
  },
  {
    elementCategory: "roof",
    interiorResistanceM2kPerW: 0.1,
    exteriorResistanceM2kPerW: 0.04,
  },
  {
    elementCategory: "floor",
    interiorResistanceM2kPerW: 0.17,
    exteriorResistanceM2kPerW: 0.04,
  },
  {
    elementCategory: "socle_heated",
    interiorResistanceM2kPerW: 0.13,
    exteriorResistanceM2kPerW: 0.13,
  },
  {
    elementCategory: "socle_unheated",
    interiorResistanceM2kPerW: 0.13,
    exteriorResistanceM2kPerW: 0.13,
  },
  {
    elementCategory: "socle_ground",
    interiorResistanceM2kPerW: 0.13,
    exteriorResistanceM2kPerW: 0.04,
  },
] as const;

// --- Pipe loss reference (Heat distr. efficiency sheet, P9:U11 / P17:Q19) ---
// Only the 60°C insulated column and the single non-insulated column were
// cited in analysis (the values this project instance actually used);
// the workbook's other mean-fluid-temperature columns (≤50/70/80/≥90°C)
// weren't captured and aren't fabricated here.
export const PIPE_LOSS_REFERENCES = [
  {
    diameterClass: "15-25",
    insulated: "non_insulated",
    meanFluidTempC: null,
    maxHeatFluxWPerM: 47,
  },
  {
    diameterClass: "32-50",
    insulated: "non_insulated",
    meanFluidTempC: null,
    maxHeatFluxWPerM: 74,
  },
  {
    diameterClass: "65-100",
    insulated: "non_insulated",
    meanFluidTempC: null,
    maxHeatFluxWPerM: 140,
  },
  {
    diameterClass: "15-25",
    insulated: "insulated",
    meanFluidTempC: 60,
    maxHeatFluxWPerM: 11,
  },
  {
    diameterClass: "32-50",
    insulated: "insulated",
    meanFluidTempC: 60,
    maxHeatFluxWPerM: 14,
  },
  {
    diameterClass: "65-100",
    insulated: "insulated",
    meanFluidTempC: 60,
    maxHeatFluxWPerM: 19,
  },
] as const;

// --- Lamp power densities (Lighting sheet, Q7:R11) ---
export const LAMP_TYPES = [
  { name: LAMP_TYPE_NAMES.incandescent, powerDensityWPerM2: 25 },
  { name: LAMP_TYPE_NAMES.fluorescentElectromagnetic, powerDensityWPerM2: 17.8 },
  { name: LAMP_TYPE_NAMES.fluorescentElectronic, powerDensityWPerM2: 14.81 },
  { name: LAMP_TYPE_NAMES.led, powerDensityWPerM2: 7.4 },
] as const;

// --- Energy tariffs (Measures_summary sheet, D39:D48 + O39 exchange rate) ---
// Native-unit prices (so'm/m³ gas, so'm/Gcal district heat) converted to
// so'm/kWh using the workbook's own calorific-value constants (9.5 kWh/m³
// gas, 1163 kWh/Gcal). Coal's native-unit conversion was flagged in
// analysis as ambiguous (an unexplained combined divisor), so its
// unitCostLocal is instead derived from the workbook's own cited
// unitCostUsd × exchange rate, rather than guessing at that divisor.
export const ENERGY_TARIFFS = [
  {
    energyCarrier: "gas",
    unitCostLocal: 2500 / 9.5,
    unitCostUsd: 0.0219,
    emissionFactorKgCo2PerKwh: 0.198,
    primaryEnergyFactor: 1.36,
    exchangeRateLocalPerUsd: UZS_PER_USD,
  },
  {
    energyCarrier: "electricity",
    unitCostLocal: 1100,
    unitCostUsd: 0.0915,
    emissionFactorKgCo2PerKwh: 0.585,
    primaryEnergyFactor: 2.789,
    exchangeRateLocalPerUsd: UZS_PER_USD,
  },
  {
    energyCarrier: "district_heat",
    unitCostLocal: 700_000 / 1163,
    unitCostUsd: 0.0501,
    emissionFactorKgCo2PerKwh: 0.05,
    primaryEnergyFactor: 1.36,
    exchangeRateLocalPerUsd: UZS_PER_USD,
  },
  {
    energyCarrier: "coal",
    unitCostLocal: 0.0156 * UZS_PER_USD,
    unitCostUsd: 0.0156,
    emissionFactorKgCo2PerKwh: 0.38,
    primaryEnergyFactor: 1,
    exchangeRateLocalPerUsd: UZS_PER_USD,
  },
] as const;

// --- Climate region: Tashkent (Sheet1 + Losses env. before + gains sheets) ---
export const CLIMATE_REGION = {
  name: "Tashkent",
  designOutdoorTempC: -14, // Building_data!D11, coldest-5-days design temp
  avgAnnualTempC: 14.8, // Sheet1!N5
  minAbsoluteTempC: -29.5, // Sheet1!O5 ("-29.5/1930")
  maxAbsoluteTempC: 44.6, // Sheet1!P5 ("44.6/1997")
} as const;

// Heating-season months (Oct-Apr): avg temp + heating-season day count
// from `Losses env. before`!M34:T38 (the exact partial-month windows
// the workbook's degree-hour calc uses — sums to the building's
// documented 163-day heating season) and solar radiation from
// `gains`!N4:T11. Non-heating months (May-Sep): avg temp from Sheet1's
// Tashkent row, solar radiation from `Cooling`!W27:AB35's summer table
// (partial-month-weighted May/Sep columns already halved in-sheet).
export const CLIMATE_MONTHLY_NORMALS = [
  {
    month: 1,
    avgOutdoorTempC: -0.1,
    heatingDaysInMonth: 28,
    isHeatingSeasonMonth: true,
    solarRadiationSouthKwhM2: 65,
    solarRadiationNorthKwhM2: 17.7,
    solarRadiationEastWestKwhM2: 28.5,
    solarRadiationSeSwKwhM2: 51.2,
    solarRadiationNeNwKwhM2: 18.7,
    solarRadiationHorizontalKwhM2: 33.5,
  },
  {
    month: 2,
    avgOutdoorTempC: 2.5,
    heatingDaysInMonth: 25,
    isHeatingSeasonMonth: true,
    solarRadiationSouthKwhM2: 76.3,
    solarRadiationNorthKwhM2: 21.9,
    solarRadiationEastWestKwhM2: 38.9,
    solarRadiationSeSwKwhM2: 62.3,
    solarRadiationNeNwKwhM2: 24.4,
    solarRadiationHorizontalKwhM2: 49.8,
  },
  {
    month: 3,
    avgOutdoorTempC: 8.6,
    heatingDaysInMonth: 28,
    isHeatingSeasonMonth: true,
    solarRadiationSouthKwhM2: 96,
    solarRadiationNorthKwhM2: 29.3,
    solarRadiationEastWestKwhM2: 61.3,
    solarRadiationSeSwKwhM2: 85,
    solarRadiationNeNwKwhM2: 37.5,
    solarRadiationHorizontalKwhM2: 91.5,
  },
  {
    month: 4,
    avgOutdoorTempC: 15.3,
    heatingDaysInMonth: 12,
    isHeatingSeasonMonth: true,
    solarRadiationSouthKwhM2: 20.1,
    solarRadiationNorthKwhM2: 7.9,
    solarRadiationEastWestKwhM2: 16.7,
    solarRadiationSeSwKwhM2: 20.1,
    solarRadiationNeNwKwhM2: 11.6,
    solarRadiationHorizontalKwhM2: 28.3,
  },
  {
    month: 5,
    avgOutdoorTempC: 20.5,
    isHeatingSeasonMonth: false,
    solarRadiationSouthKwhM2: 31.5,
    solarRadiationNorthKwhM2: 26.5,
    solarRadiationEastWestKwhM2: 59,
    solarRadiationSeSwKwhM2: 52.5,
    solarRadiationNeNwKwhM2: 45,
    solarRadiationHorizontalKwhM2: 119.7,
  },
  {
    month: 6,
    avgOutdoorTempC: 25.8,
    isHeatingSeasonMonth: false,
    solarRadiationSouthKwhM2: 65,
    solarRadiationNorthKwhM2: 54,
    solarRadiationEastWestKwhM2: 125,
    solarRadiationSeSwKwhM2: 111,
    solarRadiationNeNwKwhM2: 93,
    solarRadiationHorizontalKwhM2: 244.7,
  },
  {
    month: 7,
    avgOutdoorTempC: 27.8,
    isHeatingSeasonMonth: false,
    solarRadiationSouthKwhM2: 68,
    solarRadiationNorthKwhM2: 53,
    solarRadiationEastWestKwhM2: 135,
    solarRadiationSeSwKwhM2: 120,
    solarRadiationNeNwKwhM2: 98,
    solarRadiationHorizontalKwhM2: 243.6,
  },
  {
    month: 8,
    avgOutdoorTempC: 26.2,
    isHeatingSeasonMonth: false,
    solarRadiationSouthKwhM2: 61,
    solarRadiationNorthKwhM2: 44,
    solarRadiationEastWestKwhM2: 106,
    solarRadiationSeSwKwhM2: 99,
    solarRadiationNeNwKwhM2: 76,
    solarRadiationHorizontalKwhM2: 204.4,
  },
  {
    month: 9,
    avgOutdoorTempC: 20.6,
    isHeatingSeasonMonth: false,
    solarRadiationSouthKwhM2: 31,
    solarRadiationNorthKwhM2: 17,
    solarRadiationEastWestKwhM2: 39.5,
    solarRadiationSeSwKwhM2: 41,
    solarRadiationNeNwKwhM2: 24.5,
    solarRadiationHorizontalKwhM2: 81.8,
  },
  {
    month: 10,
    avgOutdoorTempC: 12.4,
    heatingDaysInMonth: 15,
    isHeatingSeasonMonth: true,
    solarRadiationSouthKwhM2: 24.3,
    solarRadiationNorthKwhM2: 5.8,
    solarRadiationEastWestKwhM2: 12.7,
    solarRadiationSeSwKwhM2: 20.3,
    solarRadiationNeNwKwhM2: 7,
    solarRadiationHorizontalKwhM2: 19.9,
  },
  {
    month: 11,
    avgOutdoorTempC: 6.6,
    heatingDaysInMonth: 27,
    isHeatingSeasonMonth: true,
    solarRadiationSouthKwhM2: 60.8,
    solarRadiationNorthKwhM2: 13.1,
    solarRadiationEastWestKwhM2: 24,
    solarRadiationSeSwKwhM2: 48,
    solarRadiationNeNwKwhM2: 14.3,
    solarRadiationHorizontalKwhM2: 37.5,
  },
  {
    month: 12,
    avgOutdoorTempC: 1.2,
    heatingDaysInMonth: 28,
    isHeatingSeasonMonth: true,
    solarRadiationSouthKwhM2: 58.4,
    solarRadiationNorthKwhM2: 11.5,
    solarRadiationEastWestKwhM2: 20,
    solarRadiationSeSwKwhM2: 44.5,
    solarRadiationNeNwKwhM2: 11.7,
    solarRadiationHorizontalKwhM2: 26.7,
  },
] as const;

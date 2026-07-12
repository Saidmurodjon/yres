import type { BatchItem } from "drizzle-orm/batch";
import { type Database, createDb } from "./index";
import {
  climateMonthlyNormal,
  climateRegion,
  energyTariff,
  lampType,
  material,
  pipeLossReference,
  surfaceResistance,
} from "./schemas";

/**
 * Populates the global reference tables every environment needs before an
 * audit can be run: construction materials, surface resistances, pipe-loss
 * lookup tables, one seeded climate region (Tashkent) with real monthly
 * normals, energy tariffs, and lamp power densities.
 *
 * Every value here is transcribed from the source workbook
 * (`3-DMTT v5.xlsx`, see docs/data-dictionary.md) — nothing is invented.
 * Where the workbook only cited a subset of a larger reference table (e.g.
 * ~40 materials exist in the sheet but only ~9 were captured in analysis,
 * or the pipe-loss table's other mean-fluid-temperature columns), only the
 * cited subset is seeded rather than fabricating the rest.
 *
 * Safe to re-run: exits early if reference data already appears seeded
 * (checked via the Tashkent climate region), and the actual insert is one
 * atomic `db.batch()` — either everything lands or nothing does, so a
 * failed run can't leave duplicate-prone partial state for the next run to
 * trip over (the neon-http driver has no interactive transactions; see
 * apps/api/src/routes/envelope.ts for the same pattern/rationale).
 */
export async function seedReferenceData(databaseUrl: string) {
  await seedReferenceDataWithDb(createDb(databaseUrl));
}

/**
 * Same as {@link seedReferenceData}, but takes an already-constructed
 * Drizzle client — lets this run against any Postgres driver satisfying the
 * schema (e.g. `node-postgres` for local testing against a non-Neon
 * database), not just the Neon HTTP client `createDb` builds.
 */
export async function seedReferenceDataWithDb(db: Database) {
  const [existingRegion] = await db.select({ id: climateRegion.id }).from(climateRegion).limit(1);
  if (existingRegion) {
    console.log("Reference data already seeded (found an existing climate region) — skipping.");
    return;
  }

  const tashkentId = crypto.randomUUID();
  const UZS_PER_USD = 12024;
  const effectiveDate = new Date().toISOString().slice(0, 10);

  const statements: BatchItem<"pg">[] = [
    // --- Materials (U-values sheet, Y7:Z46 conductivity table) ---
    db
      .insert(material)
      .values([
        { name: "Internal plaster", thermalConductivityWPerMk: 0.7 },
        { name: "External plaster", thermalConductivityWPerMk: 0.76 },
        { name: "Concrete", thermalConductivityWPerMk: 1.92 },
        { name: "Mineral wool (MW)", thermalConductivityWPerMk: 0.038 },
        { name: "EPS", thermalConductivityWPerMk: 0.038 },
        { name: "XPS", thermalConductivityWPerMk: 0.035 },
        { name: "Aerated concrete (YTONG)", thermalConductivityWPerMk: 0.41 },
        { name: "Bricks", thermalConductivityWPerMk: 0.7 },
        { name: "Expanded clay", thermalConductivityWPerMk: 0.17 },
      ])
      .onConflictDoNothing({ target: material.name }),

    // --- Surface thermal resistances (U-values sheet, per SM SR EN ISO 6946) ---
    // The workbook cites "per SM SR EN ISO 6946" without capturing its exact
    // Rint/Rext numbers in the analyzed dump, so these are the standard's own
    // published Table 1 values for the corresponding heat-flow direction —
    // horizontal for walls, upward for roofs, downward for floors. Socle
    // (basement wall) and ground-contact categories use standard simplified
    // proxies; true ground-contact resistance is more accurately modeled by
    // EN ISO 13370, out of scope for this steady-state U-value calculator.
    db
      .insert(surfaceResistance)
      .values([
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
      ])
      .onConflictDoNothing({ target: surfaceResistance.elementCategory }),

    // --- Pipe loss reference (Heat distr. efficiency sheet, P9:U11 / P17:Q19) ---
    // Only the 60°C insulated column and the single non-insulated column were
    // cited in analysis (the values this project instance actually used);
    // the workbook's other mean-fluid-temperature columns (≤50/70/80/≥90°C)
    // weren't captured and aren't fabricated here.
    db
      .insert(pipeLossReference)
      .values([
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
      ]),

    // --- Lamp power densities (Lighting sheet, Q7:R11) ---
    db
      .insert(lampType)
      .values([
        { name: "Incandescent", powerDensityWPerM2: 25 },
        { name: "Fluorescent (electromagnetic ballast)", powerDensityWPerM2: 17.8 },
        { name: "Fluorescent (electronic ballast)", powerDensityWPerM2: 14.81 },
        { name: "LED 600×600 37W", powerDensityWPerM2: 7.4 },
      ])
      .onConflictDoNothing({ target: lampType.name }),

    // --- Energy tariffs (Measures_summary sheet, D39:D48 + O39 exchange rate) ---
    // Native-unit prices (so'm/m³ gas, so'm/Gcal district heat) converted to
    // so'm/kWh using the workbook's own calorific-value constants (9.5 kWh/m³
    // gas, 1163 kWh/Gcal). Coal's native-unit conversion was flagged in
    // analysis as ambiguous (an unexplained combined divisor), so its
    // unitCostLocal is instead derived from the workbook's own cited
    // unitCostUsd × exchange rate, rather than guessing at that divisor.
    db
      .insert(energyTariff)
      .values([
        {
          energyCarrier: "gas",
          unitCostLocal: 2500 / 9.5,
          unitCostUsd: 0.0219,
          emissionFactorKgCo2PerKwh: 0.198,
          primaryEnergyFactor: 1.36,
          exchangeRateLocalPerUsd: UZS_PER_USD,
          effectiveDate,
        },
        {
          energyCarrier: "electricity",
          unitCostLocal: 1100,
          unitCostUsd: 0.0915,
          emissionFactorKgCo2PerKwh: 0.585,
          primaryEnergyFactor: 2.789,
          exchangeRateLocalPerUsd: UZS_PER_USD,
          effectiveDate,
        },
        {
          energyCarrier: "district_heat",
          unitCostLocal: 700_000 / 1163,
          unitCostUsd: 0.0501,
          emissionFactorKgCo2PerKwh: 0.05,
          primaryEnergyFactor: 1.36,
          exchangeRateLocalPerUsd: UZS_PER_USD,
          effectiveDate,
        },
        {
          energyCarrier: "coal",
          unitCostLocal: 0.0156 * UZS_PER_USD,
          unitCostUsd: 0.0156,
          emissionFactorKgCo2PerKwh: 0.38,
          primaryEnergyFactor: 1,
          exchangeRateLocalPerUsd: UZS_PER_USD,
          effectiveDate,
        },
      ]),

    // --- Climate region: Tashkent (Sheet1 + Losses env. before + gains sheets) ---
    db
      .insert(climateRegion)
      .values({
        id: tashkentId,
        name: "Tashkent",
        designOutdoorTempC: -14, // Building_data!D11, coldest-5-days design temp
        avgAnnualTempC: 14.8, // Sheet1!N5
        minAbsoluteTempC: -29.5, // Sheet1!O5 ("-29.5/1930")
        maxAbsoluteTempC: 44.6, // Sheet1!P5 ("44.6/1997")
      }),

    // Heating-season months (Oct-Apr): avg temp + heating-season day count
    // from `Losses env. before`!M34:T38 (the exact partial-month windows
    // the workbook's degree-hour calc uses — sums to the building's
    // documented 163-day heating season) and solar radiation from
    // `gains`!N4:T11. Non-heating months (May-Sep): avg temp from Sheet1's
    // Tashkent row, solar radiation from `Cooling`!W27:AB35's summer table
    // (partial-month-weighted May/Sep columns already halved in-sheet).
    db
      .insert(climateMonthlyNormal)
      .values([
        {
          climateRegionId: tashkentId,
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
          climateRegionId: tashkentId,
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
          climateRegionId: tashkentId,
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
          climateRegionId: tashkentId,
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
          climateRegionId: tashkentId,
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
          climateRegionId: tashkentId,
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
          climateRegionId: tashkentId,
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
          climateRegionId: tashkentId,
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
          climateRegionId: tashkentId,
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
          climateRegionId: tashkentId,
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
          climateRegionId: tashkentId,
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
          climateRegionId: tashkentId,
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
      ]),
  ];

  await db.batch(statements as [BatchItem<"pg">, ...BatchItem<"pg">[]]);
}

if (import.meta.main) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  seedReferenceData(databaseUrl)
    .then(() => {
      console.log("Reference data seeded.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seed failed:", error);
      process.exit(1);
    });
}

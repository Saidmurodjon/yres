import type { building } from "@yres/db";
import type { AuditResult, EnergyMeasureResult } from "@yres/types";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { generateAuditReportPdf, type ReportExtras } from "../../src/services/report.service";

type Building = typeof building.$inferSelect;

/**
 * generateAuditReportPdf() has no unit test coverage anywhere else — a
 * previous manual check (not committed, see PROGRESS.md) caught a real
 * crash (a "λ" glyph pdf-lib's WinAnsiEncoding can't encode) that
 * type-check/lint didn't, because the string was valid TypeScript. These
 * tests exist specifically to keep exercising the actual PDF generation
 * path, not just its types.
 */

function buildingFixture(overrides: Partial<Building> = {}): Building {
  return {
    id: "b1",
    userId: "u1",
    name: "Test School",
    location: "Tashkent",
    climateRegionId: "c1",
    buildingType: "school",
    yearBuilt: 1985,
    status: "not_started",
    deadline: null,
    latitude: 41.2995,
    longitude: 69.2401,
    netCooledFloorAreaM2: 2000,
    heatingSeasonDurationDays: 163,
    indoorTempNonOperationC: 14,
    indoorTempOperationC: 22,
    outdoorAvgHeatingSeasonTempC: 3.9,
    outdoorDesignTempC: -14,
    nonOperationHoursPerDay: 14,
    operationHoursPerDay: 10,
    occupantCount: 418,
    coolingEnthalpyInsideKjKg: 48.4,
    coolingEnthalpyOutsideKjKg: 59.5,
    coolingEnthalpyHottestDayKjKg: 69.13,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Building;
}

function measureFixture(overrides: Partial<EnergyMeasureResult> = {}): EnergyMeasureResult {
  const buildCashflow = (firstYear: number, invest: number) =>
    Array.from({ length: 21 }, (_, y) => ({
      year: y,
      capex: y === 0 ? invest : 0,
      grossSavings: y === 0 ? 0 : firstYear,
      maintenanceCost: 0,
      netCashflow: y === 0 ? -invest : firstYear,
      discountedNetCashflow: (y === 0 ? -invest : firstYear) / 1.04 ** y,
      cumulativeDiscountedCashflow: 0,
    }));

  return {
    measureId: "m1",
    name: "Wall insulation",
    category: "envelope_wall_insulation",
    investmentCostUsd: 30000,
    standardizedAnnualSavingsKwh: 100000,
    standardizedAnnualSavingsUsd: 4000,
    actualAnnualSavingsKwh: 90000,
    actualAnnualSavingsUsd: 3600,
    simplePaybackYears: 7.5,
    lifetimeYears: 20,
    co2ReductionTonnesPerYear: 5,
    proposedForImplementation: true,
    standardized: {
      npv: 10000,
      irr: 0.12,
      simplePaybackYears: 7.5,
      discountedPaybackYears: 9,
      discountRate: 0.04,
      analysisHorizonYears: 20,
    },
    actual: {
      npv: 8000,
      irr: 0.1,
      simplePaybackYears: 8.3,
      discountedPaybackYears: 10,
      discountRate: 0.04,
      analysisHorizonYears: 20,
    },
    standardizedCashflow: buildCashflow(4000, 30000),
    actualCashflow: buildCashflow(3600, 30000),
    ...overrides,
  };
}

function fullResultFixture(): AuditResult {
  const monthly = <T>(build: (month: number) => T) =>
    Array.from({ length: 12 }, (_, i) => build(i + 1));

  return {
    buildingId: "b1",
    generatedAt: new Date().toISOString(),
    summary: {
      currentEnergyUseKwhPerM2Year: 200,
      potentialEnergyUseKwhPerM2Year: 100,
      potentialSavingsKwhPerM2Year: 100,
      co2ReductionTonnesPerYear: 12.3,
      totalInvestmentUsd: 50000,
      totalNonEeMeasureCostUsd: 5000,
      totalAnnualSavingsUsd: 8000,
      simplePaybackYears: 6.25,
    },
    envelopeAreas: {
      externalWallAreaM2: 1200,
      socleAreaM2: 100,
      roofAreaM2: 800,
      floorAreaM2: 800,
      windowAreaM2: 300,
      doorAreaM2: 20,
      totalOpaqueAreaM2: 2100,
    },
    envelopeHeatLoss: [
      {
        scenario: "before",
        monthly: monthly((month) => ({
          month,
          category: "external_wall",
          operationHoursLossKwh: 100 * month,
          nonOperationHoursLossKwh: 50 * month,
          totalKwh: 150 * month,
        })),
        annualByCategory: { external_wall: 1000 },
        annualTotalKwh: 1000,
      },
      {
        scenario: "after",
        monthly: monthly((month) => ({
          month,
          category: "external_wall",
          operationHoursLossKwh: 50 * month,
          nonOperationHoursLossKwh: 25 * month,
          totalKwh: 75 * month,
        })),
        annualByCategory: { external_wall: 500 },
        annualTotalKwh: 500,
      },
    ],
    ventilationLoss: [
      {
        scenario: "before",
        monthly: monthly((month) => ({
          month,
          naturalLossKwh: 10 * month,
          mechanicalLossKwh: 5 * month,
          totalKwh: 15 * month,
        })),
        naturalAnnualKwh: 100,
        mechanicalAnnualKwh: 50,
        mechanicalElectricalKwh: 5,
        totalKwh: 150,
      },
      {
        scenario: "after",
        monthly: monthly((month) => ({
          month,
          naturalLossKwh: 5 * month,
          mechanicalLossKwh: 2 * month,
          totalKwh: 7 * month,
        })),
        naturalAnnualKwh: 50,
        mechanicalAnnualKwh: 20,
        mechanicalElectricalKwh: 2,
        totalKwh: 70,
      },
    ],
    heatingEnergyBalance: [
      {
        scenario: "before",
        monthly: monthly((month) => ({
          month,
          heatingDays: 30,
          outdoorTempC: -5 + month,
          internalGainsKwh: 100,
          solarGainsKwh: 50,
          totalGainsKwh: 150,
          totalLossesKwh: 300,
          gainToLossRatio: 0.5,
          utilizationFactor: 0.9,
          netEnergyNeedKwh: 150,
        })),
        annualNetEnergyNeedKwh: 500000,
      },
      {
        scenario: "after",
        monthly: monthly((month) => ({
          month,
          heatingDays: 30,
          outdoorTempC: -5 + month,
          internalGainsKwh: 100,
          solarGainsKwh: 50,
          totalGainsKwh: 150,
          totalLossesKwh: 200,
          gainToLossRatio: 0.7,
          utilizationFactor: 0.95,
          netEnergyNeedKwh: 50,
        })),
        annualNetEnergyNeedKwh: 250000,
      },
    ],
    dhwDemand: [],
    distributionLoss: [],
    cooling: [],
    generation: [
      {
        sourceId: "s1",
        endUse: "heating",
        scenario: "before",
        usefulEnergyNeedKwh: 500000,
        shareOfDemand: 1,
        distributionLossKwh: 50000,
        efficiencyOrSeer: 0.8,
        finalEnergyConsumptionKwh: 600000,
        specificFinalEnergyKwhPerM2: 300,
      },
      {
        sourceId: "s1",
        endUse: "heating",
        scenario: "after",
        usefulEnergyNeedKwh: 250000,
        shareOfDemand: 1,
        distributionLossKwh: 20000,
        efficiencyOrSeer: 0.9,
        finalEnergyConsumptionKwh: 280000,
        specificFinalEnergyKwhPerM2: 140,
      },
    ],
    lighting: [],
    equipment: [],
    renewableProduction: [],
    finalEnergyByEndUse: [
      { endUse: "heating", scenario: "before", finalEnergyConsumptionKwh: 600000 },
      { endUse: "heating", scenario: "after", finalEnergyConsumptionKwh: 280000 },
    ],
    energyBalanceBreakdown: [
      { category: "external_wall", section: "envelope_ventilation_loss", beforeKwh: 100000, afterKwh: 40000 },
      { category: "roof", section: "envelope_ventilation_loss", beforeKwh: 80000, afterKwh: 30000 },
      { category: "gas", section: "final_energy", beforeKwh: 600000, afterKwh: 280000 },
      { category: "lighting", section: "final_energy", beforeKwh: 50000, afterKwh: 20000 },
    ],
    specificConsumptionSummary: [
      { endUse: "heating", actualKwhPerM2Year: 320, standardizedBeforeKwhPerM2Year: 300, standardizedAfterKwhPerM2Year: 140 },
      { endUse: "dhw", actualKwhPerM2Year: 25, standardizedBeforeKwhPerM2Year: 20, standardizedAfterKwhPerM2Year: 15 },
      { endUse: "electricity", actualKwhPerM2Year: 45, standardizedBeforeKwhPerM2Year: 40, standardizedAfterKwhPerM2Year: 30 },
    ],
    measures: [
      measureFixture(),
      measureFixture({
        measureId: "m2",
        name: "Not proposed measure",
        category: "lighting",
        proposedForImplementation: false,
      }),
    ],
    nonEeMeasures: [
      { id: "n1", description: "Cable replacement", unit: "m", quantity: 100, unitCostUsd: 10, totalCostUsd: 1000 },
    ],
  };
}

function fullExtrasFixture(): ReportExtras {
  return {
    uValues: [
      {
        code: "W1",
        elementCategory: "external_wall",
        scenario: "before",
        description: "Primary facade wall, floors 1-3.",
        layers: [
          { materialName: "Plaster", thicknessM: 0.02, thermalConductivityWPerMk: 0.7, resistanceM2KPerW: 0.029 },
          { materialName: "Brick", thicknessM: 0.5, thermalConductivityWPerMk: 0.73, resistanceM2KPerW: 0.68 },
        ],
        interiorResistanceM2kPerW: 0.13,
        exteriorResistanceM2kPerW: 0.04,
        totalThermalResistanceM2KPerW: 0.88,
        uValueWPerM2K: 1.14,
      },
    ],
    consumptionHistory: [
      {
        energyCarrier: "gas",
        months: Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          byYear: [
            { year: 2021, consumptionKwh: 1000 + i * 10, expenseLocal: 500 },
            { year: 2022, consumptionKwh: 1100 + i * 10, expenseLocal: 550 },
          ],
          averageConsumptionKwh: 1050 + i * 10,
        })),
        annualAverageConsumptionKwh: 13000,
      },
    ],
    tariffs: [{ energyCarrier: "gas", unitCostUsd: 0.05, emissionFactorKgCo2PerKwh: 0.2 }],
    annotations: {
      consumption_gas: "Gas meter was replaced in March 2022; readings before that are estimated.",
      final_energy: "District heating tariff increased mid-year, see Annex 2 for the split.",
    },
  };
}

function emptyResultFixture(): AuditResult {
  return {
    buildingId: "b1",
    generatedAt: new Date().toISOString(),
    summary: {
      currentEnergyUseKwhPerM2Year: 0,
      potentialEnergyUseKwhPerM2Year: 0,
      potentialSavingsKwhPerM2Year: 0,
      co2ReductionTonnesPerYear: 0,
      totalInvestmentUsd: 0,
      totalNonEeMeasureCostUsd: 0,
      totalAnnualSavingsUsd: 0,
      simplePaybackYears: null,
    },
    envelopeAreas: {
      externalWallAreaM2: 0,
      socleAreaM2: 0,
      roofAreaM2: 0,
      floorAreaM2: 0,
      windowAreaM2: 0,
      doorAreaM2: 0,
      totalOpaqueAreaM2: 0,
    },
    envelopeHeatLoss: [],
    ventilationLoss: [],
    heatingEnergyBalance: [],
    dhwDemand: [],
    distributionLoss: [],
    cooling: [],
    generation: [],
    lighting: [],
    equipment: [],
    renewableProduction: [],
    finalEnergyByEndUse: [],
    energyBalanceBreakdown: [],
    specificConsumptionSummary: [],
    measures: [],
    nonEeMeasures: [],
  };
}

function emptyExtrasFixture(): ReportExtras {
  return { uValues: [], consumptionHistory: [], tariffs: [] };
}

describe("generateAuditReportPdf", () => {
  it("renders a fully-populated audit into a valid, loadable multi-page PDF", async () => {
    const bytes = await generateAuditReportPdf(
      buildingFixture(),
      fullResultFixture(),
      fullExtrasFixture(),
      "en",
      undefined,
      "https://yres.example.com/verify/00000000-0000-0000-0000-000000000000",
    );

    expect(Buffer.from(bytes.slice(0, 5)).toString("utf-8")).toBe("%PDF-");
    const loaded = await PDFDocument.load(bytes);
    expect(loaded.getPageCount()).toBeGreaterThan(1);
  });

  it("renders a brand-new building with no data yet without throwing", async () => {
    const bytes = await generateAuditReportPdf(
      buildingFixture({ occupantCount: 0, coolingEnthalpyInsideKjKg: null }),
      emptyResultFixture(),
      emptyExtrasFixture(),
    );

    expect(Buffer.from(bytes.slice(0, 5)).toString("utf-8")).toBe("%PDF-");
    const loaded = await PDFDocument.load(bytes);
    expect(loaded.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it("excludes non-proposed measures from the cashflow detail section but still lists them in the summary tables", async () => {
    const result = fullResultFixture();
    // Sanity check on the fixture itself: one proposed, one not.
    expect(result.measures.filter((m) => m.proposedForImplementation)).toHaveLength(1);

    const bytes = await generateAuditReportPdf(buildingFixture(), result, fullExtrasFixture());
    expect(Buffer.from(bytes.slice(0, 5)).toString("utf-8")).toBe("%PDF-");
  });

  it.each(["ru", "uz"] as const)(
    "renders a fully-populated audit in %s without throwing",
    async (lang) => {
      const bytes = await generateAuditReportPdf(
        buildingFixture(),
        fullResultFixture(),
        fullExtrasFixture(),
        lang,
      );

      expect(Buffer.from(bytes.slice(0, 5)).toString("utf-8")).toBe("%PDF-");
      const loaded = await PDFDocument.load(bytes);
      expect(loaded.getPageCount()).toBeGreaterThan(1);
    },
  );
});

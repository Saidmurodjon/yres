import type { AuditResult, CashflowYear } from "@yres/types";
import type { AuditInputs } from "../../src/services/audit-inputs";
import { calculateBuildingBlockAreas } from "../../src/services/envelope.service";

/** What an accessor may return; `null` ↔ expected `kind: "none"`, strings ↔ `kind: "text"`. */
export type Actual = number | string | null | (number | null)[];
export type Accessor = (result: AuditResult, inputs: AuditInputs) => Actual;

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const yesNo = (flag: boolean) => (flag ? "Yes" : "No");

function heatLoss(scenario: "before" | "after", categories: string[] | null) {
  return (result: AuditResult): number => {
    const row = result.envelopeHeatLoss.find((r) => r.scenario === scenario);
    if (!row) return Number.NaN;
    if (!categories) return row.annualTotalKwh;
    return sum(categories.map((c) => row.annualByCategory[c] ?? 0));
  };
}

const WALLS = ["external_wall", "socle_heated", "socle_ground"];

export const MAPPING: Record<string, Accessor> = {
  "geometry.heatedFloorAreaM2": (_r, i) =>
    sum(i.blocks.map((b) => calculateBuildingBlockAreas(b).netFloorAreaM2)),
  "geometry.heatedVolumeM3": (_r, i) =>
    sum(i.blocks.map((b) => calculateBuildingBlockAreas(b).netVolumeM3)),

  "envelope.before.total.walls": heatLoss("before", WALLS),
  "envelope.before.total.roof": heatLoss("before", ["roof"]),
  "envelope.before.total.floor": heatLoss("before", ["floor"]),
  "envelope.before.total.windowsDoors": heatLoss("before", ["window", "door"]),
  "envelope.before.total.building": heatLoss("before", null),
  "envelope.after.total.walls": heatLoss("after", WALLS),
  "envelope.after.total.roof": heatLoss("after", ["roof"]),
  "envelope.after.total.floor": heatLoss("after", ["floor"]),
  "envelope.after.total.windowsDoors": heatLoss("after", ["window", "door"]),
  "envelope.after.total.building": heatLoss("after", null),

  "lighting.before.annualKwh": (r) =>
    r.lighting.find((l) => l.scenario === "before")?.annualConsumptionKwh ?? null,
  "lighting.after.annualKwh": (r) =>
    r.lighting.find((l) => l.scenario === "after")?.annualConsumptionKwh ?? null,
  "equipment.before.annualKwh": (r) =>
    r.equipment.find((l) => l.scenario === "before")?.annualConsumptionKwh ?? null,
  "equipment.after.annualKwh": (r) =>
    r.equipment.find((l) => l.scenario === "after")?.annualConsumptionKwh ?? null,
  "pv.annualProductionKwh": (r) =>
    r.renewableProduction.find((p) => p.systemType === "pv")?.annualProductionKwh ?? null,
  "solarDhw.annualKwh": (r) =>
    r.renewableProduction.find((p) => p.systemType === "solar_dhw")?.annualProductionKwh ?? null,
};

// `Overall gener. & distrib. eff.` rows. Excel keeps one row per source; the engine one result per source id.
type GenRow = AuditResult["generation"][number];
const genRow = (r: AuditResult, sourceId: string): GenRow | undefined =>
  r.generation.find((g) => g.sourceId === sourceId);
const genSum = (r: AuditResult, endUse: string, scenario: string, field: keyof GenRow): number =>
  sum(
    r.generation
      .filter((g) => g.endUse === endUse && g.scenario === scenario)
      .map((g) => g[field] as number),
  );
const genFields = {
  usefulNeedKwh: "usefulEnergyNeedKwh",
  distributionLossKwh: "distributionLossKwh",
  finalEnergyKwh: "finalEnergyConsumptionKwh",
  efficiency: "efficiencyOrSeer",
} as const;

const GENERATION_ROW_IDS = new Set([
  "generation.heating.boiler.before.usefulNeedKwh",
  "generation.heating.boiler.before.distributionLossKwh",
  "generation.heating.boiler.before.finalEnergyKwh",
  "generation.heating.boiler.after.usefulNeedKwh",
  "generation.heating.boiler.after.distributionLossKwh",
  "generation.heating.boiler.after.finalEnergyKwh",
  "generation.heating.boiler.after.efficiency",
  "generation.dhw.electricHeaters.before.usefulNeedKwh",
  "generation.dhw.electricHeaters.before.distributionLossKwh",
  "generation.dhw.electricHeaters.before.finalEnergyKwh",
  "generation.dhw.electricHeaters.after.usefulNeedKwh",
  "generation.dhw.electricHeaters.after.distributionLossKwh",
  "generation.dhw.electricHeaters.after.finalEnergyKwh",
  "generation.dhw.solar.after.usefulNeedKwh",
  "generation.dhw.solar.after.finalEnergyKwh",
]);

for (const [key, sourceId] of [
  ["heating.boiler.before", "gen-heating-before"],
  ["heating.boiler.after", "gen-heating-after"],
  ["dhw.electricHeaters.before", "gen-dhw-before"],
  ["dhw.electricHeaters.after", "gen-dhw-after"],
  ["dhw.solar.after", "gen-dhw-solar-after"],
] as const) {
  for (const [field, prop] of Object.entries(genFields)) {
    // Only the rows the workbook actually has (e.g. no efficiency cell for the DHW heaters).
    if (!GENERATION_ROW_IDS.has(`generation.${key}.${field}`)) continue;
    MAPPING[`generation.${key}.${field}`] = (r) => genRow(r, sourceId)?.[prop] ?? null;
  }
}
for (const [endUse, key] of [
  ["heating", "heating.total"],
  ["dhw", "dhw.total"],
] as const) {
  for (const scenario of ["before", "after"] as const) {
    MAPPING[`generation.${key}.${scenario}.usefulNeedKwh`] = (r) =>
      genSum(r, endUse, scenario, "usefulEnergyNeedKwh");
    MAPPING[`generation.${key}.${scenario}.finalEnergyKwh`] = (r) =>
      genSum(r, endUse, scenario, "finalEnergyConsumptionKwh");
  }
}
// Cooling is not a generation source in the engine: load / distribution loss / electricity come from CoolingResult.
for (const scenario of ["before", "after"] as const) {
  const cool = (r: AuditResult) => r.cooling.find((c) => c.scenario === scenario);
  MAPPING[`generation.cooling.split.${scenario}.usefulNeedKwh`] = (r) =>
    cool(r)?.totalCoolingLoadKwh ?? null;
  MAPPING[`generation.cooling.split.${scenario}.distributionLossKwh`] = (r) =>
    cool(r)?.distributionLossKwh ?? null;
  MAPPING[`generation.cooling.split.${scenario}.finalEnergyKwh`] = (r) =>
    cool(r)?.electricalEnergyForCoolingKwh ?? null;
}
MAPPING["generation.heatPump.copAfter"] = (r) =>
  genRow(r, "gen-heating-after")?.efficiencyOrSeer ?? null;
// H21 = H13 + H8, N21 = N13 + N8: heating + DHW, cooling excluded
MAPPING["generation.finalEnergy.totalBefore"] = (r) =>
  genSum(r, "heating", "before", "finalEnergyConsumptionKwh") +
  genSum(r, "dhw", "before", "finalEnergyConsumptionKwh");
MAPPING["generation.finalEnergy.totalAfter"] = (r) =>
  genSum(r, "heating", "after", "finalEnergyConsumptionKwh") +
  genSum(r, "dhw", "after", "finalEnergyConsumptionKwh");

// `Ventilation losses!I50 = Equipment!K85 + K86`: electricity of the "after" mechanical ventilation.
MAPPING["ventilation.mechanicalElectricalKwh"] = (r) =>
  r.ventilationLoss.find((v) => v.scenario === "after")?.mechanicalElectricalKwh ?? null;

// `Measures_summary!D71`: gains-utilisation correction applied to every envelope/ventilation measure.
MAPPING["balanceCheck.gainsUtilisationCorrection"] = (r) => r.gainsUtilizationCorrection;

type Measure = AuditResult["measures"][number];
const measureOf = (result: AuditResult, n: number): Measure | undefined =>
  result.measures.find((m) => m.measureId === `measure-${n}`);

const measureFields: Record<string, (m: Measure) => Actual> = {
  name: (m) => m.name,
  investmentUsd: (m) => m.investmentCostUsd,
  standardizedSavingsKwh: (m) => m.standardizedAnnualSavingsKwh,
  standardizedSavingsUsd: (m) => m.standardizedAnnualSavingsUsd,
  actualSavingsKwh: (m) => m.actualAnnualSavingsKwh,
  actualSavingsUsd: (m) => m.actualAnnualSavingsUsd,
  lifetimeYears: (m) => m.lifetimeYears,
  proposedForImplementation: (m) => yesNo(m.proposedForImplementation),
  simplePaybackStandardizedYears: (m) => m.standardized.simplePaybackYears,
  discountedPaybackStandardizedYears: (m) => m.standardized.discountedPaybackYears,
  simplePaybackActualYears: (m) => m.actual.simplePaybackYears,
  discountedPaybackActualYears: (m) => m.actual.discountedPaybackYears,
  npvStandardizedUsd: (m) => m.standardized.npv,
  irrStandardized: (m) => m.standardized.irr,
  co2ReductionTonnesPerYear: (m) => m.co2ReductionTonnesPerYear,
};

for (let n = 1; n <= 19; n++) {
  for (const [field, get] of Object.entries(measureFields)) {
    MAPPING[`measures.${n}.${field}`] = (r) => {
      const m = measureOf(r, n);
      return m ? get(m) : null;
    };
  }
  MAPPING[`financial.${n}.npvActualUsd`] = (r) => measureOf(r, n)?.actual.npv ?? null;
  MAPPING[`financial.${n}.irrActual`] = (r) => measureOf(r, n)?.actual.irr ?? null;
}

// Financial indicators rows 3-17: one column per year, year 0 (= base year) is the investment year.
const cashflowRows: Record<string, (c: CashflowYear[], baseYear: number) => (number | null)[]> = {
  years: (c, base) => c.map((y) => base + y.year),
  maintenanceUsd: (c) => c.map((y) => (y.year === 0 ? null : y.maintenanceCost)),
  grossStandardSavingsUsd: (c) => c.map((y) => y.grossSavings),
  netStandardSavingsUsd: (c) => c.map((y) => y.netCashflow),
  discountedStandardNetUsd: (c) => c.map((y) => y.discountedNetCashflow),
  accumulatedDiscountedStandardUsd: (c) => c.map((y) => y.cumulativeDiscountedCashflow),
};
for (const n of [1, 15]) {
  for (const [field, row] of Object.entries(cashflowRows)) {
    MAPPING[`financial.${n}.cashflow.${field}`] = (r) => {
      const m = measureOf(r, n);
      return m ? row(m.standardizedCashflow, r.financialAssumptions.baseYear) : null;
    };
  }
  MAPPING[`financial.${n}.cashflow.grossActualSavingsUsd`] = (r) => {
    const m = measureOf(r, n);
    return m ? m.actualCashflow.map((y) => y.grossSavings) : null;
  };
}

// Financial parameters sheet: derived values from `financialAssumptions`, the rest are inputs echoed back.
const fa = (r: AuditResult) => r.financialAssumptions;
const fp = (_r: AuditResult, i: AuditInputs) => i.financialParameters;
Object.assign(MAPPING, {
  "financialParameters.baseYear": (r) => fa(r).baseYear,
  "financialParameters.calculationPeriodYears": (r) => fa(r).periodYears,
  "financialParameters.inflation": (r) => fa(r).inflationRate,
  "financialParameters.realDiscountRate": (r) => fa(r).realDiscountRate,
  "financialParameters.nominalDiscountRate": (r) => fa(r).nominalDiscountRate,
  "financialParameters.nominalEscalationGas": (r) => fa(r).nominalEscalation.gas,
  "financialParameters.nominalEscalationElectricity": (r) => fa(r).nominalEscalation.electricity,
  "financialParameters.maintenanceEscalation": (r) => fa(r).maintenanceEscalation,
  "financialParameters.exchangeRateUzsPerUsd": (r) => fa(r).exchangeRateUzsPerUsd,
  "financialParameters.irrInitialGuess": (r) => fa(r).irrInitialGuess,
  "financialParameters.realEscalationGas": (r, i) => fp(r, i).realEscalationGas,
  "financialParameters.realEscalationElectricity": (r, i) => fp(r, i).realEscalationElectricity,
  "financialParameters.realEscalationCoalHeat": (r, i) => fp(r, i).realEscalationHeat,
  "financialParameters.gasTariffUzsPerM3": (r, i) => fp(r, i).gasTariffUzsPerM3,
  "financialParameters.electricityTariffUzsPerKwh": (r, i) => fp(r, i).electricityTariffUzsPerKwh,
  "financialParameters.pvExportTariffUzsPerKwh": (r, i) => fp(r, i).pvExportTariffUzsPerKwh,
  "financialParameters.thermalTariffUzsPerGcal": (r, i) => fp(r, i).heatTariffUzsPerGcal,
  "financialParameters.coalPriceUzsPerTonne": (r, i) => fp(r, i).coalPriceUzsPerT,
  "financialParameters.gasNetCalorificValueKwhPerM3": (r, i) => fp(r, i).gasNcvKwhPerM3,
} satisfies Record<string, Accessor>);

for (let n = 1; n <= 13; n++) {
  MAPPING[`nonEe.${n}.description`] = (r) => r.nonEeMeasures[n - 1]?.description ?? null;
  MAPPING[`nonEe.${n}.costUsd`] = (r) => r.nonEeMeasures[n - 1]?.totalCostUsd ?? null;
}

// Totals row 38 (all) and 39 (proposed): energy measures + the non-EE rows (they carry cost, no saving).
for (const [key, onlyProposed] of [
  ["all", false],
  ["proposed", true],
] as const) {
  const pick = (r: AuditResult) =>
    r.measures.filter((m) => !onlyProposed || m.proposedForImplementation);
  const nonEeCost = (r: AuditResult) => sum(r.nonEeMeasures.map((m) => m.totalCostUsd));
  const capex = (r: AuditResult) => sum(pick(r).map((m) => m.investmentCostUsd)) + nonEeCost(r);
  const savingsUsd = (r: AuditResult) => sum(pick(r).map((m) => m.standardizedAnnualSavingsUsd));
  const actualUsd = (r: AuditResult) => sum(pick(r).map((m) => m.actualAnnualSavingsUsd));
  const t = `totals.${key}`;
  MAPPING[`${t}.investmentUsd`] = capex;
  MAPPING[`${t}.standardizedSavingsKwh`] = (r) =>
    sum(pick(r).map((m) => m.standardizedAnnualSavingsKwh));
  MAPPING[`${t}.standardizedSavingsUsd`] = savingsUsd;
  MAPPING[`${t}.actualSavingsKwh`] = (r) => sum(pick(r).map((m) => m.actualAnnualSavingsKwh));
  MAPPING[`${t}.actualSavingsUsd`] = actualUsd;
  MAPPING[`${t}.simplePaybackStandardizedYears`] = (r) =>
    savingsUsd(r) > 0 ? capex(r) / savingsUsd(r) : null;
  MAPPING[`${t}.simplePaybackActualYears`] = (r) =>
    actualUsd(r) > 0 ? capex(r) / actualUsd(r) : null;
  MAPPING[`${t}.npvStandardizedUsd`] = (r) =>
    sum(pick(r).map((m) => m.standardized.npv)) - nonEeCost(r);
  MAPPING[`${t}.co2ReductionTonnesPerYear`] = (r) =>
    sum(pick(r).map((m) => m.co2ReductionTonnesPerYear));
}

import type { AuditResult } from "@yres/types";
import type { AuditInputs } from "../../src/services/audit-inputs";
import { calculateBuildingBlockAreas } from "../../src/services/envelope.service";

/** What an accessor may return; `null` ↔ expected `kind: "none"`, strings ↔ `kind: "text"`. */
export type Actual = number | string | null;
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

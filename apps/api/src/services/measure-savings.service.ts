import type {
  CoolingResult,
  DhwDemandResult,
  DistributionLossResult,
  EnergyCarrier,
  EnvelopeHeatLossResult,
  EquipmentResult,
  GenerationSourceResult,
  HeatingEnergyBalanceResult,
  LightingResult,
  RenewableBalance,
  RenewableProductionResult,
  Scenario,
  VentilationLossResult,
} from "@yres/types";
import { heatLossTypeKey } from "./heatloss.service";

/** Part of a measure's saving that lands on one purchased-energy carrier (may be negative). */
export interface CarrierSavingPart {
  carrier: EnergyCarrier;
  kwh: number;
  /** Overrides the carrier's tariff for this part (PV export is paid at the export tariff, not the retail one). */
  usdPerKwh?: number | null;
}

export interface MeasureSavings {
  /** Useful (pre-generation) energy delta; 0 for measures that act on final energy directly. */
  usefulKwh: number;
  parts: CarrierSavingPart[];
}

export interface MeasureTarget {
  kind: "construction_type" | "opening_type";
  code: string;
}

/**
 * The building's baseline heating chain, from the "before" generation sources whose carrier is
 * billed: `η_b` = Σ(Q+Qd)/Σ final (`Overall gener. & distrib. eff.!G7`) and each carrier's share of the
 * final heating energy. Useful-heat savings divided by `η_b` and split by these shares become fuel.
 */
export interface BaselineHeating {
  efficiency: number;
  shares: { carrier: EnergyCarrier; share: number }[];
  /** False when no billed heating source exists (η = 1, gas assumed) — the caller warns. */
  derived: boolean;
}

export interface GenerationRow extends GenerationSourceResult {
  carrier: EnergyCarrier | null;
}

export function deriveBaselineHeating(generation: GenerationRow[]): BaselineHeating {
  const rows = generation.filter(
    (g) => g.scenario === "before" && g.endUse === "heating" && g.carrier != null,
  );
  const usefulPlusLoss = rows.reduce(
    (s, g) => s + g.usefulEnergyNeedKwh + g.distributionLossKwh,
    0,
  );
  const finalKwh = rows.reduce((s, g) => s + g.finalEnergyConsumptionKwh, 0);
  if (rows.length === 0 || finalKwh <= 0 || usefulPlusLoss <= 0) {
    return { efficiency: 1, shares: [{ carrier: "gas", share: 1 }], derived: false };
  }
  const byCarrier = new Map<EnergyCarrier, number>();
  for (const g of rows) {
    if (g.carrier)
      byCarrier.set(g.carrier, (byCarrier.get(g.carrier) ?? 0) + g.finalEnergyConsumptionKwh);
  }
  return {
    efficiency: usefulPlusLoss / finalKwh,
    shares: [...byCarrier].map(([carrier, kwh]) => ({ carrier, share: kwh / finalKwh })),
    derived: true,
  };
}

/**
 * v7.20 `D71 = 1 + H12 / Σ(H4:H8)`: better insulation lowers the share of internal/solar gains the
 * building can use, so only part of the loss reduction turns into saved fuel. `H12` is the change in
 * utilised gains (after − before, negative), `H4:H8` the loss reductions of walls, roof, floor,
 * windows+doors and ventilation. Without any loss reduction there is nothing to correct (1).
 */
export function calculateGainsUtilizationCorrection(
  heatingEnergyBalance: HeatingEnergyBalanceResult[],
  envelopeHeatLoss: EnvelopeHeatLossResult[],
  ventilationLoss: VentilationLossResult[],
): number {
  const utilizedGains = (scenario: Scenario) =>
    (heatingEnergyBalance.find((h) => h.scenario === scenario)?.monthly ?? []).reduce(
      (s, m) => s + m.utilizationFactor * m.totalGainsKwh,
      0,
    );
  const envelopeTotal = (scenario: Scenario) =>
    envelopeHeatLoss.find((e) => e.scenario === scenario)?.annualTotalKwh ?? 0;
  const ventilationThermal = (scenario: Scenario) => {
    const v = ventilationLoss.find((r) => r.scenario === scenario);
    return v ? v.naturalAnnualKwh + v.mechanicalAnnualKwh : 0;
  };
  const lossReduction =
    envelopeTotal("before") -
    envelopeTotal("after") +
    ventilationThermal("before") -
    ventilationThermal("after");
  if (lossReduction <= 0) return 1;
  return 1 + (utilizedGains("after") - utilizedGains("before")) / lossReduction;
}

export interface SavingsContext {
  envelopeHeatLoss: EnvelopeHeatLossResult[];
  ventilationLoss: VentilationLossResult[];
  distributionLoss: DistributionLossResult[];
  generation: GenerationRow[];
  lighting: LightingResult[];
  equipment: EquipmentResult[];
  renewableProduction: RenewableProductionResult[];
  /** F09: PV self-consumption/export split; `pvExport*` come from the building's financial assumptions. */
  renewableBalance: RenewableBalance;
  pvExportEnabled: boolean;
  pvExportUsdPerKwh: number;
  heatingEnergyBalance: HeatingEnergyBalanceResult[];
  dhwDemand: DhwDemandResult[];
  cooling: CoolingResult[];
  baselineHeating: BaselineHeating;
  gainsUtilizationCorrection: number;
  emsSavingsRate: number;
}

const ENVELOPE_CATEGORIES: Record<string, { construction: string[]; opening: string[] }> = {
  envelope_wall_insulation: {
    construction: ["external_wall", "socle_heated", "socle_unheated", "socle_ground"],
    opening: [],
  },
  envelope_roof_insulation: { construction: ["roof"], opening: [] },
  envelope_floor_insulation: {
    construction: ["floor", "floor_ground", "floor_over_unheated"],
    opening: [],
  },
  window_replacement: { construction: [], opening: ["window", "door"] },
};

const sumParts = (parts: CarrierSavingPart[]): CarrierSavingPart[] => {
  const byCarrier = new Map<EnergyCarrier, number>();
  for (const p of parts) byCarrier.set(p.carrier, (byCarrier.get(p.carrier) ?? 0) + p.kwh);
  return [...byCarrier].map(([carrier, kwh]) => ({ carrier, kwh }));
};

/** Useful heat → fuel: ÷ η_b, split over the baseline heating carriers by their share of final energy. */
function heatingFuelParts(
  usefulKwh: number,
  baseline: BaselineHeating,
  correction: number,
): CarrierSavingPart[] {
  return baseline.shares.map((s) => ({
    carrier: s.carrier,
    kwh: (usefulKwh / baseline.efficiency) * correction * s.share,
  }));
}

/** Carriers (with shares) of the final energy delivered by the "after" thermal sources of an end-use. */
function afterCarrierShares(
  generation: GenerationRow[],
  endUses: string[],
): { carrier: EnergyCarrier; share: number }[] {
  const rows = generation.filter(
    (g) => g.scenario === "after" && endUses.includes(g.endUse) && g.carrier != null,
  );
  const total = rows.reduce((s, g) => s + g.finalEnergyConsumptionKwh, 0);
  if (total <= 0) return [];
  const byCarrier = new Map<EnergyCarrier, number>();
  for (const g of rows) {
    if (g.carrier)
      byCarrier.set(g.carrier, (byCarrier.get(g.carrier) ?? 0) + g.finalEnergyConsumptionKwh);
  }
  return [...byCarrier].map(([carrier, kwh]) => ({ carrier, share: kwh / total }));
}

function envelopeUsefulDelta(
  category: string,
  targets: MeasureTarget[],
  context: SavingsContext,
): number {
  const sets = ENVELOPE_CATEGORIES[category];
  if (!sets) return 0;
  const before = context.envelopeHeatLoss.find((r) => r.scenario === "before");
  const after = context.envelopeHeatLoss.find((r) => r.scenario === "after");
  if (targets.length === 0) {
    const categories = [...sets.construction, ...sets.opening];
    return categories.reduce(
      (s, c) => s + (before?.annualByCategory[c] ?? 0) - (after?.annualByCategory[c] ?? 0),
      0,
    );
  }
  let delta = 0;
  for (const target of targets) {
    const categories = target.kind === "construction_type" ? sets.construction : sets.opening;
    for (const c of categories) {
      const key = heatLossTypeKey(c, target.code);
      delta += (before?.annualByTypeCode[key] ?? 0) - (after?.annualByTypeCode[key] ?? 0);
    }
  }
  return delta;
}

const deltaOf = (before: number | undefined, after: number | undefined) =>
  (before ?? 0) - (after ?? 0);

/**
 * v7.20 `Measures_summary` attribution (`docs/production/faza-1/F06-chora-tadbir-tejash.md`): every
 * measure's saving in *final* energy per carrier. Envelope measures use the loss change of the
 * construction/opening types they name, divided by the baseline η and by `D71`.
 */
export function resolveMeasureSavings(
  category: string,
  targets: MeasureTarget[],
  context: SavingsContext,
): MeasureSavings {
  const { baselineHeating: baseline, gainsUtilizationCorrection: d71 } = context;
  const find = <T extends { scenario: Scenario }>(rows: T[], scenario: Scenario) =>
    rows.find((r) => r.scenario === scenario);

  switch (category) {
    case "envelope_wall_insulation":
    case "envelope_roof_insulation":
    case "envelope_floor_insulation":
    case "window_replacement": {
      const useful = envelopeUsefulDelta(category, targets, context);
      return { usefulKwh: useful, parts: heatingFuelParts(useful, baseline, d71) };
    }
    case "mechanical_ventilation_heat_recovery": {
      const beforeVent = find(context.ventilationLoss, "before");
      const afterVent = find(context.ventilationLoss, "after");
      const useful = deltaOf(beforeVent?.mechanicalAnnualKwh, afterVent?.mechanicalAnnualKwh);
      // The fan's electricity is *added* consumption: before − after is negative (`Measures_summary!I51`).
      const fanDelta = deltaOf(
        beforeVent?.mechanicalElectricalKwh,
        afterVent?.mechanicalElectricalKwh,
      );
      return {
        usefulKwh: useful,
        parts: sumParts([
          ...heatingFuelParts(useful, baseline, d71),
          { carrier: "electricity", kwh: fanDelta },
        ]),
      };
    }
    case "heating_system": {
      const pick = (scenario: Scenario) =>
        context.distributionLoss.find((r) => r.scenario === scenario && r.systemType === "heating");
      const useful = deltaOf(pick("before")?.annualLossKwh, pick("after")?.annualLossKwh);
      // v7.20 `E17 = ΔL_pipe / η_b` — no D71: pipe losses do not touch the building's gains.
      return { usefulKwh: useful, parts: heatingFuelParts(useful, baseline, 1) };
    }
    case "gas_boiler_replacement": {
      const afterRows = context.generation.filter(
        (g) => g.scenario === "after" && g.endUse === "heating",
      );
      const afterUsefulPlusLoss = afterRows.reduce(
        (s, g) => s + g.usefulEnergyNeedKwh + g.distributionLossKwh,
        0,
      );
      // What the old chain would still burn for the new demand (`D61 = (J7+L7)/η_b`) minus what the
      // new sources actually buy — the envelope measures already took the demand change.
      const parts: CarrierSavingPart[] = heatingFuelParts(afterUsefulPlusLoss, baseline, 1);
      for (const g of afterRows) {
        if (g.carrier) parts.push({ carrier: g.carrier, kwh: -g.finalEnergyConsumptionKwh });
      }
      return { usefulKwh: 0, parts: sumParts(parts) };
    }
    case "lighting": {
      const kwh = deltaOf(
        find(context.lighting, "before")?.annualConsumptionKwh,
        find(context.lighting, "after")?.annualConsumptionKwh,
      );
      return { usefulKwh: kwh, parts: [{ carrier: "electricity", kwh }] };
    }
    case "equipment_replacement": {
      const kwh = deltaOf(
        find(context.equipment, "before")?.annualConsumptionKwh,
        find(context.equipment, "after")?.annualConsumptionKwh,
      );
      return { usefulKwh: kwh, parts: [{ carrier: "electricity", kwh }] };
    }
    // v7.20 `PV!C35:C38`: the yearly self-consumed share is valued at the retail tariff; the surplus is exported
    // and valued at the export tariff only when the project enables export (K4, off by default). With export off
    // the surplus is not a saving at all — it stays visible in `renewableBalance`.
    case "pv": {
      const { productionKwh, selfConsumedKwh, exportedKwh } = context.renewableBalance;
      const parts: CarrierSavingPart[] = [{ carrier: "electricity", kwh: selfConsumedKwh }];
      if (context.pvExportEnabled && exportedKwh > 0) {
        parts.push({
          carrier: "electricity",
          kwh: exportedKwh,
          usdPerKwh: context.pvExportUsdPerKwh,
        });
      }
      return { usefulKwh: productionKwh, parts };
    }
    case "solar_dhw": {
      const kwh =
        context.renewableProduction.find((r) => r.systemType === "solar_dhw")
          ?.annualProductionKwh ?? 0;
      // Free collected heat displaces whatever bills the building's hot water today.
      const dhwRows = context.generation.filter(
        (g) => g.scenario === "before" && g.endUse === "dhw" && g.carrier != null,
      );
      const total = dhwRows.reduce((s, g) => s + g.finalEnergyConsumptionKwh, 0);
      const shares =
        total > 0
          ? sumParts(
              dhwRows.flatMap((g) =>
                g.carrier
                  ? [{ carrier: g.carrier, kwh: (kwh * g.finalEnergyConsumptionKwh) / total }]
                  : [],
              ),
            )
          : baseline.shares.map((s) => ({ carrier: s.carrier, kwh: kwh * s.share }));
      return { usefulKwh: kwh, parts: shares };
    }
    // `EMS` sheet: a flat share of every end-use need left after the other measures — the thermal
    // part lands on the "after" thermal carriers, the cooling/lighting part on electricity.
    case "ems": {
      const rate = context.emsSavingsRate;
      const thermalKwh =
        ((find(context.heatingEnergyBalance, "after")?.annualNetEnergyNeedKwh ?? 0) +
          (find(context.dhwDemand, "after")?.totalKwh ?? 0)) *
        rate;
      const electricKwh =
        ((find(context.cooling, "after")?.electricalEnergyForCoolingKwh ?? 0) +
          (find(context.lighting, "after")?.annualConsumptionKwh ?? 0)) *
        rate;
      const thermalShares = afterCarrierShares(context.generation, ["heating", "dhw"]);
      const shares = thermalShares.length > 0 ? thermalShares : baseline.shares;
      return {
        usefulKwh: thermalKwh + electricKwh,
        parts: sumParts([
          ...shares.map((s) => ({ carrier: s.carrier, kwh: thermalKwh * s.share })),
          { carrier: "electricity", kwh: electricKwh },
        ]),
      };
    }
    default:
      return { usefulKwh: 0, parts: [] };
  }
}

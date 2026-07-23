import {
  type Database,
  constructionType,
  energyTariff,
  reportAnnotation,
  surfaceResistance,
  utilityBill,
} from "@yres/db";
import {
  REPORT_ANNOTATION_SECTION_KEYS,
  type EnvelopeElementCategory,
  type ReportAnnotationSectionKey,
  type Scenario,
} from "@yres/types";
import { desc, eq } from "drizzle-orm";
import { calculateLayerResistance, calculateUValue } from "./uvalue.service";

/**
 * Raw, presentation-only data the report needs but `AuditResult` doesn't
 * carry (`runFullAudit()` folds construction layers and utility bills down
 * into aggregate figures and discards the detail — see
 * `.claude/rules/hisobot.md`). These three queries are read separately by
 * the `/audit/report` route and passed into `generateAuditReportPdf()`
 * alongside the normal `AuditResult`.
 */

export interface UValueLayerBreakdown {
  materialName: string;
  thicknessM: number;
  thermalConductivityWPerMk: number;
  resistanceM2KPerW: number;
}

export interface ConstructionTypeUValueBreakdown {
  code: string;
  elementCategory: EnvelopeElementCategory;
  scenario: Scenario;
  /** Auditor's own free-text note on this construction type (`constructionType.description`) — already editable in the envelope UI, just not previously threaded through to the report. Rendered as an italic note under the U-value table (`.claude/rules/hisobot.md`'s report redesign). */
  description: string | null;
  layers: UValueLayerBreakdown[];
  interiorResistanceM2kPerW: number;
  exteriorResistanceM2kPerW: number;
  totalThermalResistanceM2KPerW: number;
  uValueWPerM2K: number;
}

/** Same join shape as `audit.engine.ts`'s envelope query (`constructionType.findMany` with `layers.material`), kept in sync intentionally — this is the one other place in the codebase that needs layer-level material data. */
export async function getUValueBreakdown(
  db: Database,
  buildingId: string,
): Promise<ConstructionTypeUValueBreakdown[]> {
  const [constructionTypeRows, surfaceResistanceRows] = await Promise.all([
    db.query.constructionType.findMany({
      where: eq(constructionType.buildingId, buildingId),
      with: { layers: { with: { material: true } } },
    }),
    db.select().from(surfaceResistance),
  ]);

  const surfaceResistanceByCategory = new Map(
    surfaceResistanceRows.map((r) => [
      r.elementCategory,
      {
        interiorResistanceM2kPerW: r.interiorResistanceM2kPerW,
        exteriorResistanceM2kPerW: r.exteriorResistanceM2kPerW,
      },
    ]),
  );

  return constructionTypeRows.map((ct) => {
    const resistance = surfaceResistanceByCategory.get(ct.elementCategory) ?? {
      interiorResistanceM2kPerW: 0.13,
      exteriorResistanceM2kPerW: 0.04,
    };
    const layers: UValueLayerBreakdown[] = ct.layers
      .sort((a, b) => a.layerOrder - b.layerOrder)
      .map((layer) => ({
        materialName: layer.material.name,
        thicknessM: layer.thicknessM,
        thermalConductivityWPerMk: layer.material.thermalConductivityWPerMk,
        resistanceM2KPerW: calculateLayerResistance({
          thicknessM: layer.thicknessM,
          thermalConductivityWPerMk: layer.material.thermalConductivityWPerMk,
        }),
      }));
    const { totalThermalResistanceM2KPerW, uValueWPerM2K } = calculateUValue(
      ct.id,
      layers.map((l) => ({
        thicknessM: l.thicknessM,
        thermalConductivityWPerMk: l.thermalConductivityWPerMk,
      })),
      resistance,
    );

    return {
      code: ct.code,
      elementCategory: ct.elementCategory,
      scenario: ct.scenario,
      description: ct.description,
      layers,
      interiorResistanceM2kPerW: resistance.interiorResistanceM2kPerW,
      exteriorResistanceM2kPerW: resistance.exteriorResistanceM2kPerW,
      totalThermalResistanceM2KPerW,
      uValueWPerM2K,
    };
  });
}

export interface BillRow {
  energyCarrier: string;
  year: number;
  month: number;
  consumptionKwh: number | null;
  expenseLocal: number | null;
}

export interface MonthlyConsumptionRow {
  month: number;
  /** One entry per year with a bill for this carrier/month, plus the 3-year (or however-many-years) average as the baseline. */
  byYear: { year: number; consumptionKwh: number; expenseLocal: number | null }[];
  averageConsumptionKwh: number;
}

export interface CarrierConsumptionHistory {
  energyCarrier: string;
  months: MonthlyConsumptionRow[];
  annualAverageConsumptionKwh: number;
}

/** Pure grouping logic, exported separately so it's unit-testable without a database (testing-and-verification.md). */
export function groupBillsByCarrierYearMonth(bills: BillRow[]): CarrierConsumptionHistory[] {
  const byCarrier = new Map<string, BillRow[]>();
  for (const bill of bills) {
    if (bill.consumptionKwh == null) continue;
    const rows = byCarrier.get(bill.energyCarrier) ?? [];
    rows.push(bill);
    byCarrier.set(bill.energyCarrier, rows);
  }

  return [...byCarrier.entries()].map(([energyCarrier, rows]) => {
    const byMonth = new Map<number, BillRow[]>();
    for (const row of rows) {
      const monthRows = byMonth.get(row.month) ?? [];
      monthRows.push(row);
      byMonth.set(row.month, monthRows);
    }

    const months: MonthlyConsumptionRow[] = [...byMonth.entries()]
      .sort(([a], [b]) => a - b)
      .map(([month, monthRows]) => {
        const byYear = monthRows
          .map((r) => ({
            year: r.year,
            consumptionKwh: r.consumptionKwh ?? 0,
            expenseLocal: r.expenseLocal,
          }))
          .sort((a, b) => a.year - b.year);
        const averageConsumptionKwh =
          byYear.reduce((sum, y) => sum + y.consumptionKwh, 0) / byYear.length;
        return { month, byYear, averageConsumptionKwh };
      });

    const annualAverageConsumptionKwh = months.reduce((sum, m) => sum + m.averageConsumptionKwh, 0);
    return { energyCarrier, months, annualAverageConsumptionKwh };
  });
}

export async function getConsumptionHistory(
  db: Database,
  buildingId: string,
): Promise<CarrierConsumptionHistory[]> {
  const bills = await db.select().from(utilityBill).where(eq(utilityBill.buildingId, buildingId));
  return groupBillsByCarrierYearMonth(bills);
}

export interface LatestTariffRow {
  energyCarrier: string;
  unitCostUsd: number;
  emissionFactorKgCo2PerKwh: number;
}

/** Same "most recent row per carrier" pattern as `audit.engine.ts`'s measures/financials block. */
export async function getLatestEnergyTariffs(db: Database): Promise<LatestTariffRow[]> {
  const tariffRows = await db.select().from(energyTariff).orderBy(desc(energyTariff.effectiveDate));
  const latestByCarrier = new Map<string, LatestTariffRow>();
  for (const tariff of tariffRows) {
    if (!latestByCarrier.has(tariff.energyCarrier)) {
      latestByCarrier.set(tariff.energyCarrier, {
        energyCarrier: tariff.energyCarrier,
        unitCostUsd: tariff.unitCostUsd,
        emissionFactorKgCo2PerKwh: tariff.emissionFactorKgCo2PerKwh,
      });
    }
  }
  return [...latestByCarrier.values()];
}

/** Keyed by `sectionKey` (docs/report-redesign-proposal.md §5b) — rows with an unrecognized key (e.g. a section removed since the note was written) are dropped rather than surfaced, since neither the frontend nor the PDF has anywhere left to show them. */
export async function getReportAnnotations(
  db: Database,
  buildingId: string,
): Promise<Partial<Record<ReportAnnotationSectionKey, string>>> {
  const rows = await db
    .select()
    .from(reportAnnotation)
    .where(eq(reportAnnotation.buildingId, buildingId));

  const knownKeys = new Set<string>(REPORT_ANNOTATION_SECTION_KEYS);
  const bySectionKey: Partial<Record<ReportAnnotationSectionKey, string>> = {};
  for (const row of rows) {
    if (knownKeys.has(row.sectionKey)) {
      bySectionKey[row.sectionKey as ReportAnnotationSectionKey] = row.note;
    }
  }
  return bySectionKey;
}

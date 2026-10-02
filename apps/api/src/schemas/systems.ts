// Array bounds keep each PUT's single db.batch() inside the D1 query budget (database.md: ≤ 40
// per request on Workers Free; session + access check take ≤ 4). Worst case = 1 delete + ceil(rows ÷ floor(100 ÷ columns)):
//   ventilation 20 ÷ 11 (9 cols)  → 3      dhw 20 ÷ 14 (7)           → 3
//   distribution 50 ÷ 12 (8)      → 6      generation 20 ÷ 14 (7)    → 3
//   cooling windows 100 ÷ 14 (7)  → 9      cooling systems 50 ÷ 20 (5) → 4
//   lighting 100 ÷ 14 (7)         → 9      equipment 200 ÷ 9 (11)    → 24
//   renewables: 1 + 2 (20 ÷ 14) + 10 (240 monthly rows ÷ 25) → 13
// The heaviest (equipment, 24) + 4 = 28 ≤ 40.
import {
  distributionSystemTypeEnum,
  endUseEnum,
  energyCarrierEnum,
  generationSourceTypeEnum,
  orientationEnum,
  renewableSystemTypeEnum,
  scenarioEnum,
} from "@yres/db";
import { z } from "zod";

const scenarioBodySchema = z.object({ scenario: z.enum(scenarioEnum.enumValues) });

const ventilationSystemInputSchema = z.object({
  systemType: z.enum(["natural", "mechanical"]),
  airChangeRatePerHour: z.number().finite().nonnegative().nullable().optional(),
  freshAirPerPersonM3h: z.number().finite().nonnegative().nullable().optional(),
  heatRecoveryEfficiency: z.number().finite().min(0).max(1).nullable().optional(),
  fanElectricalPowerKw: z.number().finite().nonnegative().nullable().optional(),
  coolingSeasonHours: z.number().finite().nonnegative().nullable().optional(),
});
export const replaceVentilationSchema = scenarioBodySchema.extend({
  systems: z.array(ventilationSystemInputSchema).max(20).default([]),
});
export type ReplaceVentilationInput = z.infer<typeof replaceVentilationSchema>;

const dhwSourceInputSchema = z.object({
  sourceName: z.string().min(1).max(300),
  energyCarrier: z.enum(energyCarrierEnum.enumValues),
  specificConsumptionLPersonDay: z.number().finite().nonnegative(),
  personsServed: z.number().finite().int().nonnegative(),
});
export const replaceDhwSchema = scenarioBodySchema.extend({
  sources: z.array(dhwSourceInputSchema).max(20).default([]),
});
export type ReplaceDhwInput = z.infer<typeof replaceDhwSchema>;

const distributionSystemInputSchema = z.object({
  systemType: z.enum(distributionSystemTypeEnum.enumValues),
  pipeDiameterClass: z.string().min(1).max(100),
  lengthM: z.number().finite().nonnegative(),
  insulatedFraction: z.number().finite().min(0).max(1).default(0),
  meanFluidTempC: z.number().finite(),
});
export const replaceDistributionSchema = scenarioBodySchema.extend({
  systems: z.array(distributionSystemInputSchema).max(50).default([]),
});
export type ReplaceDistributionInput = z.infer<typeof replaceDistributionSchema>;

const generationSourceInputSchema = z.object({
  endUse: z.enum(endUseEnum.enumValues),
  sourceType: z.enum(generationSourceTypeEnum.enumValues),
  efficiencyOrSeer: z.number().finite().positive(),
  shareOfDemand: z.number().finite().min(0).max(1).default(1),
});
export const replaceGenerationSchema = scenarioBodySchema.extend({
  sources: z.array(generationSourceInputSchema).max(20).default([]),
});
export type ReplaceGenerationInput = z.infer<typeof replaceGenerationSchema>;

const coolingWindowInputSchema = z.object({
  orientation: z.enum(orientationEnum.enumValues),
  areaM2: z.number().finite().nonnegative(),
  gValue: z.number().finite().min(0).max(1),
  shadingFactor: z.number().finite().min(0).max(1).default(1),
});
export const replaceCoolingWindowsSchema = scenarioBodySchema.extend({
  windows: z.array(coolingWindowInputSchema).max(100).default([]),
});
export type ReplaceCoolingWindowsInput = z.infer<typeof replaceCoolingWindowsSchema>;

const coolingSystemInputSchema = z.object({
  description: z.string().max(10_000).nullable().optional(),
  seer: z.number().finite().positive(),
});
export const replaceCoolingSystemsSchema = scenarioBodySchema.extend({
  systems: z.array(coolingSystemInputSchema).max(50).default([]),
});
export type ReplaceCoolingSystemsInput = z.infer<typeof replaceCoolingSystemsSchema>;

const lightingTechnologyMixSchema = z.object({
  incandescentFraction: z.number().finite().min(0).max(1),
  fluorescentElectromagneticFraction: z.number().finite().min(0).max(1),
  fluorescentElectronicFraction: z.number().finite().min(0).max(1),
  ledFraction: z.number().finite().min(0).max(1),
});
const lightingZoneInputSchema = z.object({
  name: z.string().min(1).max(300),
  areaM2: z.number().finite().nonnegative(),
  technologyMix: lightingTechnologyMixSchema,
  utilizationFactor: z.number().finite().min(0).max(1),
});
export const replaceLightingSchema = scenarioBodySchema.extend({
  zones: z.array(lightingZoneInputSchema).max(100).default([]),
});
export type ReplaceLightingInput = z.infer<typeof replaceLightingSchema>;

const equipmentItemInputSchema = z.object({
  name: z.string().min(1).max(300),
  category: z.string().max(300).nullable().optional(),
  unitPowerKw: z.number().finite().nonnegative(),
  quantity: z.number().finite().int().nonnegative().default(1),
  heatingSeasonHours: z.number().finite().nonnegative().default(0),
  coolingSeasonHours: z.number().finite().nonnegative().default(0),
  heatingUtilizationFactor: z.number().finite().min(0).max(1).default(1),
  coolingUtilizationFactor: z.number().finite().min(0).max(1).default(1),
});
export const replaceEquipmentSchema = scenarioBodySchema.extend({
  items: z.array(equipmentItemInputSchema).max(200).default([]),
});
export type ReplaceEquipmentInput = z.infer<typeof replaceEquipmentSchema>;

// Renewables (PV / Solar DHW) aren't scenario-tagged in the schema — they
// represent a proposed addition, not a before/after pair (see
// renewable.service.ts) — so this replaces the building's entire set at
// once, not scoped to a scenario like the schemas above.
const renewableSystemInputSchema = z.object({
  systemType: z.enum(renewableSystemTypeEnum.enumValues),
  capacityKw: z.number().finite().positive().nullable().optional(),
  collectorCount: z.number().finite().int().positive().nullable().optional(),
  availableAreaM2: z.number().finite().nonnegative(),
  unitCostUsd: z.number().finite().nonnegative(),
  // Exactly 12 months of production, matching renewable_production_monthly's
  // per-system rows — the PVGIS-style external-tool input the source
  // workbook uses (see PV!C13:C24, Solar DHW's own monthly table).
  monthlyProductionKwh: z.array(z.number().finite().nonnegative()).length(12),
});
export const replaceRenewablesSchema = z.object({
  systems: z.array(renewableSystemInputSchema).max(20).default([]),
});
export type ReplaceRenewablesInput = z.infer<typeof replaceRenewablesSchema>;

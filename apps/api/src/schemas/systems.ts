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
  airChangeRatePerHour: z.number().nonnegative().nullable().optional(),
  freshAirPerPersonM3h: z.number().nonnegative().nullable().optional(),
  heatRecoveryEfficiency: z.number().min(0).max(1).nullable().optional(),
  fanElectricalPowerKw: z.number().nonnegative().nullable().optional(),
});
export const replaceVentilationSchema = scenarioBodySchema.extend({
  systems: z.array(ventilationSystemInputSchema).default([]),
});
export type ReplaceVentilationInput = z.infer<typeof replaceVentilationSchema>;

const dhwSourceInputSchema = z.object({
  sourceName: z.string().min(1),
  energyCarrier: z.enum(energyCarrierEnum.enumValues),
  specificConsumptionLPersonDay: z.number().nonnegative(),
  personsServed: z.number().int().nonnegative(),
});
export const replaceDhwSchema = scenarioBodySchema.extend({
  sources: z.array(dhwSourceInputSchema).default([]),
});
export type ReplaceDhwInput = z.infer<typeof replaceDhwSchema>;

const distributionSystemInputSchema = z.object({
  systemType: z.enum(distributionSystemTypeEnum.enumValues),
  pipeDiameterClass: z.string().min(1),
  lengthM: z.number().nonnegative(),
  insulatedFraction: z.number().min(0).max(1).default(0),
  meanFluidTempC: z.number(),
});
export const replaceDistributionSchema = scenarioBodySchema.extend({
  systems: z.array(distributionSystemInputSchema).default([]),
});
export type ReplaceDistributionInput = z.infer<typeof replaceDistributionSchema>;

const generationSourceInputSchema = z.object({
  endUse: z.enum(endUseEnum.enumValues),
  sourceType: z.enum(generationSourceTypeEnum.enumValues),
  efficiencyOrSeer: z.number().positive(),
  shareOfDemand: z.number().min(0).max(1).default(1),
});
export const replaceGenerationSchema = scenarioBodySchema.extend({
  sources: z.array(generationSourceInputSchema).default([]),
});
export type ReplaceGenerationInput = z.infer<typeof replaceGenerationSchema>;

const coolingWindowInputSchema = z.object({
  orientation: z.enum(orientationEnum.enumValues),
  areaM2: z.number().nonnegative(),
  gValue: z.number().min(0).max(1),
  shadingFactor: z.number().min(0).max(1).default(1),
});
export const replaceCoolingWindowsSchema = scenarioBodySchema.extend({
  windows: z.array(coolingWindowInputSchema).default([]),
});
export type ReplaceCoolingWindowsInput = z.infer<typeof replaceCoolingWindowsSchema>;

const coolingSystemInputSchema = z.object({
  description: z.string().nullable().optional(),
  seer: z.number().positive(),
});
export const replaceCoolingSystemsSchema = scenarioBodySchema.extend({
  systems: z.array(coolingSystemInputSchema).default([]),
});
export type ReplaceCoolingSystemsInput = z.infer<typeof replaceCoolingSystemsSchema>;

const lightingTechnologyMixSchema = z.object({
  incandescentFraction: z.number().min(0).max(1),
  fluorescentElectromagneticFraction: z.number().min(0).max(1),
  fluorescentElectronicFraction: z.number().min(0).max(1),
  ledFraction: z.number().min(0).max(1),
});
const lightingZoneInputSchema = z.object({
  name: z.string().min(1),
  areaM2: z.number().nonnegative(),
  technologyMix: lightingTechnologyMixSchema,
  utilizationFactor: z.number().min(0).max(1),
});
export const replaceLightingSchema = scenarioBodySchema.extend({
  zones: z.array(lightingZoneInputSchema).default([]),
});
export type ReplaceLightingInput = z.infer<typeof replaceLightingSchema>;

const equipmentItemInputSchema = z.object({
  name: z.string().min(1),
  category: z.string().nullable().optional(),
  unitPowerKw: z.number().nonnegative(),
  quantity: z.number().int().nonnegative().default(1),
  heatingSeasonHours: z.number().nonnegative().default(0),
  coolingSeasonHours: z.number().nonnegative().default(0),
  heatingUtilizationFactor: z.number().min(0).max(1).default(1),
  coolingUtilizationFactor: z.number().min(0).max(1).default(1),
});
export const replaceEquipmentSchema = scenarioBodySchema.extend({
  items: z.array(equipmentItemInputSchema).default([]),
});
export type ReplaceEquipmentInput = z.infer<typeof replaceEquipmentSchema>;

// Renewables (PV / Solar DHW) aren't scenario-tagged in the schema — they
// represent a proposed addition, not a before/after pair (see
// renewable.service.ts) — so this replaces the building's entire set at
// once, not scoped to a scenario like the schemas above.
const renewableSystemInputSchema = z.object({
  systemType: z.enum(renewableSystemTypeEnum.enumValues),
  capacityKw: z.number().positive().nullable().optional(),
  collectorCount: z.number().int().positive().nullable().optional(),
  availableAreaM2: z.number().nonnegative(),
  unitCostUsd: z.number().nonnegative(),
  // Exactly 12 months of production, matching renewable_production_monthly's
  // per-system rows — the PVGIS-style external-tool input the source
  // workbook uses (see PV!C13:C24, Solar DHW's own monthly table).
  monthlyProductionKwh: z.array(z.number().nonnegative()).length(12),
});
export const replaceRenewablesSchema = z.object({
  systems: z.array(renewableSystemInputSchema).default([]),
});
export type ReplaceRenewablesInput = z.infer<typeof replaceRenewablesSchema>;

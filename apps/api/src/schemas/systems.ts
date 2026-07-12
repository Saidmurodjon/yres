import {
  distributionSystemTypeEnum,
  endUseEnum,
  energyCarrierEnum,
  generationSourceTypeEnum,
  orientationEnum,
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

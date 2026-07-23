import { buildingStatusEnum, buildingTypeEnum } from "@yres/db";
import { z } from "zod";

export const createBuildingSchema = z.object({
  name: z.string().min(1),
  location: z.string().min(1),
  climateRegionId: z.string().uuid(),
  buildingType: z.enum(buildingTypeEnum.enumValues).optional(),
  yearBuilt: z.number().int().nullable().optional(),
  status: z.enum(buildingStatusEnum.enumValues).optional(),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),

  netCooledFloorAreaM2: z.number().nonnegative().optional(),
  heatingSeasonDurationDays: z.number().int().nonnegative(),
  indoorTempNonOperationC: z.number(),
  indoorTempOperationC: z.number(),
  outdoorAvgHeatingSeasonTempC: z.number(),
  outdoorDesignTempC: z.number(),
  nonOperationHoursPerDay: z.number().nonnegative(),
  operationHoursPerDay: z.number().nonnegative(),
  occupantCount: z.number().int().nonnegative().optional(),
  coolingEnthalpyInsideKjKg: z.number().nullable().optional(),
  coolingEnthalpyOutsideKjKg: z.number().nullable().optional(),
  coolingEnthalpyHottestDayKjKg: z.number().nullable().optional(),
});

export const updateBuildingSchema = createBuildingSchema.partial();

export type CreateBuildingInput = z.infer<typeof createBuildingSchema>;
export type UpdateBuildingInput = z.infer<typeof updateBuildingSchema>;

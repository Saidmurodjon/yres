import { buildingStatusEnum, buildingTypeEnum } from "@yres/db";
import { z } from "zod";
import { paginationQuerySchema } from "./pagination";

export const createBuildingSchema = z.object({
  name: z.string().min(1).max(300),
  location: z.string().min(1).max(300),
  climateRegionId: z.string().uuid(),
  buildingType: z.enum(buildingTypeEnum.enumValues).optional(),
  yearBuilt: z.number().finite().int().min(1800).max(2100).nullable().optional(),
  status: z.enum(buildingStatusEnum.enumValues).optional(),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  latitude: z.number().finite().min(-90).max(90).nullable().optional(),
  longitude: z.number().finite().min(-180).max(180).nullable().optional(),

  netCooledFloorAreaM2: z.number().finite().nonnegative().optional(),
  heatingSeasonDurationDays: z.number().finite().int().min(0).max(366),
  indoorTempNonOperationC: z.number().finite().min(-60).max(60),
  indoorTempOperationC: z.number().finite().min(-60).max(60),
  outdoorAvgHeatingSeasonTempC: z.number().finite().min(-60).max(60),
  outdoorDesignTempC: z.number().finite().min(-60).max(60),
  nonOperationHoursPerDay: z.number().finite().min(0).max(24),
  operationHoursPerDay: z.number().finite().min(0).max(24),
  occupantCount: z.number().finite().int().nonnegative().optional(),
  coolingEnthalpyInsideKjKg: z.number().finite().nullable().optional(),
  coolingEnthalpyOutsideKjKg: z.number().finite().nullable().optional(),
  coolingEnthalpyHottestDayKjKg: z.number().finite().nullable().optional(),
});

export const updateBuildingSchema = createBuildingSchema.partial();

export type CreateBuildingInput = z.infer<typeof createBuildingSchema>;
export type UpdateBuildingInput = z.infer<typeof updateBuildingSchema>;

// GET /api/buildings query params — pagination plus the filters the
// dashboard/buildings-list UIs offer (search across name+location, exact
// type/status match, exact region match against `location`'s free-text
// value). `region` is intentionally exact-match, not `search`'s substring
// match — it's driven by the GET /locations dropdown of known values.
export const buildingListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).max(300).optional(),
  type: z.enum(buildingTypeEnum.enumValues).optional(),
  status: z.enum(buildingStatusEnum.enumValues).optional(),
  region: z.string().trim().min(1).max(300).optional(),
});
export type BuildingListQuery = z.infer<typeof buildingListQuerySchema>;

// GET /api/buildings/stats query params — same filters as the list, minus
// `region` (the region breakdown chart needs counts across ALL regions, not
// just the one currently selected) and pagination (it aggregates over the
// whole filtered set, not one page).
export const buildingStatsQuerySchema = z.object({
  search: z.string().trim().min(1).max(300).optional(),
  type: z.enum(buildingTypeEnum.enumValues).optional(),
  status: z.enum(buildingStatusEnum.enumValues).optional(),
});
export type BuildingStatsQuery = z.infer<typeof buildingStatsQuerySchema>;

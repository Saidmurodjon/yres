import { buildingStatusEnum, buildingTypeEnum } from "@yres/db";
import { z } from "zod";
import { paginationQuerySchema } from "./pagination";

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

// GET /api/buildings query params — pagination plus the filters the
// dashboard/buildings-list UIs offer (search across name+location, exact
// type/status match, exact region match against `location`'s free-text
// value). `region` is intentionally exact-match, not `search`'s substring
// match — it's driven by the GET /locations dropdown of known values.
export const buildingListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  type: z.enum(buildingTypeEnum.enumValues).optional(),
  status: z.enum(buildingStatusEnum.enumValues).optional(),
  region: z.string().trim().min(1).optional(),
});
export type BuildingListQuery = z.infer<typeof buildingListQuerySchema>;

// GET /api/buildings/stats query params — same filters as the list, minus
// `region` (the region breakdown chart needs counts across ALL regions, not
// just the one currently selected) and pagination (it aggregates over the
// whole filtered set, not one page).
export const buildingStatsQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  type: z.enum(buildingTypeEnum.enumValues).optional(),
  status: z.enum(buildingStatusEnum.enumValues).optional(),
});
export type BuildingStatsQuery = z.infer<typeof buildingStatsQuerySchema>;

import { Hono } from "hono";
import type { Env } from "../index";

export const buildingRoutes = new Hono<{ Bindings: Env }>();

buildingRoutes.get("/", (c) => c.json({ buildings: [] }));

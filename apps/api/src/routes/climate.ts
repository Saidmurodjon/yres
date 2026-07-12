import { Hono } from "hono";
import type { Env } from "../index";

export const climateRoutes = new Hono<{ Bindings: Env }>();

climateRoutes.get("/regions", (c) => c.json({ regions: [] }));

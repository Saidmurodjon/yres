import {
  buildingBlock,
  constructionLayer,
  constructionType,
  createDb,
  envelopeElement,
  envelopeOpening,
  openingType,
} from "@yres/db";
import { and, eq, inArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { Hono } from "hono";
import { findOwnedBuilding } from "../lib/building-access";
import { type AppEnv, authMiddleware } from "../middleware/auth";
import { replaceEnvelopeSchema } from "../schemas/envelope";

export const envelopeRoutes = new Hono<AppEnv>();

envelopeRoutes.use("*", authMiddleware);

// GET /:id/envelope - everything needed to redraw the envelope form: envelope
// elements (with their openings + construction type joined in), building
// blocks, construction types + layers, and opening types.
envelopeRoutes.get("/:id/envelope", async (c) => {
  const buildingId = c.req.param("id");
  const db = createDb(c.env.DATABASE_URL);
  const user = c.get("user");

  const owned = await findOwnedBuilding(db, buildingId, user.id);
  if (!owned) {
    return c.json({ error: "Not found" }, 404);
  }

  const [blocks, constructionTypes, openingTypes, envelopeElements] = await Promise.all([
    db.query.buildingBlock.findMany({
      where: eq(buildingBlock.buildingId, buildingId),
    }),
    db.query.constructionType.findMany({
      where: eq(constructionType.buildingId, buildingId),
      with: { layers: true },
    }),
    db.query.openingType.findMany({
      where: eq(openingType.buildingId, buildingId),
    }),
    db.query.envelopeElement.findMany({
      where: eq(envelopeElement.buildingId, buildingId),
      with: {
        constructionType: { with: { layers: true } },
        openings: { with: { openingType: true } },
      },
    }),
  ]);

  return c.json({ blocks, constructionTypes, openingTypes, envelopeElements });
});

// PUT /:id/envelope - bulk-replace the building's envelope
// elements/openings/construction types for one scenario. Deletes the
// existing rows for that building + scenario and inserts the new payload.
//
// The neon-http Postgres driver doesn't support interactive transactions
// (`db.transaction()` throws at runtime), so atomicity here comes from
// `db.batch()`, which sends a fixed set of prepared statements to Neon in a
// single HTTP round trip. Because batch statements can't read each other's
// results, ids for new rows are generated client-side up front so child rows
// (layers, elements, openings) can reference their parents by id from the
// start; the payload cross-references construction/opening types by a
// client-supplied `code` rather than a DB id, since those ids don't exist
// until this request creates them.
envelopeRoutes.put("/:id/envelope", async (c) => {
  const buildingId = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = replaceEnvelopeSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
  }

  const db = createDb(c.env.DATABASE_URL);
  const user = c.get("user");

  const owned = await findOwnedBuilding(db, buildingId, user.id);
  if (!owned) {
    return c.json({ error: "Not found" }, 404);
  }

  const { scenario, buildingBlocks, constructionTypes, openingTypes, envelopeElements } =
    parsed.data;

  const buildingBlockRows: (typeof buildingBlock.$inferInsert)[] | undefined = buildingBlocks?.map(
    (block) => ({
      id: crypto.randomUUID(),
      buildingId,
      name: block.name,
      footprintLengthM: block.footprintLengthM,
      footprintWidthM: block.footprintWidthM,
      numberOfFloors: block.numberOfFloors,
      floorToFloorHeightM: block.floorToFloorHeightM,
      perimeterM: block.perimeterM,
      perimeterLossCoefficient: block.perimeterLossCoefficient ?? 0.4,
    }),
  );

  const constructionTypeIdByCode = new Map<string, string>();
  const constructionTypeRows: (typeof constructionType.$inferInsert)[] = constructionTypes.map(
    (ct) => {
      const id = crypto.randomUUID();
      constructionTypeIdByCode.set(ct.code, id);
      return {
        id,
        buildingId,
        code: ct.code,
        elementCategory: ct.elementCategory,
        scenario,
        description: ct.description ?? null,
      };
    },
  );

  const constructionLayerRows: (typeof constructionLayer.$inferInsert)[] = [];
  for (const ct of constructionTypes) {
    const constructionTypeId = constructionTypeIdByCode.get(ct.code);
    if (!constructionTypeId) continue;
    for (const layer of ct.layers) {
      constructionLayerRows.push({
        id: crypto.randomUUID(),
        constructionTypeId,
        layerOrder: layer.layerOrder,
        materialId: layer.materialId,
        thicknessM: layer.thicknessM,
      });
    }
  }

  const openingTypeIdByCode = new Map<string, string>();
  const openingTypeRows: (typeof openingType.$inferInsert)[] = openingTypes.map((ot) => {
    const id = crypto.randomUUID();
    openingTypeIdByCode.set(ot.code, id);
    return {
      id,
      buildingId,
      code: ot.code,
      category: ot.category,
      scenario,
      uValueWm2k: ot.uValueWm2k,
      widthM: ot.widthM ?? null,
      heightM: ot.heightM ?? null,
      gValue: ot.gValue ?? null,
      frameFactor: ot.frameFactor ?? null,
      shadingFactor: ot.shadingFactor ?? 1,
      description: ot.description ?? null,
    };
  });

  const envelopeElementIds: string[] = [];
  const envelopeElementRows: (typeof envelopeElement.$inferInsert)[] = [];
  const envelopeOpeningRows: (typeof envelopeOpening.$inferInsert)[] = [];

  for (const el of envelopeElements) {
    const constructionTypeId = constructionTypeIdByCode.get(el.constructionTypeCode);
    if (!constructionTypeId) {
      return c.json(
        {
          error: `envelopeElements references unknown constructionTypeCode "${el.constructionTypeCode}"`,
        },
        400,
      );
    }

    const elementId = crypto.randomUUID();
    envelopeElementIds.push(elementId);
    envelopeElementRows.push({
      id: elementId,
      buildingId,
      blockName: el.blockName,
      orientation: el.orientation,
      sideCode: el.sideCode ?? null,
      description: el.description ?? null,
      constructionTypeId,
      lengthM: el.lengthM,
      heightEnvContactM: el.heightEnvContactM ?? 0,
      heightGroundContactM: el.heightGroundContactM ?? 0,
    });

    for (const opening of el.openings) {
      const openingTypeId = openingTypeIdByCode.get(opening.openingTypeCode);
      if (!openingTypeId) {
        return c.json(
          {
            error: `envelope element openings reference unknown openingTypeCode "${opening.openingTypeCode}"`,
          },
          400,
        );
      }
      envelopeOpeningRows.push({
        id: crypto.randomUUID(),
        envelopeElementId: elementId,
        openingTypeId,
        count: opening.count,
      });
    }
  }

  const existingConstructionTypeIdsForScenario = db
    .select({ id: constructionType.id })
    .from(constructionType)
    .where(
      and(eq(constructionType.buildingId, buildingId), eq(constructionType.scenario, scenario)),
    );

  const deleteElements = db
    .delete(envelopeElement)
    .where(
      and(
        eq(envelopeElement.buildingId, buildingId),
        inArray(envelopeElement.constructionTypeId, existingConstructionTypeIdsForScenario),
      ),
    );

  const deleteOpeningTypes = db
    .delete(openingType)
    .where(and(eq(openingType.buildingId, buildingId), eq(openingType.scenario, scenario)));

  const deleteConstructionTypes = db
    .delete(constructionType)
    .where(
      and(eq(constructionType.buildingId, buildingId), eq(constructionType.scenario, scenario)),
    );

  const statements: BatchItem<"pg">[] = [
    deleteElements,
    deleteOpeningTypes,
    deleteConstructionTypes,
  ];

  if (buildingBlockRows) {
    statements.push(db.delete(buildingBlock).where(eq(buildingBlock.buildingId, buildingId)));
    if (buildingBlockRows.length > 0) {
      statements.push(db.insert(buildingBlock).values(buildingBlockRows));
    }
  }

  if (constructionTypeRows.length > 0) {
    statements.push(db.insert(constructionType).values(constructionTypeRows));
  }
  if (constructionLayerRows.length > 0) {
    statements.push(db.insert(constructionLayer).values(constructionLayerRows));
  }
  if (openingTypeRows.length > 0) {
    statements.push(db.insert(openingType).values(openingTypeRows));
  }
  if (envelopeElementRows.length > 0) {
    statements.push(db.insert(envelopeElement).values(envelopeElementRows));
  }
  if (envelopeOpeningRows.length > 0) {
    statements.push(db.insert(envelopeOpening).values(envelopeOpeningRows));
  }

  await db.batch(statements as [BatchItem<"pg">, ...BatchItem<"pg">[]]);

  return c.json({
    scenario,
    buildingBlockIds: buildingBlockRows?.map((b) => b.id) ?? [],
    constructionTypeIds: [...constructionTypeIdByCode.values()],
    openingTypeIds: [...openingTypeIdByCode.values()],
    envelopeElementIds,
  });
});

import {
  buildingBlock,
  constructionLayer,
  constructionType,
  envelopeElement,
  envelopeOpening,
  insertChunked,
  openingType,
} from "@yres/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { Hono } from "hono";
import { canWrite, findAccessibleBuilding } from "../lib/building-access";
import { type AppEnv, authMiddleware } from "../middleware/auth";
import { replaceEnvelopeSchema } from "../schemas/envelope";

export const envelopeRoutes = new Hono<AppEnv>();

envelopeRoutes.use("*", authMiddleware);

// GET /:id/envelope - everything needed to redraw the envelope form: envelope
// elements (with their openings + construction type joined in), building
// blocks, construction types + layers, and opening types.
envelopeRoutes.get("/:id/envelope", async (c) => {
  const buildingId = c.req.param("id");
  const db = c.get("db");
  const user = c.get("user");

  const access = await findAccessibleBuilding(db, buildingId, user.id);
  if (!access) {
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
// D1 has no interactive transactions, so atomicity here comes from `db.batch()`
// (one SQL transaction: if any statement fails, everything rolls back). Because
// batch statements can't read each other's results, ids for new rows are
// generated client-side up front so child rows (layers, elements, openings) can
// reference their parents by id from the start; the payload cross-references
// construction/opening types by a client-supplied `code` rather than a DB id,
// since those ids don't exist until this request creates them. Array bounds in
// schemas/envelope.ts keep the batch inside the D1 query budget (worst case 33
// statements + ≤ 6 for session/access/retrofit lookups).
envelopeRoutes.put("/:id/envelope", async (c) => {
  const buildingId = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = replaceEnvelopeSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
  }

  const db = c.get("db");
  const user = c.get("user");

  const access = await findAccessibleBuilding(db, buildingId, user.id);
  if (!access) {
    return c.json({ error: "Not found" }, 404);
  }
  if (!canWrite(access.role)) {
    return c.json({ error: "You only have view access to this building." }, 403);
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

  const retrofitOfCodes = [
    ...new Set(
      constructionTypes.map((ct) => ct.retrofitOfCode).filter((code): code is string => !!code),
    ),
  ];
  const beforeConstructionTypeIdByCode = new Map<string, string>();
  if (retrofitOfCodes.length > 0) {
    const beforeRows = await db
      .select({ id: constructionType.id, code: constructionType.code })
      .from(constructionType)
      .where(
        and(
          eq(constructionType.buildingId, buildingId),
          eq(constructionType.scenario, "before"),
          inArray(constructionType.code, retrofitOfCodes),
        ),
      );
    for (const row of beforeRows) beforeConstructionTypeIdByCode.set(row.code, row.id);
    const unresolved = retrofitOfCodes.filter((code) => !beforeConstructionTypeIdByCode.has(code));
    if (unresolved.length > 0) {
      return c.json(
        {
          error: `constructionTypes reference unknown retrofitOfCode(s): ${unresolved.join(", ")}`,
        },
        400,
      );
    }
  }

  const openingRetrofitOfCodes = [
    ...new Set(
      openingTypes.map((ot) => ot.retrofitOfCode).filter((code): code is string => !!code),
    ),
  ];
  const beforeOpeningTypeIdByCode = new Map<string, string>();
  if (openingRetrofitOfCodes.length > 0) {
    // Several before types can share a code (one per size); any of them identifies the code —
    // the engine matches the replacement by code.
    const beforeRows = await db
      .select({ id: openingType.id, code: openingType.code })
      .from(openingType)
      .where(
        and(
          eq(openingType.buildingId, buildingId),
          eq(openingType.scenario, "before"),
          inArray(openingType.code, openingRetrofitOfCodes),
        ),
      );
    for (const row of beforeRows) {
      if (!beforeOpeningTypeIdByCode.has(row.code)) beforeOpeningTypeIdByCode.set(row.code, row.id);
    }
    const unresolved = openingRetrofitOfCodes.filter(
      (code) => !beforeOpeningTypeIdByCode.has(code),
    );
    if (unresolved.length > 0) {
      return c.json(
        { error: `openingTypes reference unknown retrofitOfCode(s): ${unresolved.join(", ")}` },
        400,
      );
    }
  }

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
        retrofitOfId: ct.retrofitOfCode
          ? (beforeConstructionTypeIdByCode.get(ct.retrofitOfCode) ?? null)
          : null,
        description: ct.description ?? null,
        temperatureReductionFactor: ct.temperatureReductionFactor ?? null,
        groundLengthM: ct.groundLengthM ?? null,
        groundWidthM: ct.groundWidthM ?? null,
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
      retrofitOfId: ot.retrofitOfCode
        ? (beforeOpeningTypeIdByCode.get(ot.retrofitOfCode) ?? null)
        : null,
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

  // Current after→before links (as before-type codes), read once; see the "before" branch below.
  let oldAfterLinks: { kind: "c" | "o"; afterId: string; code: string }[] = [];
  if (scenario === "before") {
    oldAfterLinks = await db.all<{ kind: "c" | "o"; afterId: string; code: string }>(sql`
      select 'c' as kind, a.id as afterId, b.code as code from construction_type a
        join construction_type b on a.retrofit_of_id = b.id
        where a.building_id = ${buildingId} and a.scenario = 'after'
      union all
      select 'o', a.id, b.code from opening_type a
        join opening_type b on a.retrofit_of_id = b.id
        where a.building_id = ${buildingId} and a.scenario = 'after'`);
  }

  const statements: BatchItem<"sqlite">[] = [];
  if (scenario === "before") {
    // The "before" types are re-created with new ids and "after" types point at them (retrofit_of_id FK).
    // The link is by code, so: deferred FK check (1) → delete/insert as usual → after the inserts re-point
    // each after type at the new before type of the same code (one CASE UPDATE per table); a code that no
    // longer exists becomes NULL (the engine then warns that the replacement is unspecified).
    statements.push(db.run(sql`PRAGMA defer_foreign_keys = on`));
  }
  statements.push(deleteElements, deleteOpeningTypes, deleteConstructionTypes);

  if (buildingBlockRows) {
    statements.push(db.delete(buildingBlock).where(eq(buildingBlock.buildingId, buildingId)));
    if (buildingBlockRows.length > 0) {
      statements.push(...insertChunked(db, buildingBlock, buildingBlockRows));
    }
  }

  if (constructionTypeRows.length > 0) {
    statements.push(...insertChunked(db, constructionType, constructionTypeRows));
  }
  if (constructionLayerRows.length > 0) {
    statements.push(...insertChunked(db, constructionLayer, constructionLayerRows));
  }
  if (openingTypeRows.length > 0) {
    statements.push(...insertChunked(db, openingType, openingTypeRows));
  }
  if (envelopeElementRows.length > 0) {
    statements.push(...insertChunked(db, envelopeElement, envelopeElementRows));
  }
  if (envelopeOpeningRows.length > 0) {
    statements.push(...insertChunked(db, envelopeOpening, envelopeOpeningRows));
  }

  if (scenario === "before" && oldAfterLinks.length > 0) {
    const relink = (
      table: typeof constructionType | typeof openingType,
      kind: "c" | "o",
      newIdByCode: Map<string, string>,
    ) => {
      const links = oldAfterLinks.filter((l) => l.kind === kind);
      if (links.length === 0) return;
      const cases = links.map(
        (l) => sql`when ${l.afterId} then ${newIdByCode.get(l.code) ?? null}`,
      );
      statements.push(
        db
          .update(table)
          .set({ retrofitOfId: sql`case ${table.id} ${sql.join(cases, sql` `)} else null end` })
          .where(
            inArray(
              table.id,
              links.map((l) => l.afterId),
            ),
          ),
      );
    };
    relink(constructionType, "c", constructionTypeIdByCode);
    relink(openingType, "o", openingTypeIdByCode);
  }

  await db.batch(statements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);

  return c.json({
    scenario,
    buildingBlockIds: buildingBlockRows?.map((b) => b.id) ?? [],
    constructionTypeIds: [...constructionTypeIdByCode.values()],
    openingTypeIds: [...openingTypeIdByCode.values()],
    envelopeElementIds,
  });
});

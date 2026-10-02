import {
  type Database,
  building,
  constructionType,
  coolingSystem,
  coolingWindow,
  dhwSource,
  distributionSystem,
  energyMeasure,
  energyTariff,
  envelopeElement,
  equipmentItem,
  generationSource,
  lampType,
  lightingZone,
  nonEeMeasure,
  openingType,
  pipeLossReference,
  renewableSystem,
  surfaceResistance,
  utilityBill,
  ventilationSystem,
} from "@yres/db";
import { desc, eq } from "drizzle-orm";

/** Bookkeeping columns the engine never reads; dropped so fixtures are plain JSON (no `Date`s). */
type Bookkeeping = "createdAt" | "updatedAt" | "userId";
type Strip<T> = T extends readonly (infer U)[]
  ? Strip<U>[]
  : T extends object
    ? { [K in keyof T as K extends Bookkeeping ? never : K]: Strip<T[K]> }
    : T;

function readRaw(db: Database, buildingId: string) {
  return Promise.all([
    db.query.building.findFirst({
      where: eq(building.id, buildingId),
      with: { climateRegion: { with: { monthlyNormals: true } }, blocks: true },
    }),
    db.query.envelopeElement.findMany({
      where: eq(envelopeElement.buildingId, buildingId),
      with: { openings: { with: { openingType: true } } },
    }),
    db.query.constructionType.findMany({
      where: eq(constructionType.buildingId, buildingId),
      with: { layers: { with: { material: true } } },
    }),
    db.query.openingType.findMany({ where: eq(openingType.buildingId, buildingId) }),
    db.select().from(surfaceResistance),
    db.query.ventilationSystem.findMany({ where: eq(ventilationSystem.buildingId, buildingId) }),
    db.query.coolingWindow.findMany({ where: eq(coolingWindow.buildingId, buildingId) }),
    db.query.coolingSystem.findMany({ where: eq(coolingSystem.buildingId, buildingId) }),
    db.query.dhwSource.findMany({ where: eq(dhwSource.buildingId, buildingId) }),
    db.query.distributionSystem.findMany({
      where: eq(distributionSystem.buildingId, buildingId),
    }),
    db.select().from(pipeLossReference),
    db.query.generationSource.findMany({ where: eq(generationSource.buildingId, buildingId) }),
    db.query.lightingZone.findMany({ where: eq(lightingZone.buildingId, buildingId) }),
    db.select().from(lampType),
    db.query.equipmentItem.findMany({ where: eq(equipmentItem.buildingId, buildingId) }),
    db.query.renewableSystem.findMany({
      where: eq(renewableSystem.buildingId, buildingId),
      with: { monthlyProduction: true },
    }),
    db.select().from(utilityBill).where(eq(utilityBill.buildingId, buildingId)),
    db.query.energyMeasure.findMany({ where: eq(energyMeasure.buildingId, buildingId) }),
    db.query.nonEeMeasure.findMany({ where: eq(nonEeMeasure.buildingId, buildingId) }),
    db.select().from(energyTariff).orderBy(desc(energyTariff.effectiveDate)),
  ]);
}
type Raw = Awaited<ReturnType<typeof readRaw>>;
type NonNull0 = NonNullable<Raw[0]>;
type ClimateRegion = NonNull0["climateRegion"];

/**
 * Everything `computeAudit` reads — one building's stored state plus the global reference
 * tables. Plain JSON-serializable data (no `Date`s), so the golden test (F03) can feed it
 * from a fixture without a database.
 */
export interface AuditInputs {
  building: Strip<Omit<NonNull0, "climateRegion" | "blocks">>;
  climateRegion: Strip<Pick<ClimateRegion, "monthlyNormals">>;
  blocks: Strip<NonNull0["blocks"]>;
  envelopeElements: Strip<Raw[1]>;
  constructionTypes: Strip<Raw[2]>;
  openingTypes: Strip<Raw[3]>;
  surfaceResistances: Strip<Raw[4]>;
  ventilationSystems: Strip<Raw[5]>;
  coolingWindows: Strip<Raw[6]>;
  coolingSystems: Strip<Raw[7]>;
  dhwSources: Strip<Raw[8]>;
  distributionSystems: Strip<Raw[9]>;
  pipeLossReferences: Strip<Raw[10]>;
  generationSources: Strip<Raw[11]>;
  lightingZones: Strip<Raw[12]>;
  lampTypes: Strip<Raw[13]>;
  equipmentItems: Strip<Raw[14]>;
  renewableSystems: Strip<Raw[15]>;
  utilityBills: Strip<Raw[16]>;
  energyMeasures: Strip<Raw[17]>;
  nonEeMeasures: Strip<Raw[18]>;
  /** Newest `effectiveDate` first. */
  tariffs: Strip<Raw[19]>;
}

/**
 * All of the audit's database reads in one `Promise.all` (20 queries — within the
 * `database.md` budget). Throws if the building does not exist.
 */
export async function loadAuditInputs(db: Database, buildingId: string): Promise<AuditInputs> {
  const raw = await readRaw(db, buildingId);
  const [buildingRecord] = raw;
  if (!buildingRecord) throw new Error(`Building ${buildingId} not found`);

  const { climateRegion, blocks, ...buildingFields } = buildingRecord;
  return {
    building: buildingFields,
    climateRegion: { monthlyNormals: climateRegion.monthlyNormals },
    blocks,
    envelopeElements: raw[1],
    constructionTypes: raw[2],
    openingTypes: raw[3],
    surfaceResistances: raw[4],
    ventilationSystems: raw[5],
    coolingWindows: raw[6],
    coolingSystems: raw[7],
    dhwSources: raw[8],
    distributionSystems: raw[9],
    pipeLossReferences: raw[10],
    generationSources: raw[11],
    lightingZones: raw[12],
    lampTypes: raw[13],
    equipmentItems: raw[14],
    renewableSystems: raw[15],
    utilityBills: raw[16],
    energyMeasures: raw[17],
    nonEeMeasures: raw[18],
    tariffs: raw[19],
  };
}

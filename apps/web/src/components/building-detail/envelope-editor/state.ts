import type { EnvelopeElementCategory, Orientation, Scenario } from "@yres/types";
import type { TFunction } from "i18next";
import type { EnvelopeData, ReplaceEnvelopePayload } from "../../../lib/api-types";

export const EDIT_SCENARIO: Scenario = "before";

let uidCounter = 0;
export function uid() {
  uidCounter += 1;
  return `row-${uidCounter}`;
}

export interface BuildingBlockRow {
  rowId: string;
  name: string;
  footprintLengthM: string;
  footprintWidthM: string;
  numberOfFloors: string;
  floorToFloorHeightM: string;
  perimeterM: string;
  perimeterLossCoefficient: string;
}

export interface LayerRow {
  rowId: string;
  layerOrder: number;
  materialId: string;
  thicknessM: string;
}

export interface ConstructionTypeRow {
  rowId: string;
  code: string;
  elementCategory: EnvelopeElementCategory;
  description: string;
  layers: LayerRow[];
}

export interface OpeningTypeRow {
  rowId: string;
  code: string;
  category: "window" | "door";
  uValueWm2k: string;
  widthM: string;
  heightM: string;
  gValue: string;
  frameFactor: string;
  shadingFactor: string;
  description: string;
}

export interface OpeningRefRow {
  rowId: string;
  openingTypeCode: string;
  count: string;
}

export interface EnvelopeElementRow {
  rowId: string;
  blockName: string;
  orientation: Orientation;
  sideCode: string;
  description: string;
  constructionTypeCode: string;
  lengthM: string;
  heightEnvContactM: string;
  heightGroundContactM: string;
  openings: OpeningRefRow[];
}

export interface EditorState {
  buildingBlocks: BuildingBlockRow[];
  constructionTypes: ConstructionTypeRow[];
  openingTypes: OpeningTypeRow[];
  envelopeElements: EnvelopeElementRow[];
}

export function emptyBuildingBlock(): BuildingBlockRow {
  return {
    rowId: uid(),
    name: "",
    footprintLengthM: "",
    footprintWidthM: "",
    numberOfFloors: "1",
    floorToFloorHeightM: "",
    perimeterM: "",
    perimeterLossCoefficient: "0.4",
  };
}

export function emptyConstructionType(): ConstructionTypeRow {
  return {
    rowId: uid(),
    code: "",
    elementCategory: "external_wall",
    description: "",
    layers: [],
  };
}

export function emptyOpeningType(): OpeningTypeRow {
  return {
    rowId: uid(),
    code: "",
    category: "window",
    uValueWm2k: "",
    widthM: "",
    heightM: "",
    gValue: "",
    frameFactor: "",
    shadingFactor: "1",
    description: "",
  };
}

export function emptyEnvelopeElement(
  defaults?: Partial<Pick<EnvelopeElementRow, "blockName" | "orientation" | "sideCode">>,
): EnvelopeElementRow {
  return {
    rowId: uid(),
    blockName: defaults?.blockName ?? "",
    orientation: defaults?.orientation ?? "south",
    sideCode: defaults?.sideCode ?? "",
    description: "",
    constructionTypeCode: "",
    lengthM: "",
    heightEnvContactM: "",
    heightGroundContactM: "",
    openings: [],
  };
}

export function toEditorState(data: EnvelopeData): EditorState {
  const buildingBlocks = data.blocks.map((b) => ({
    rowId: uid(),
    name: b.name,
    footprintLengthM: String(b.footprintLengthM),
    footprintWidthM: String(b.footprintWidthM),
    numberOfFloors: String(b.numberOfFloors),
    floorToFloorHeightM: String(b.floorToFloorHeightM),
    perimeterM: String(b.perimeterM),
    perimeterLossCoefficient: String(b.perimeterLossCoefficient),
  }));

  const constructionTypes = data.constructionTypes
    .filter((ct) => ct.scenario === EDIT_SCENARIO)
    .map((ct) => ({
      rowId: uid(),
      code: ct.code,
      elementCategory: ct.elementCategory as EnvelopeElementCategory,
      description: ct.description ?? "",
      layers: [...ct.layers]
        .sort((a, b) => a.layerOrder - b.layerOrder)
        .map((l) => ({
          rowId: uid(),
          layerOrder: l.layerOrder,
          materialId: l.materialId,
          thicknessM: String(l.thicknessM),
        })),
    }));

  const openingTypes = data.openingTypes
    .filter((ot) => ot.scenario === EDIT_SCENARIO)
    .map((ot) => ({
      rowId: uid(),
      code: ot.code,
      category: ot.category,
      uValueWm2k: String(ot.uValueWm2k),
      widthM: ot.widthM !== null ? String(ot.widthM) : "",
      heightM: ot.heightM !== null ? String(ot.heightM) : "",
      gValue: ot.gValue !== null ? String(ot.gValue) : "",
      frameFactor: ot.frameFactor !== null ? String(ot.frameFactor) : "",
      shadingFactor: String(ot.shadingFactor),
      description: ot.description ?? "",
    }));

  const envelopeElements = data.envelopeElements
    .filter((el) => (el.constructionType?.scenario ?? EDIT_SCENARIO) === EDIT_SCENARIO)
    .map((el) => ({
      rowId: uid(),
      blockName: el.blockName,
      orientation: el.orientation,
      sideCode: el.sideCode ?? "",
      description: el.description ?? "",
      constructionTypeCode: el.constructionType?.code ?? "",
      lengthM: String(el.lengthM),
      heightEnvContactM: el.heightEnvContactM !== null ? String(el.heightEnvContactM) : "",
      heightGroundContactM: el.heightGroundContactM !== null ? String(el.heightGroundContactM) : "",
      openings: el.openings.map((o) => ({
        rowId: uid(),
        openingTypeCode: o.openingType?.code ?? "",
        count: String(o.count),
      })),
    }));

  return { buildingBlocks, constructionTypes, openingTypes, envelopeElements };
}

export function parseEditorState(
  state: EditorState,
  t: TFunction,
): {
  payload: ReplaceEnvelopePayload | null;
  errors: string[];
} {
  const errors: string[] = [];

  const blockNames = new Set<string>();
  for (const b of state.buildingBlocks) {
    if (!b.name.trim()) errors.push(t("envelope:editor.errors.buildingBlockNameRequired"));
    else if (blockNames.has(b.name.trim()))
      errors.push(t("envelope:editor.errors.buildingBlockNameDuplicate", { name: b.name }));
    else blockNames.add(b.name.trim());
    for (const [field, messageKey] of [
      ["footprintLengthM", "buildingBlockFootprintLengthInvalid"],
      ["footprintWidthM", "buildingBlockFootprintWidthInvalid"],
      ["floorToFloorHeightM", "buildingBlockFloorHeightInvalid"],
      ["perimeterM", "buildingBlockPerimeterInvalid"],
    ] as const) {
      const raw = b[field];
      if (!raw || Number.isNaN(Number(raw)) || Number(raw) <= 0) {
        errors.push(t(`envelope:editor.errors.${messageKey}`, { name: b.name || "?" }));
      }
    }
    if (
      !b.numberOfFloors ||
      !Number.isInteger(Number(b.numberOfFloors)) ||
      Number(b.numberOfFloors) <= 0
    ) {
      errors.push(t("envelope:editor.errors.buildingBlockFloorsInvalid", { name: b.name || "?" }));
    }
  }

  const ctCodes = new Set<string>();
  for (const ct of state.constructionTypes) {
    if (!ct.code.trim()) errors.push(t("envelope:editor.errors.constructionTypeCodeRequired"));
    else if (ctCodes.has(ct.code.trim()))
      errors.push(t("envelope:editor.errors.constructionTypeCodeDuplicate", { code: ct.code }));
    else ctCodes.add(ct.code.trim());
    for (const layer of ct.layers) {
      if (!layer.materialId)
        errors.push(t("envelope:editor.errors.layerMaterialRequired", { code: ct.code || "?" }));
      if (
        !layer.thicknessM ||
        Number.isNaN(Number(layer.thicknessM)) ||
        Number(layer.thicknessM) <= 0
      ) {
        errors.push(t("envelope:editor.errors.layerThicknessInvalid", { code: ct.code || "?" }));
      }
    }
  }

  const otCodes = new Set<string>();
  for (const ot of state.openingTypes) {
    if (!ot.code.trim()) errors.push(t("envelope:editor.errors.openingTypeCodeRequired"));
    else if (otCodes.has(ot.code.trim()))
      errors.push(t("envelope:editor.errors.openingTypeCodeDuplicate", { code: ot.code }));
    else otCodes.add(ot.code.trim());
    if (!ot.uValueWm2k || Number.isNaN(Number(ot.uValueWm2k)) || Number(ot.uValueWm2k) <= 0) {
      errors.push(t("envelope:editor.errors.openingTypeUValueInvalid", { code: ot.code || "?" }));
    }
  }

  for (const el of state.envelopeElements) {
    if (!el.blockName.trim()) errors.push(t("envelope:editor.errors.elementBlockNameRequired"));
    if (!el.constructionTypeCode)
      errors.push(
        t("envelope:editor.errors.elementConstructionTypeRequired", {
          blockName: el.blockName || "?",
        }),
      );
    else if (!ctCodes.has(el.constructionTypeCode)) {
      errors.push(
        t("envelope:editor.errors.elementConstructionTypeUnknown", {
          blockName: el.blockName || "?",
          code: el.constructionTypeCode,
        }),
      );
    }
    if (!el.lengthM || Number.isNaN(Number(el.lengthM)) || Number(el.lengthM) <= 0) {
      errors.push(
        t("envelope:editor.errors.elementLengthInvalid", { blockName: el.blockName || "?" }),
      );
    }
    for (const o of el.openings) {
      if (!o.openingTypeCode)
        errors.push(
          t("envelope:editor.errors.elementOpeningTypeRequired", {
            blockName: el.blockName || "?",
          }),
        );
      else if (!otCodes.has(o.openingTypeCode)) {
        errors.push(
          t("envelope:editor.errors.elementOpeningTypeUnknown", {
            blockName: el.blockName || "?",
            code: o.openingTypeCode,
          }),
        );
      }
      if (!o.count || Number.isNaN(Number(o.count)) || Number(o.count) <= 0) {
        errors.push(
          t("envelope:editor.errors.elementOpeningCountInvalid", { blockName: el.blockName || "?" }),
        );
      }
    }
  }

  if (errors.length > 0) return { payload: null, errors };

  return {
    payload: {
      scenario: EDIT_SCENARIO,
      buildingBlocks: state.buildingBlocks.map((b) => ({
        name: b.name.trim(),
        footprintLengthM: Number(b.footprintLengthM),
        footprintWidthM: Number(b.footprintWidthM),
        numberOfFloors: Number(b.numberOfFloors),
        floorToFloorHeightM: Number(b.floorToFloorHeightM),
        perimeterM: Number(b.perimeterM),
        perimeterLossCoefficient: b.perimeterLossCoefficient.trim()
          ? Number(b.perimeterLossCoefficient)
          : undefined,
      })),
      constructionTypes: state.constructionTypes.map((ct) => ({
        code: ct.code.trim(),
        elementCategory: ct.elementCategory,
        description: ct.description.trim() || null,
        layers: ct.layers.map((l, idx) => ({
          layerOrder: idx,
          materialId: l.materialId,
          thicknessM: Number(l.thicknessM),
        })),
      })),
      openingTypes: state.openingTypes.map((ot) => ({
        code: ot.code.trim(),
        category: ot.category,
        uValueWm2k: Number(ot.uValueWm2k),
        widthM: ot.widthM.trim() ? Number(ot.widthM) : null,
        heightM: ot.heightM.trim() ? Number(ot.heightM) : null,
        gValue: ot.gValue.trim() ? Number(ot.gValue) : null,
        frameFactor: ot.frameFactor.trim() ? Number(ot.frameFactor) : null,
        shadingFactor: ot.shadingFactor.trim() ? Number(ot.shadingFactor) : undefined,
        description: ot.description.trim() || null,
      })),
      envelopeElements: state.envelopeElements.map((el) => ({
        blockName: el.blockName.trim(),
        orientation: el.orientation,
        sideCode: el.sideCode.trim() || null,
        description: el.description.trim() || null,
        constructionTypeCode: el.constructionTypeCode,
        lengthM: Number(el.lengthM),
        heightEnvContactM: el.heightEnvContactM.trim() ? Number(el.heightEnvContactM) : undefined,
        heightGroundContactM: el.heightGroundContactM.trim()
          ? Number(el.heightGroundContactM)
          : undefined,
        openings: el.openings.map((o) => ({
          openingTypeCode: o.openingTypeCode,
          count: Number(o.count),
        })),
      })),
    },
    errors: [],
  };
}

import type { EnvelopeElementCategory, Orientation, Scenario } from "@yres/types";
import type { TFunction } from "i18next";
import type { EnvelopeData, ReplaceEnvelopePayload } from "../../../lib/api-types";
import { type NumberLocale, formatNumberForInput, parseLocaleNumber } from "../../../lib/number";

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
  /** "After" scenario only: code of the "before" type this one replaces ("" = not chosen yet). */
  retrofitOfCode: string;
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
  /** "After" scenario only: code of the "before" type this one replaces ("" = not chosen yet). */
  retrofitOfCode: string;
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
    retrofitOfCode: "",
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
    retrofitOfCode: "",
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

export interface BeforeTypeOption {
  code: string;
  /** Element category (construction types) or "window"/"door" (opening types). */
  category: string;
}

/** Distinct "before" type codes the "after" editor can pick from (several sizes of one opening code collapse). */
export function beforeTypeOptions(data: EnvelopeData): {
  constructionTypes: BeforeTypeOption[];
  openingTypes: BeforeTypeOption[];
} {
  const distinct = (items: BeforeTypeOption[]) => [
    ...new Map(items.map((i) => [i.code, i])).values(),
  ];
  return {
    constructionTypes: distinct(
      data.constructionTypes
        .filter((ct) => ct.scenario === "before")
        .map((ct) => ({ code: ct.code, category: ct.elementCategory })),
    ),
    openingTypes: distinct(
      data.openingTypes
        .filter((ot) => ot.scenario === "before")
        .map((ot) => ({ code: ot.code, category: ot.category })),
    ),
  };
}

export function toEditorState(
  data: EnvelopeData,
  locale: NumberLocale,
  scenario: Scenario,
): EditorState {
  // Blocks and elements belong to the "before" geometry; the "after" editor only changes types.
  const isBefore = scenario === "before";
  const codeOf = (types: { id: string; code: string }[], id: string | null) =>
    (id && types.find((t) => t.id === id)?.code) || "";
  const buildingBlocks = (isBefore ? data.blocks : []).map((b) => ({
    rowId: uid(),
    name: b.name,
    footprintLengthM: formatNumberForInput(b.footprintLengthM, locale),
    footprintWidthM: formatNumberForInput(b.footprintWidthM, locale),
    numberOfFloors: formatNumberForInput(b.numberOfFloors, locale),
    floorToFloorHeightM: formatNumberForInput(b.floorToFloorHeightM, locale),
    perimeterM: formatNumberForInput(b.perimeterM, locale),
    perimeterLossCoefficient: formatNumberForInput(b.perimeterLossCoefficient, locale),
  }));

  const constructionTypes = data.constructionTypes
    .filter((ct) => ct.scenario === scenario)
    .map((ct) => ({
      rowId: uid(),
      code: ct.code,
      elementCategory: ct.elementCategory as EnvelopeElementCategory,
      description: ct.description ?? "",
      retrofitOfCode: codeOf(data.constructionTypes, ct.retrofitOfId),
      layers: [...ct.layers]
        .sort((a, b) => a.layerOrder - b.layerOrder)
        .map((l) => ({
          rowId: uid(),
          layerOrder: l.layerOrder,
          materialId: l.materialId,
          thicknessM: formatNumberForInput(l.thicknessM, locale),
        })),
    }));

  const openingTypes = data.openingTypes
    .filter((ot) => ot.scenario === scenario)
    .map((ot) => ({
      rowId: uid(),
      code: ot.code,
      category: ot.category,
      uValueWm2k: formatNumberForInput(ot.uValueWm2k, locale),
      widthM: formatNumberForInput(ot.widthM, locale),
      heightM: formatNumberForInput(ot.heightM, locale),
      gValue: formatNumberForInput(ot.gValue, locale),
      frameFactor: formatNumberForInput(ot.frameFactor, locale),
      shadingFactor: formatNumberForInput(ot.shadingFactor, locale),
      description: ot.description ?? "",
      retrofitOfCode: codeOf(data.openingTypes, ot.retrofitOfId),
    }));

  const envelopeElements = (isBefore ? data.envelopeElements : [])
    .filter((el) => (el.constructionType?.scenario ?? "before") === "before")
    .map((el) => ({
      rowId: uid(),
      blockName: el.blockName,
      orientation: el.orientation,
      sideCode: el.sideCode ?? "",
      description: el.description ?? "",
      constructionTypeCode: el.constructionType?.code ?? "",
      lengthM: formatNumberForInput(el.lengthM, locale),
      heightEnvContactM: formatNumberForInput(el.heightEnvContactM, locale),
      heightGroundContactM: formatNumberForInput(el.heightGroundContactM, locale),
      openings: el.openings.map((o) => ({
        rowId: uid(),
        openingTypeCode: o.openingType?.code ?? "",
        count: formatNumberForInput(o.count, locale),
      })),
    }));

  return { buildingBlocks, constructionTypes, openingTypes, envelopeElements };
}

export function parseEditorState(
  state: EditorState,
  t: TFunction,
  locale: NumberLocale,
  scenario: Scenario,
  beforeTypes: { constructionTypes: BeforeTypeOption[]; openingTypes: BeforeTypeOption[] },
): {
  payload: ReplaceEnvelopePayload | null;
  errors: string[];
} {
  const errors: string[] = [];

  // Text → number the way the user meant it (12,5 / 12.5). Everything is validated below BEFORE the payload
  // is built, so the NaN a bad value would give here never reaches the API.
  const read = (raw: string, integer = false) => {
    const parsed = parseLocaleNumber(raw, locale, { integer });
    return parsed.ok ? parsed.value : Number.NaN;
  };
  /** Optional field: empty is "not given"; text that is not a number is an error, never silently dropped. */
  const readOptional = (raw: string, where: string): number | undefined => {
    const parsed = parseLocaleNumber(raw, locale);
    if (parsed.ok) return parsed.value;
    if (parsed.reason === "invalid") {
      errors.push(t("envelope:editor.errors.numberInvalid", { where }));
    }
    return undefined;
  };
  const positive = (raw: string, integer = false) => {
    const value = read(raw, integer);
    return Number.isFinite(value) && value > 0;
  };

  const isBefore = scenario === "before";
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
      if (!positive(b[field])) {
        errors.push(t(`envelope:editor.errors.${messageKey}`, { name: b.name || "?" }));
      }
    }
    if (!positive(b.numberOfFloors, true)) {
      errors.push(t("envelope:editor.errors.buildingBlockFloorsInvalid", { name: b.name || "?" }));
    }
  }

  const ctCodes = new Set<string>();
  for (const ct of state.constructionTypes) {
    if (!ct.code.trim()) errors.push(t("envelope:editor.errors.constructionTypeCodeRequired"));
    else if (ctCodes.has(ct.code.trim()))
      errors.push(t("envelope:editor.errors.constructionTypeCodeDuplicate", { code: ct.code }));
    else ctCodes.add(ct.code.trim());
    if (!isBefore) {
      const target = beforeTypes.constructionTypes.find((o) => o.code === ct.retrofitOfCode);
      if (!target)
        errors.push(t("envelope:editor.errors.retrofitOfRequired", { code: ct.code || "?" }));
      else if (target.category !== ct.elementCategory)
        errors.push(t("envelope:editor.errors.retrofitCategoryMismatch", { code: ct.code || "?" }));
      else if (
        state.constructionTypes.some(
          (o) => o.rowId !== ct.rowId && o.retrofitOfCode === ct.retrofitOfCode,
        )
      )
        errors.push(
          t("envelope:editor.errors.retrofitOfDuplicate", { replaced: ct.retrofitOfCode }),
        );
    }
    for (const layer of ct.layers) {
      if (!layer.materialId)
        errors.push(t("envelope:editor.errors.layerMaterialRequired", { code: ct.code || "?" }));
      if (!positive(layer.thicknessM)) {
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
    if (!isBefore) {
      const target = beforeTypes.openingTypes.find((o) => o.code === ot.retrofitOfCode);
      if (!target)
        errors.push(t("envelope:editor.errors.retrofitOfRequired", { code: ot.code || "?" }));
      else if (target.category !== ot.category)
        errors.push(t("envelope:editor.errors.retrofitCategoryMismatch", { code: ot.code || "?" }));
      else if (
        state.openingTypes.some(
          (o) => o.rowId !== ot.rowId && o.retrofitOfCode === ot.retrofitOfCode,
        )
      )
        errors.push(
          t("envelope:editor.errors.retrofitOfDuplicate", { replaced: ot.retrofitOfCode }),
        );
    }
    if (!positive(ot.uValueWm2k)) {
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
    if (!positive(el.lengthM)) {
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
      if (!positive(o.count, true)) {
        errors.push(
          t("envelope:editor.errors.elementOpeningCountInvalid", {
            blockName: el.blockName || "?",
          }),
        );
      }
    }
  }

  // Optional numeric fields: empty is fine, unreadable text is an error (collected here, parsed again below).
  const label = (key: string) => t(`envelope:editor.${key}`).replace(/\s*\*$/, "");
  for (const b of state.buildingBlocks) {
    readOptional(
      b.perimeterLossCoefficient,
      `${b.name || "?"} — ${label("buildingBlocks.perimeterLossCoefficient")}`,
    );
  }
  for (const ot of state.openingTypes) {
    const who = ot.code || "?";
    readOptional(ot.widthM, `${who} — ${label("openingTypes.width")}`);
    readOptional(ot.heightM, `${who} — ${label("openingTypes.height")}`);
    readOptional(ot.gValue, `${who} — ${label("openingTypes.gValue")}`);
    readOptional(ot.frameFactor, `${who} — ${label("openingTypes.frameFactor")}`);
    readOptional(ot.shadingFactor, `${who} — ${label("openingTypes.shadingFactor")}`);
  }
  for (const el of state.envelopeElements) {
    const who = el.blockName || "?";
    readOptional(el.heightEnvContactM, `${who} — ${label("elements.heightEnvContact")}`);
    readOptional(el.heightGroundContactM, `${who} — ${label("elements.heightGroundContact")}`);
  }

  if (errors.length > 0) return { payload: null, errors };

  // Reads an optional field that was validated above: empty → undefined.
  const optional = (raw: string): number | undefined => {
    const parsed = parseLocaleNumber(raw, locale);
    return parsed.ok ? parsed.value : undefined;
  };

  return {
    payload: {
      scenario,
      // "After" never touches the blocks (omitted = left as they are).
      buildingBlocks: !isBefore
        ? undefined
        : state.buildingBlocks.map((b) => ({
            name: b.name.trim(),
            footprintLengthM: read(b.footprintLengthM),
            footprintWidthM: read(b.footprintWidthM),
            numberOfFloors: read(b.numberOfFloors, true),
            floorToFloorHeightM: read(b.floorToFloorHeightM),
            perimeterM: read(b.perimeterM),
            perimeterLossCoefficient: optional(b.perimeterLossCoefficient),
          })),
      constructionTypes: state.constructionTypes.map((ct) => ({
        code: ct.code.trim(),
        elementCategory: ct.elementCategory,
        description: ct.description.trim() || null,
        ...(isBefore ? {} : { retrofitOfCode: ct.retrofitOfCode }),
        layers: ct.layers.map((l, idx) => ({
          layerOrder: idx,
          materialId: l.materialId,
          thicknessM: read(l.thicknessM),
        })),
      })),
      openingTypes: state.openingTypes.map((ot) => ({
        code: ot.code.trim(),
        category: ot.category,
        uValueWm2k: read(ot.uValueWm2k),
        widthM: optional(ot.widthM) ?? null,
        heightM: optional(ot.heightM) ?? null,
        gValue: optional(ot.gValue) ?? null,
        frameFactor: optional(ot.frameFactor) ?? null,
        shadingFactor: optional(ot.shadingFactor),
        description: ot.description.trim() || null,
        ...(isBefore ? {} : { retrofitOfCode: ot.retrofitOfCode }),
      })),
      envelopeElements: state.envelopeElements.map((el) => ({
        blockName: el.blockName.trim(),
        orientation: el.orientation,
        sideCode: el.sideCode.trim() || null,
        description: el.description.trim() || null,
        constructionTypeCode: el.constructionTypeCode,
        lengthM: read(el.lengthM),
        heightEnvContactM: optional(el.heightEnvContactM),
        heightGroundContactM: optional(el.heightGroundContactM),
        openings: el.openings.map((o) => ({
          openingTypeCode: o.openingTypeCode,
          count: read(o.count, true),
        })),
      })),
    },
    errors: [],
  };
}

import { LAMP_TYPE_NAMES } from "@yres/db";
import type { AuditInputs } from "../../src/services/audit-inputs";
import raw from "./fixtures/3-dmtt/v7.20/inputs.json";

/** `inputs.json` with the `@LAMP:<key>` placeholders resolved to the engine's lamp-type names. */
export function loadGoldenInputs(): AuditInputs {
  const inputs = structuredClone(raw.inputs) as unknown as AuditInputs;
  for (const lamp of inputs.lampTypes) {
    const key = lamp.name.replace("@LAMP:", "") as keyof typeof LAMP_TYPE_NAMES;
    lamp.name = LAMP_TYPE_NAMES[key];
  }
  return inputs;
}

import type { Scenario } from "./envelope";

export interface EquipmentResult {
  scenario: Scenario;
  /** `Equipment!K49`/`K100` — total annual consumption across heating + cooling season use. */
  annualConsumptionKwh: number;
  /** `Equipment!M49`/`M100` — cooling-season-only consumption, fed into Cooling as an internal heat gain. */
  coolingSeasonConsumptionKwh: number;
}

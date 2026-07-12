import type { EquipmentResult, Scenario } from "@yres/types";

export interface EquipmentItemInput {
  unitPowerKw: number;
  quantity: number;
  heatingSeasonHours: number;
  coolingSeasonHours: number;
  heatingUtilizationFactor: number;
  coolingUtilizationFactor: number;
}

/**
 * `Equipment` sheet: per device row `F=D*E` (total power), `K = F*G*I +
 * F*H*J` (annual consumption = heating-season use + cooling-season use),
 * `M = F*H*J` (cooling-season-only consumption, later read by `Cooling`
 * as an internal heat gain — `Cooling!D37=Equipment!M49`).
 */
export function calculateEquipmentResult(
  scenario: Scenario,
  items: EquipmentItemInput[],
): EquipmentResult {
  let annualConsumptionKwh = 0;
  let coolingSeasonConsumptionKwh = 0;

  for (const item of items) {
    const totalPowerKw = item.unitPowerKw * item.quantity;
    const heatingSeasonKwh = totalPowerKw * item.heatingSeasonHours * item.heatingUtilizationFactor;
    const coolingSeasonKwh = totalPowerKw * item.coolingSeasonHours * item.coolingUtilizationFactor;
    annualConsumptionKwh += heatingSeasonKwh + coolingSeasonKwh;
    coolingSeasonConsumptionKwh += coolingSeasonKwh;
  }

  return { scenario, annualConsumptionKwh, coolingSeasonConsumptionKwh };
}

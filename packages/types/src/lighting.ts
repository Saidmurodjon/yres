import type { Scenario } from "./envelope";

export interface LightingTechnologyMix {
  incandescentFraction: number;
  fluorescentElectromagneticFraction: number;
  fluorescentElectronicFraction: number;
  ledFraction: number;
}

/** W/m², keyed the same as LightingTechnologyMix's fractions. */
export interface LampPowerDensityWPerM2 {
  incandescent: number;
  fluorescentElectromagnetic: number;
  fluorescentElectronic: number;
  led: number;
}

export interface LightingResult {
  scenario: Scenario;
  annualConsumptionKwh: number;
}

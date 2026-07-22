import { describe, expect, it } from "vitest";
import {
  type BillRow,
  groupBillsByCarrierYearMonth,
} from "../../src/services/report-data.service";

describe("groupBillsByCarrierYearMonth", () => {
  it("groups bills by carrier, then by month, averaging across years", () => {
    const bills: BillRow[] = [
      { energyCarrier: "gas", year: 2021, month: 1, consumptionKwh: 1000, expenseLocal: 500 },
      { energyCarrier: "gas", year: 2022, month: 1, consumptionKwh: 1200, expenseLocal: 600 },
      { energyCarrier: "gas", year: 2021, month: 2, consumptionKwh: 900, expenseLocal: 450 },
      { energyCarrier: "electricity", year: 2021, month: 1, consumptionKwh: 300, expenseLocal: 120 },
    ];

    const result = groupBillsByCarrierYearMonth(bills);

    const gas = result.find((r) => r.energyCarrier === "gas");
    expect(gas).toBeDefined();
    const january = gas?.months.find((m) => m.month === 1);
    expect(january?.byYear).toHaveLength(2);
    expect(january?.averageConsumptionKwh).toBeCloseTo((1000 + 1200) / 2, 6);
    const february = gas?.months.find((m) => m.month === 2);
    expect(february?.averageConsumptionKwh).toBeCloseTo(900, 6);

    const electricity = result.find((r) => r.energyCarrier === "electricity");
    expect(electricity?.months).toHaveLength(1);
  });

  it("skips bills with no metered kWh (e.g. only a native-unit reading was entered)", () => {
    const bills: BillRow[] = [
      { energyCarrier: "gas", year: 2021, month: 1, consumptionKwh: null, expenseLocal: 500 },
      { energyCarrier: "gas", year: 2021, month: 2, consumptionKwh: 900, expenseLocal: 450 },
    ];

    const result = groupBillsByCarrierYearMonth(bills);
    const gas = result.find((r) => r.energyCarrier === "gas");
    expect(gas?.months).toHaveLength(1);
    expect(gas?.months[0]?.month).toBe(2);
  });

  it("returns an empty array for no bills", () => {
    expect(groupBillsByCarrierYearMonth([])).toEqual([]);
  });

  it("sorts months ascending regardless of input order", () => {
    const bills: BillRow[] = [
      { energyCarrier: "gas", year: 2021, month: 12, consumptionKwh: 500, expenseLocal: 250 },
      { energyCarrier: "gas", year: 2021, month: 1, consumptionKwh: 1000, expenseLocal: 500 },
    ];

    const [gas] = groupBillsByCarrierYearMonth(bills);
    expect(gas?.months.map((m) => m.month)).toEqual([1, 12]);
  });
});

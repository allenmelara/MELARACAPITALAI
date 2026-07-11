import { describe, expect, it } from "vitest";
import {
  extractCompanyInputsFromFacts,
  extractFinancialStatements,
  type CompanyFacts
} from "./secEdgar";

type FactOverrides = Partial<{
  fy: number;
  fp: string;
  form: string;
  filed: string;
}>;

function fact(val: number, end: string, start?: string, overrides: FactOverrides = {}) {
  return {
    val,
    end,
    start,
    fy: 2023,
    fp: "FY",
    form: "10-K",
    filed: "2024-02-01",
    ...overrides
  };
}

const fullFacts: CompanyFacts = {
  facts: {
    "us-gaap": {
      Revenues: {
        units: {
          USD: [
            fact(1_000_000, "2023-12-31", "2023-01-01"),
            fact(900_000, "2022-12-31", "2022-01-01", { fy: 2022 }),
            // A quarterly slice under the same tag — must be excluded from
            // the annual figure and from the growth-rate comparison.
            fact(260_000, "2023-03-31", "2023-01-01", { form: "10-Q", fp: "Q1" })
          ]
        }
      },
      NetIncomeLoss: { units: { USD: [fact(120_000, "2023-12-31", "2023-01-01")] } },
      CashAndCashEquivalentsAtCarryingValue: { units: { USD: [fact(200_000, "2023-12-31")] } },
      LongTermDebtNoncurrent: { units: { USD: [fact(300_000, "2023-12-31")] } },
      LongTermDebtCurrent: { units: { USD: [fact(50_000, "2023-12-31")] } },
      CommonStockSharesOutstanding: { units: { shares: [fact(10_000_000, "2023-12-31")] } },
      InterestExpense: { units: { USD: [fact(10_000, "2023-12-31", "2023-01-01")] } },
      IncomeTaxExpenseBenefit: { units: { USD: [fact(30_000, "2023-12-31", "2023-01-01")] } },
      DepreciationDepletionAndAmortization: {
        units: { USD: [fact(40_000, "2023-12-31", "2023-01-01")] }
      },
      PaymentsToAcquirePropertyPlantAndEquipment: {
        units: { USD: [fact(50_000, "2023-12-31", "2023-01-01")] }
      },
      IncreaseDecreaseInOperatingCapital: {
        units: { USD: [fact(-15_000, "2023-12-31", "2023-01-01")] }
      }
    }
  }
};

describe("extractCompanyInputsFromFacts — full filing data", () => {
  const { inputs, sourceNotes } = extractCompanyInputsFromFacts(fullFacts);

  it("reads the most recent annual value for straightforward tags", () => {
    expect(inputs.revenue).toBe(1_000_000);
    expect(inputs.netIncome).toBe(120_000);
    expect(inputs.cash).toBe(200_000);
    expect(inputs.shares).toBe(10_000_000);
    expect(sourceNotes.revenue).toBe("filing");
    expect(sourceNotes.netIncome).toBe("filing");
  });

  it("ignores quarterly (10-Q) facts reported under the same tag", () => {
    // If the 260,000 quarterly slice leaked in as the "latest" annual fact,
    // revenue would be wrong — confirm the full-year 1,000,000 won out.
    expect(inputs.revenue).toBe(1_000_000);
  });

  it("sums current + noncurrent long-term debt", () => {
    expect(inputs.debt).toBe(350_000);
    expect(sourceNotes.debt).toBe("filing");
  });

  it("derives EBITDA by adding back interest, tax, and D&A to net income", () => {
    expect(inputs.ebitda).toBe(120_000 + 10_000 + 30_000 + 40_000);
    expect(sourceNotes.ebitda).toBe("derived");
  });

  it("derives D&A, capex, and NWC-change as a percent of revenue", () => {
    expect(inputs.depreciationPct).toBeCloseTo(40_000 / 1_000_000, 6);
    expect(inputs.capexPct).toBeCloseTo(50_000 / 1_000_000, 6);
    expect(inputs.nwcChangePct).toBeCloseTo(15_000 / 1_000_000, 6);
  });

  it("derives effective tax rate from tax expense over pretax income", () => {
    expect(inputs.taxRate).toBeCloseTo(30_000 / 150_000, 6);
  });

  it("derives growth rate from the two most recent annual revenue figures", () => {
    expect(inputs.growthRate).toBeCloseTo(1_000_000 / 900_000 - 1, 6);
    expect(sourceNotes.growthRate).toBe("derived");
  });

  it("never sets discountRate or terminalGrowthRate — those stay user assumptions", () => {
    expect(inputs.discountRate).toBeUndefined();
    expect(inputs.terminalGrowthRate).toBeUndefined();
    expect(inputs.currentPrice).toBeUndefined();
  });
});

describe("extractCompanyInputsFromFacts — company migrated off the primary revenue tag", () => {
  // Regression test: mirrors real Microsoft SEC data, where "Revenues" has
  // annual facts but the newest one is from a 2010 10-K (they migrated to
  // RevenueFromContractWithCustomerExcludingAssessedTax years later). Picking
  // "first tag with any data" would silently return the 2010 figure.
  const migratedTagFacts: CompanyFacts = {
    facts: {
      "us-gaap": {
        Revenues: { units: { USD: [fact(62_484_000_000, "2010-06-30", "2009-07-01", { fy: 2010 })] } },
        RevenueFromContractWithCustomerExcludingAssessedTax: {
          units: {
            USD: [
              fact(211_915_000_000, "2023-06-30", "2022-07-01", { fy: 2023 }),
              fact(245_122_000_000, "2024-06-30", "2023-07-01", { fy: 2024 })
            ]
          }
        },
        NetIncomeLoss: { units: { USD: [fact(88_000_000_000, "2024-06-30", "2023-07-01", { fy: 2024 })] } }
      }
    }
  };

  it("prefers the tag with the most recently reported value, not the first tag with any data", () => {
    const { inputs, sourceNotes } = extractCompanyInputsFromFacts(migratedTagFacts);
    expect(inputs.revenue).toBe(245_122_000_000);
    expect(sourceNotes.revenue).toBe("filing");
  });

  it("computes a sane growth rate off the two most recent annual figures on the winning tag", () => {
    const { inputs } = extractCompanyInputsFromFacts(migratedTagFacts);
    expect(inputs.growthRate).toBeCloseTo(245_122_000_000 / 211_915_000_000 - 1, 6);
  });
});

describe("extractCompanyInputsFromFacts — missing EBITDA components", () => {
  const sparseFacts: CompanyFacts = {
    facts: {
      "us-gaap": {
        Revenues: { units: { USD: [fact(1_000_000, "2023-12-31", "2023-01-01")] } },
        NetIncomeLoss: { units: { USD: [fact(120_000, "2023-12-31", "2023-01-01")] } }
      }
    }
  };

  it("does not fabricate EBITDA from net income alone", () => {
    const { inputs, sourceNotes } = extractCompanyInputsFromFacts(sparseFacts);
    expect(inputs.ebitda).toBeUndefined();
    expect(sourceNotes.ebitda).toBe("not_found");
  });
});

describe("extractCompanyInputsFromFacts — missing NWC tag", () => {
  const noNwcFacts: CompanyFacts = {
    facts: {
      "us-gaap": {
        Revenues: { units: { USD: [fact(1_000_000, "2023-12-31", "2023-01-01")] } },
        NetIncomeLoss: { units: { USD: [fact(120_000, "2023-12-31", "2023-01-01")] } }
      }
    }
  };

  it("leaves nwcChangePct unset rather than defaulting silently", () => {
    const { inputs, sourceNotes } = extractCompanyInputsFromFacts(noNwcFacts);
    expect(inputs.nwcChangePct).toBeUndefined();
    expect(sourceNotes.nwcChangePct).toBe("not_found");
  });
});

describe("extractCompanyInputsFromFacts — empty facts", () => {
  it("returns all not_found without throwing", () => {
    const { inputs, sourceNotes } = extractCompanyInputsFromFacts({});
    expect(inputs).toEqual({});
    expect(Object.values(sourceNotes).every((status) => status === "not_found")).toBe(true);
  });
});

describe("extractFinancialStatements", () => {
  const twoYearFacts: CompanyFacts = {
    facts: {
      "us-gaap": {
        Revenues: {
          units: {
            USD: [
              fact(1_000_000, "2023-12-31", "2023-01-01", { fy: 2023 }),
              fact(900_000, "2022-12-31", "2022-01-01", { fy: 2022 }),
              // quarterly slice must be ignored
              fact(260_000, "2023-03-31", "2023-01-01", { form: "10-Q", fp: "Q1" })
            ]
          }
        },
        CostOfRevenue: {
          units: {
            USD: [
              fact(600_000, "2023-12-31", "2023-01-01", { fy: 2023 }),
              fact(550_000, "2022-12-31", "2022-01-01", { fy: 2022 })
            ]
          }
        },
        NetIncomeLoss: {
          units: {
            USD: [
              fact(120_000, "2023-12-31", "2023-01-01", { fy: 2023 }),
              fact(100_000, "2022-12-31", "2022-01-01", { fy: 2022 })
            ]
          }
        },
        Assets: {
          units: {
            USD: [
              fact(2_000_000, "2023-12-31", undefined, { fy: 2023 }),
              fact(1_800_000, "2022-12-31", undefined, { fy: 2022 })
            ]
          }
        },
        NetCashProvidedByUsedInOperatingActivities: {
          units: { USD: [fact(180_000, "2023-12-31", "2023-01-01", { fy: 2023 })] }
        },
        PaymentsToAcquirePropertyPlantAndEquipment: {
          units: { USD: [fact(50_000, "2023-12-31", "2023-01-01", { fy: 2023 })] }
        }
      }
    }
  };

  const statements = extractFinancialStatements(twoYearFacts);

  it("builds fiscal-year columns newest-first from the net-income spine", () => {
    expect(statements.periods).toEqual(["FY2023", "FY2022"]);
    expect(statements.periodEnds).toEqual(["2023-12-31", "2022-12-31"]);
  });

  it("aligns each line item's values to the shared periods", () => {
    const revenue = statements.incomeStatement.find((r) => r.key === "revenue");
    expect(revenue?.values).toEqual([1_000_000, 900_000]);
    const assets = statements.balanceSheet.find((r) => r.key === "totalAssets");
    expect(assets?.values).toEqual([2_000_000, 1_800_000]);
  });

  it("leaves a null in periods a line item did not report, rather than dropping the column", () => {
    // Operating cash flow only exists for FY2023.
    const ocf = statements.cashFlow.find((r) => r.key === "operatingCashFlow");
    expect(ocf?.values).toEqual([180_000, null]);
  });

  it("omits line items the filer never tags", () => {
    // No R&D tag was provided.
    expect(statements.incomeStatement.find((r) => r.key === "rnd")).toBeUndefined();
  });

  it("derives free cash flow as operating cash flow minus capex per period", () => {
    const fcf = statements.cashFlow.find((r) => r.key === "freeCashFlow");
    expect(fcf?.values).toEqual([180_000 - 50_000, null]);
  });

  it("returns empty statements for empty facts without throwing", () => {
    const empty = extractFinancialStatements({});
    expect(empty.periods).toEqual([]);
    expect(empty.incomeStatement).toEqual([]);
    expect(empty.balanceSheet).toEqual([]);
    expect(empty.cashFlow).toEqual([]);
  });
});

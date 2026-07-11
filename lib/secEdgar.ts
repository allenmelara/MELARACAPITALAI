import { getCached, setCached } from "@/lib/ttlCache";
import type { CompanyInputs } from "@/lib/finance";

const TICKER_MAP_URL = "https://www.sec.gov/files/company_tickers.json";
const TICKER_MAP_TTL_MS = 24 * 60 * 60 * 1000;
const COMPANY_FACTS_TTL_MS = 10 * 60 * 1000;

function userAgent(): string {
  // SEC requires a descriptive User-Agent with contact info, or requests get
  // throttled/blocked. Set SEC_EDGAR_USER_AGENT to your app name + email.
  return process.env.SEC_EDGAR_USER_AGENT || "Melara Capital AI (contact@example.com)";
}

type TickerEntry = { cik_str: number; ticker: string; title: string };
type TickerMap = Record<string, TickerEntry>;

async function getTickerMap(): Promise<TickerMap> {
  const cached = getCached<TickerMap>("sec:ticker-map");
  if (cached) return cached;

  const response = await fetch(TICKER_MAP_URL, {
    headers: { "User-Agent": userAgent() }
  });
  if (!response.ok) {
    throw new Error(`SEC ticker map request failed: ${response.status}`);
  }
  const data = (await response.json()) as TickerMap;
  setCached("sec:ticker-map", data, TICKER_MAP_TTL_MS);
  return data;
}

export async function resolveTickerToCik(ticker: string): Promise<{ cik: string; name: string } | null> {
  const map = await getTickerMap();
  const normalized = ticker.trim().toUpperCase();
  const entry = Object.values(map).find((item) => item.ticker.toUpperCase() === normalized);
  if (!entry) return null;
  return { cik: String(entry.cik_str).padStart(10, "0"), name: entry.title };
}

type Fact = {
  val: number;
  end: string;
  start?: string;
  fy: number;
  fp: string;
  form: string;
  filed: string;
};

export type CompanyFacts = {
  facts?: {
    "us-gaap"?: Record<
      string,
      {
        units: {
          USD?: Fact[];
          shares?: Fact[];
        };
      }
    >;
  };
};

export async function getCompanyFacts(cik: string): Promise<CompanyFacts> {
  const cacheKey = `sec:facts:${cik}`;
  const cached = getCached<CompanyFacts>(cacheKey);
  if (cached) return cached;

  const response = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, {
    headers: { "User-Agent": userAgent() }
  });
  if (!response.ok) {
    throw new Error(`SEC company facts request failed: ${response.status}`);
  }
  const data = (await response.json()) as CompanyFacts;
  setCached(cacheKey, data, COMPANY_FACTS_TTL_MS);
  return data;
}

function getUnitsUSD(facts: CompanyFacts, tag: string): Fact[] {
  return facts.facts?.["us-gaap"]?.[tag]?.units?.USD ?? [];
}

function getUnitsShares(facts: CompanyFacts, tag: string): Fact[] {
  return facts.facts?.["us-gaap"]?.[tag]?.units?.shares ?? [];
}

function getUnits(facts: CompanyFacts, tag: string, unit: "USD" | "shares"): Fact[] {
  return unit === "shares" ? getUnitsShares(facts, tag) : getUnitsUSD(facts, tag);
}

// A "full fiscal year" duration fact: filed on a 10-K, with either no start
// (an instant fact, e.g. balance-sheet items) or a start/end span of roughly
// a year (not a quarterly 10-Q slice reported under the same tag).
function annualFacts(items: Fact[]): Fact[] {
  return items
    .filter((item) => {
      if (item.form !== "10-K") return false;
      if (!item.start) return true;
      const days = (new Date(item.end).getTime() - new Date(item.start).getTime()) / 86_400_000;
      return days >= 300 && days <= 380;
    })
    .sort((a, b) => b.end.localeCompare(a.end));
}

function latestAnnual(items: Fact[]): Fact | undefined {
  return annualFacts(items)[0];
}

// Picks the tag with the most recently reported annual value, not just the
// first tag in the list that has any data at all. Companies routinely
// migrate to newer XBRL tags (e.g. Revenues -> RevenueFromContractWith...
// after ASC 606 adoption) while leaving years of stale history under the
// old tag — taking "first with any data" would silently return outdated
// figures from a tag the company stopped using years ago.
function firstAvailable(
  facts: CompanyFacts,
  tags: string[]
): { fact: Fact; tag: string } | undefined {
  const candidates = tags
    .map((tag) => {
      const fact = latestAnnual(getUnitsUSD(facts, tag));
      return fact ? { fact, tag } : undefined;
    })
    .filter((candidate): candidate is { fact: Fact; tag: string } => candidate !== undefined);

  if (candidates.length === 0) return undefined;
  return candidates.sort((a, b) => b.fact.end.localeCompare(a.fact.end))[0];
}

export type SourceStatus = "filing" | "derived" | "not_found";

export function extractCompanyInputsFromFacts(facts: CompanyFacts): {
  inputs: Partial<CompanyInputs>;
  sourceNotes: Record<string, SourceStatus>;
} {
  const inputs: Partial<CompanyInputs> = {};
  const sourceNotes: Record<string, SourceStatus> = {};

  const revenue = firstAvailable(facts, [
    "Revenues",
    "RevenueFromContractWithCustomerExcludingAssessedTax"
  ]);
  const revenueVal = revenue?.fact.val;
  if (revenueVal && revenueVal > 0) {
    inputs.revenue = revenueVal;
    sourceNotes.revenue = "filing";
  } else {
    sourceNotes.revenue = "not_found";
  }

  const netIncome = firstAvailable(facts, ["NetIncomeLoss"]);
  if (netIncome) {
    inputs.netIncome = netIncome.fact.val;
    sourceNotes.netIncome = "filing";
  } else {
    sourceNotes.netIncome = "not_found";
  }

  const cash = firstAvailable(facts, ["CashAndCashEquivalentsAtCarryingValue"]);
  if (cash) {
    inputs.cash = cash.fact.val;
    sourceNotes.cash = "filing";
  } else {
    sourceNotes.cash = "not_found";
  }

  const debtNoncurrent = firstAvailable(facts, ["LongTermDebtNoncurrent"]);
  const debtCurrent = firstAvailable(facts, ["LongTermDebtCurrent"]);
  if (debtNoncurrent || debtCurrent) {
    inputs.debt = (debtNoncurrent?.fact.val ?? 0) + (debtCurrent?.fact.val ?? 0);
    sourceNotes.debt = "filing";
  } else {
    const debtCombined = firstAvailable(facts, ["LongTermDebt"]);
    if (debtCombined) {
      inputs.debt = debtCombined.fact.val;
      sourceNotes.debt = "filing";
    } else {
      sourceNotes.debt = "not_found";
    }
  }

  const sharesFact = latestAnnual(getUnitsShares(facts, "CommonStockSharesOutstanding"));
  if (sharesFact) {
    inputs.shares = sharesFact.val;
    sourceNotes.shares = "filing";
  } else {
    sourceNotes.shares = "not_found";
  }

  const interest = firstAvailable(facts, ["InterestExpense"]);
  const tax = firstAvailable(facts, ["IncomeTaxExpenseBenefit"]);
  const da = firstAvailable(facts, [
    "DepreciationDepletionAndAmortization",
    "DepreciationAmortizationAndAccretionNet"
  ]);

  if (netIncome && (interest || tax || da)) {
    inputs.ebitda =
      netIncome.fact.val + (interest?.fact.val ?? 0) + (tax?.fact.val ?? 0) + (da?.fact.val ?? 0);
    sourceNotes.ebitda = "derived";
  } else {
    sourceNotes.ebitda = "not_found";
  }

  if (da && revenueVal && revenueVal > 0) {
    inputs.depreciationPct = da.fact.val / revenueVal;
    sourceNotes.depreciationPct = "derived";
  } else {
    sourceNotes.depreciationPct = "not_found";
  }

  const capex = firstAvailable(facts, ["PaymentsToAcquirePropertyPlantAndEquipment"]);
  if (capex && revenueVal && revenueVal > 0) {
    inputs.capexPct = capex.fact.val / revenueVal;
    sourceNotes.capexPct = "derived";
  } else {
    sourceNotes.capexPct = "not_found";
  }

  const nwc = firstAvailable(facts, ["IncreaseDecreaseInOperatingCapital"]);
  if (nwc && revenueVal && revenueVal > 0) {
    inputs.nwcChangePct = Math.abs(nwc.fact.val) / revenueVal;
    sourceNotes.nwcChangePct = "derived";
  } else {
    sourceNotes.nwcChangePct = "not_found";
  }

  if (tax && netIncome) {
    const pretax = netIncome.fact.val + tax.fact.val;
    if (pretax > 0) {
      inputs.taxRate = Math.min(0.5, Math.max(0, tax.fact.val / pretax));
      sourceNotes.taxRate = "derived";
    } else {
      sourceNotes.taxRate = "not_found";
    }
  } else {
    sourceNotes.taxRate = "not_found";
  }

  if (revenue) {
    const [latest, prior] = annualFacts(getUnitsUSD(facts, revenue.tag));
    if (latest && prior && prior.val > 0) {
      inputs.growthRate = latest.val / prior.val - 1;
      sourceNotes.growthRate = "derived";
    } else {
      sourceNotes.growthRate = "not_found";
    }
  } else {
    sourceNotes.growthRate = "not_found";
  }

  return { inputs, sourceNotes };
}

// ---------------------------------------------------------------------------
// Full financial-statement extraction (Income Statement / Balance Sheet /
// Cash Flow), built from the SAME companyfacts payload used above — no extra
// network calls. Values are aligned to a shared set of fiscal-year ends so the
// three statements line up column-for-column in the UI.
// ---------------------------------------------------------------------------

export type StatementRow = {
  key: string;
  label: string;
  // One value per period in `periods` order (newest first); null where the
  // filer did not tag that line item for that year.
  values: (number | null)[];
  emphasis?: boolean; // subtotal / headline lines rendered with weight
};

export type FinancialStatements = {
  periods: string[]; // e.g. ["FY2024", "FY2023", ...] newest first
  periodEnds: string[]; // ISO end dates aligned to `periods`
  incomeStatement: StatementRow[];
  balanceSheet: StatementRow[];
  cashFlow: StatementRow[];
};

type LineSpec = {
  key: string;
  label: string;
  tags: string[];
  unit?: "USD" | "shares";
  emphasis?: boolean;
};

const INCOME_STATEMENT_LINES: LineSpec[] = [
  { key: "revenue", label: "Revenue", tags: ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax"], emphasis: true },
  { key: "costOfRevenue", label: "Cost of revenue", tags: ["CostOfRevenue", "CostOfGoodsAndServicesSold"] },
  { key: "grossProfit", label: "Gross profit", tags: ["GrossProfit"], emphasis: true },
  { key: "rnd", label: "Research & development", tags: ["ResearchAndDevelopmentExpense"] },
  { key: "sga", label: "Selling, general & admin", tags: ["SellingGeneralAndAdministrativeExpense", "GeneralAndAdministrativeExpense"] },
  { key: "operatingIncome", label: "Operating income", tags: ["OperatingIncomeLoss"], emphasis: true },
  { key: "interestExpense", label: "Interest expense", tags: ["InterestExpense", "InterestExpenseNonoperating"] },
  {
    key: "pretaxIncome",
    label: "Pretax income",
    tags: [
      "IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest",
      "IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments"
    ]
  },
  { key: "incomeTax", label: "Income tax", tags: ["IncomeTaxExpenseBenefit"] },
  { key: "netIncome", label: "Net income", tags: ["NetIncomeLoss"], emphasis: true },
  { key: "dilutedShares", label: "Diluted shares", tags: ["WeightedAverageNumberOfDilutedSharesOutstanding"], unit: "shares" }
];

const BALANCE_SHEET_LINES: LineSpec[] = [
  { key: "cash", label: "Cash & equivalents", tags: ["CashAndCashEquivalentsAtCarryingValue"] },
  { key: "shortTermInvestments", label: "Short-term investments", tags: ["ShortTermInvestments", "MarketableSecuritiesCurrent"] },
  { key: "currentAssets", label: "Total current assets", tags: ["AssetsCurrent"], emphasis: true },
  { key: "totalAssets", label: "Total assets", tags: ["Assets"], emphasis: true },
  { key: "currentLiabilities", label: "Total current liabilities", tags: ["LiabilitiesCurrent"], emphasis: true },
  { key: "longTermDebt", label: "Long-term debt", tags: ["LongTermDebtNoncurrent", "LongTermDebt"] },
  { key: "totalLiabilities", label: "Total liabilities", tags: ["Liabilities"], emphasis: true },
  {
    key: "equity",
    label: "Total equity",
    tags: ["StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"],
    emphasis: true
  }
];

const CASH_FLOW_LINES: LineSpec[] = [
  { key: "operatingCashFlow", label: "Operating cash flow", tags: ["NetCashProvidedByUsedInOperatingActivities", "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations"], emphasis: true },
  { key: "depreciationAmortization", label: "Depreciation & amortization", tags: ["DepreciationDepletionAndAmortization", "DepreciationAmortizationAndAccretionNet"] },
  { key: "capex", label: "Capital expenditures", tags: ["PaymentsToAcquirePropertyPlantAndEquipment"] },
  { key: "investingCashFlow", label: "Investing cash flow", tags: ["NetCashProvidedByUsedInInvestingActivities", "NetCashProvidedByUsedInInvestingActivitiesContinuingOperations"] },
  { key: "financingCashFlow", label: "Financing cash flow", tags: ["NetCashProvidedByUsedInFinancingActivities", "NetCashProvidedByUsedInFinancingActivitiesContinuingOperations"] }
];

// The value of a line item at a specific fiscal-year end, trying each candidate
// tag in order (handles companies that migrated between XBRL tags over time).
function valueAtEnd(facts: CompanyFacts, spec: LineSpec, end: string): number | null {
  for (const tag of spec.tags) {
    const hit = annualFacts(getUnits(facts, tag, spec.unit ?? "USD")).find((f) => f.end === end);
    if (hit) return hit.val;
  }
  return null;
}

function buildRows(facts: CompanyFacts, specs: LineSpec[], periodEnds: string[]): StatementRow[] {
  return specs
    .map((spec) => ({
      key: spec.key,
      label: spec.label,
      emphasis: spec.emphasis,
      values: periodEnds.map((end) => valueAtEnd(facts, spec, end))
    }))
    // Drop line items the filer never tags in any shown period.
    .filter((row) => row.values.some((v) => v !== null));
}

export function extractFinancialStatements(facts: CompanyFacts, years = 4): FinancialStatements {
  // Use net income (near-universally reported on a 10-K) as the spine that
  // defines which fiscal years — and which period-end dates — the columns show.
  const spine = annualFacts(getUnitsUSD(facts, "NetIncomeLoss")).filter((f) => f.start);
  const seen = new Set<string>();
  const columns: { end: string; fy: number }[] = [];
  for (const fact of spine) {
    if (seen.has(fact.end)) continue;
    seen.add(fact.end);
    columns.push({ end: fact.end, fy: fact.fy });
    if (columns.length >= years) break;
  }

  const periodEnds = columns.map((c) => c.end);
  const periods = columns.map((c) => (c.fy ? `FY${c.fy}` : c.end.slice(0, 4)));

  const incomeStatement = buildRows(facts, INCOME_STATEMENT_LINES, periodEnds);
  const balanceSheet = buildRows(facts, BALANCE_SHEET_LINES, periodEnds);
  const cashFlow = buildRows(facts, CASH_FLOW_LINES, periodEnds);

  // Derived: free cash flow = operating cash flow − capex, per period.
  const ocf = cashFlow.find((r) => r.key === "operatingCashFlow");
  const capex = cashFlow.find((r) => r.key === "capex");
  if (ocf && capex) {
    cashFlow.push({
      key: "freeCashFlow",
      label: "Free cash flow",
      emphasis: true,
      values: periodEnds.map((_, i) => {
        const o = ocf.values[i];
        const c = capex.values[i];
        return o !== null && c !== null ? o - c : null;
      })
    });
  }

  return { periods, periodEnds, incomeStatement, balanceSheet, cashFlow };
}

// ---------------------------------------------------------------------------
// Recent filings (dates + links) from the SEC submissions API. This is the
// authoritative source for filing dates, kept separate from companyfacts.
// ---------------------------------------------------------------------------

export type Filing = {
  form: string;
  filingDate: string;
  reportDate: string;
  accessionNumber: string;
  primaryDocument: string;
  url: string;
};

type SubmissionsResponse = {
  filings?: {
    recent?: {
      accessionNumber?: string[];
      filingDate?: string[];
      reportDate?: string[];
      form?: string[];
      primaryDocument?: string[];
    };
  };
};

const FILING_FORMS = new Set(["10-K", "10-Q", "8-K", "20-F", "40-F"]);

export async function getRecentFilings(cik: string, limit = 8): Promise<Filing[]> {
  const cacheKey = `sec:filings:${cik}`;
  const cached = getCached<Filing[]>(cacheKey);
  if (cached) return cached;

  const response = await fetch(`https://data.sec.gov/submissions/CIK${cik}.json`, {
    headers: { "User-Agent": userAgent() }
  });
  if (!response.ok) {
    throw new Error(`SEC submissions request failed: ${response.status}`);
  }
  const data = (await response.json()) as SubmissionsResponse;
  const recent = data.filings?.recent;
  if (!recent?.accessionNumber) return [];

  const cikInt = String(Number(cik)); // submissions URLs use the CIK without leading zeros
  const filings: Filing[] = [];
  for (let i = 0; i < recent.accessionNumber.length && filings.length < limit; i++) {
    const form = recent.form?.[i] ?? "";
    if (!FILING_FORMS.has(form)) continue;
    const accession = recent.accessionNumber[i];
    const accessionNoDashes = accession.replace(/-/g, "");
    const primaryDocument = recent.primaryDocument?.[i] ?? "";
    filings.push({
      form,
      filingDate: recent.filingDate?.[i] ?? "",
      reportDate: recent.reportDate?.[i] ?? "",
      accessionNumber: accession,
      primaryDocument,
      url: `https://www.sec.gov/Archives/edgar/data/${cikInt}/${accessionNoDashes}/${primaryDocument}`
    });
  }

  setCached(cacheKey, filings, COMPANY_FACTS_TTL_MS);
  return filings;
}

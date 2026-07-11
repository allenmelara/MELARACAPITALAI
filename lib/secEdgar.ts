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

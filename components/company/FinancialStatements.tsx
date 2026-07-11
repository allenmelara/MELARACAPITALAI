"use client";

import { ChevronDown, FileText, ExternalLink } from "lucide-react";
import type { FinancialStatements as Statements, StatementRow, Filing } from "@/lib/secEdgar";

const compactMoney = new Intl.NumberFormat("en-US", {
  notation: "compact",
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 1
});
const compactNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1
});

function formatValue(value: number | null, isShares: boolean) {
  if (value === null || !Number.isFinite(value)) return "—";
  return isShares ? compactNumber.format(value) : compactMoney.format(value);
}

function StatementTable({
  title,
  periods,
  rows,
  defaultOpen = false
}: {
  title: string;
  periods: string[];
  rows: StatementRow[];
  defaultOpen?: boolean;
}) {
  if (rows.length === 0) return null;
  return (
    <details className="statement" open={defaultOpen}>
      <summary className="statement-summary">
        <ChevronDown size={16} className="statement-chevron" />
        <span>{title}</span>
        <span className="statement-count">{rows.length} lines</span>
      </summary>
      <div className="statement-scroll">
        <table className="statement-table">
          <thead>
            <tr>
              <th className="statement-label-col">Line item</th>
              {periods.map((p) => (
                <th key={p}>{p}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isShares = row.key === "dilutedShares";
              return (
                <tr key={row.key} className={row.emphasis ? "statement-emphasis" : ""}>
                  <td className="statement-label-col">{row.label}</td>
                  {row.values.map((v, i) => (
                    <td key={i} className={v !== null && v < 0 ? "statement-neg" : ""}>
                      {formatValue(v, isShares)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export default function FinancialStatements({
  statements,
  filings
}: {
  statements: Statements;
  filings: Filing[];
}) {
  const hasStatements =
    statements.incomeStatement.length > 0 ||
    statements.balanceSheet.length > 0 ||
    statements.cashFlow.length > 0;

  return (
    <div className="statements">
      {hasStatements ? (
        <>
          <StatementTable
            title="Income statement"
            periods={statements.periods}
            rows={statements.incomeStatement}
            defaultOpen
          />
          <StatementTable
            title="Balance sheet"
            periods={statements.periods}
            rows={statements.balanceSheet}
          />
          <StatementTable
            title="Cash flow statement"
            periods={statements.periods}
            rows={statements.cashFlow}
          />
        </>
      ) : (
        <p className="disclaimer">
          This filer&apos;s XBRL data didn&apos;t expose standard statement line items — the key
          figures above were still pulled where available.
        </p>
      )}

      {filings.length > 0 && (
        <details className="statement" open={false}>
          <summary className="statement-summary">
            <ChevronDown size={16} className="statement-chevron" />
            <span>Recent SEC filings</span>
            <span className="statement-count">{filings.length}</span>
          </summary>
          <ul className="filings-list">
            {filings.map((f) => (
              <li key={f.accessionNumber} className="filing-row">
                <FileText size={15} className="filing-icon" />
                <span className="filing-form">{f.form}</span>
                <span className="filing-date">Filed {f.filingDate}</span>
                {f.reportDate && <span className="filing-period">Period {f.reportDate}</span>}
                {f.url && f.primaryDocument && (
                  <a
                    className="filing-link"
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View <ExternalLink size={13} />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

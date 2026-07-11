# Melara Capital AI

A working Next.js MVP for an AI-powered finance application.

## Included

- Company valuation calculator
- Simplified five-year DCF
- EV/EBITDA and margin calculations
- Claude-generated investment research reports
- TXT/CSV/pasted-document analysis
- Supabase schema for storing user reports
- Environment placeholders for Stripe subscriptions

## Important limitation

This is an MVP, not a production financial terminal. The sample DCF uses net
income as a rough cash-flow proxy. Replace it with a full unlevered free cash
flow model before selling the valuation feature.

## Run locally

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env.local`.
3. Add your Anthropic API key.
4. Run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Use Claude Code to continue building it

Open this folder in your terminal and run Claude Code. A useful first prompt:

```text
Review this Next.js finance MVP. Keep the current design, then add:
1. Supabase email authentication using @supabase/ssr.
2. A protected dashboard.
3. Saving and loading reports from the reports table.
4. A real estate analyzer for NOI, cap rate, DSCR, cash-on-cash return, and IRR.
5. Input validation, rate limiting, and unit tests.
Do not expose secret keys to the browser. Make changes incrementally and run
the TypeScript build after every major change.
```

## Production checklist

- Add authentication before allowing paid usage.
- Add database persistence and Row Level Security.
- Add server-side rate limiting.
- Add file-size and MIME-type validation.
- Add PDF and spreadsheet parsing in a sandboxed worker.
- Do not send confidential company files to an AI provider without permission.
- Add Stripe Checkout and webhook-based subscription enforcement.
- Add logging without storing sensitive financial content.
- Obtain legal review for marketing, disclaimers, privacy, and advisory rules.
- Add deterministic calculation tests.
- Replace the simplified DCF with a proper three-statement or FCF model.

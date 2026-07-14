import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createNotification, type NotificationType } from "@/lib/notifications";
import { DEFAULT_PREFERENCES } from "@/lib/notificationPreferences";
import { calculateSavingsStreak, calculateInvestmentConsistencyStreak, type Streak } from "@/lib/streaks";
import { detectSpendingAnomalies, type BudgetCategoryEntry } from "@/lib/budgetCalc";
import { withNextDueDate, type Bill } from "@/lib/bills";
import { getQuoteChange } from "@/lib/finnhub";
import { sendNotificationEmail } from "@/lib/email";
import { money } from "@/lib/finance";
import { logError, logWarn } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

type ServiceClient = ReturnType<typeof createServiceClient>;

type Prefs = {
  dailyCheckin: boolean;
  weeklyRecap: boolean;
  monthlyReport: boolean;
  goalMilestone: boolean;
  streakMilestone: boolean;
  scoreChange: boolean;
  budgetChallenge: boolean;
  priceAlerts: boolean;
  billReminders: boolean;
  emailEnabled: boolean;
  inAppEnabled: boolean;
};

const BILL_DUE_WITHIN_DAYS = 3;

type ScoreRow = { snapshot_date: string; overall_score: number | null };
type NetWorthRow = { snapshot_date: string; net_worth: number };

// Mirrors components/dashboard/CelebrationBanner.tsx's client-side
// thresholds exactly, so the same event that would show as an in-app
// celebration also produces a persisted, emailable notification.
const SCORE_RISE_THRESHOLD = 5;
const STREAK_MILESTONES = [3, 6, 12];

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

// Vercel Cron hits this once a day (see vercel.json). It also carries the
// weekly (Mondays) and monthly (1st) logic internally rather than needing
// separate cron entries.
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createServiceClient();
  const today = new Date();
  const isMonday = today.getUTCDay() === 1;
  const isFirstOfMonth = today.getUTCDate() === 1;

  let processed = 0;
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      logError("cron.daily.listUsers", error);
      break;
    }
    if (data.users.length === 0) break;

    for (const authUser of data.users) {
      try {
        await processUser(supabase, authUser.id, authUser.email ?? null, isMonday, isFirstOfMonth);
        processed++;
      } catch (err) {
        logWarn("cron.daily.user", err);
      }
    }

    if (data.users.length < perPage) break;
    page++;
  }

  return NextResponse.json({ ok: true, processed });
}

async function getPrefs(supabase: ServiceClient, userId: string): Promise<Prefs> {
  const { data } = await supabase
    .from("notification_preferences")
    .select(
      "daily_checkin, weekly_recap, monthly_report, goal_milestone, streak_milestone, score_change, budget_challenge, price_alerts, bill_reminders, email_enabled, in_app_enabled"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) {
    return {
      dailyCheckin: DEFAULT_PREFERENCES.dailyCheckin,
      weeklyRecap: DEFAULT_PREFERENCES.weeklyRecap,
      monthlyReport: DEFAULT_PREFERENCES.monthlyReport,
      goalMilestone: DEFAULT_PREFERENCES.goalMilestone,
      streakMilestone: DEFAULT_PREFERENCES.streakMilestone,
      scoreChange: DEFAULT_PREFERENCES.scoreChange,
      budgetChallenge: DEFAULT_PREFERENCES.budgetChallenge,
      priceAlerts: DEFAULT_PREFERENCES.priceAlerts,
      billReminders: DEFAULT_PREFERENCES.billReminders,
      emailEnabled: DEFAULT_PREFERENCES.emailEnabled,
      inAppEnabled: DEFAULT_PREFERENCES.inAppEnabled
    };
  }

  const row = data as {
    daily_checkin: boolean;
    weekly_recap: boolean;
    monthly_report: boolean;
    goal_milestone: boolean;
    streak_milestone: boolean;
    score_change: boolean;
    budget_challenge: boolean;
    price_alerts: boolean;
    bill_reminders: boolean;
    email_enabled: boolean;
    in_app_enabled: boolean;
  };
  return {
    dailyCheckin: row.daily_checkin,
    weeklyRecap: row.weekly_recap,
    monthlyReport: row.monthly_report,
    goalMilestone: row.goal_milestone,
    streakMilestone: row.streak_milestone,
    scoreChange: row.score_change,
    budgetChallenge: row.budget_challenge,
    priceAlerts: row.price_alerts,
    billReminders: row.bill_reminders,
    emailEnabled: row.email_enabled,
    inAppEnabled: row.in_app_enabled
  };
}

async function processUser(
  supabase: ServiceClient,
  userId: string,
  email: string | null,
  isMonday: boolean,
  isFirstOfMonth: boolean
) {
  const prefs = await getPrefs(supabase, userId);
  if (!prefs.inAppEnabled && !prefs.emailEnabled) return;

  const wantsWeekly = isMonday && prefs.weeklyRecap;
  const wantsMonthly = isFirstOfMonth && prefs.monthlyReport;

  // Score/net-worth based notifications (daily check-in, weekly recap,
  // monthly report, score change) all read the same two snapshot tables —
  // already-computed from the user's last dashboard visit rather than
  // recomputed here, since recomputing would mean an unbounded Finnhub call
  // per user in a single batch invocation, and this route has no per-user
  // session to call the cookie-scoped lib functions with anyway.
  if (prefs.dailyCheckin || wantsWeekly || wantsMonthly || prefs.scoreChange) {
    const [{ data: scoreRows }, { data: netWorthRows }] = await Promise.all([
      supabase
        .from("health_score_snapshots")
        .select("snapshot_date, overall_score")
        .eq("user_id", userId)
        .order("snapshot_date", { ascending: false })
        .limit(35),
      supabase
        .from("net_worth_snapshots")
        .select("snapshot_date, net_worth")
        .eq("user_id", userId)
        .order("snapshot_date", { ascending: false })
        .limit(35)
    ]);

    const scores = (scoreRows ?? []) as ScoreRow[];
    const netWorths = (netWorthRows ?? []) as NetWorthRow[];

    if (scores.length > 0 || netWorths.length > 0) {
      const todayStr = new Date().toISOString().slice(0, 10);

      if (prefs.dailyCheckin) {
        await deliver(
          supabase,
          userId,
          email,
          "daily_checkin",
          "Your daily check-in",
          buildSummary(scores[0], netWorths[0], todayStr),
          prefs
        );
      }
      if (wantsWeekly) {
        const body = buildRecap(scores, netWorths, 7, "week", todayStr);
        if (body) await deliver(supabase, userId, email, "weekly_recap", "Your weekly recap", body, prefs);
      }
      if (wantsMonthly) {
        const body = buildRecap(scores, netWorths, 30, "month", todayStr);
        if (body) await deliver(supabase, userId, email, "monthly_report", "Your monthly progress report", body, prefs);
      }
      if (prefs.scoreChange) {
        await checkScoreChange(supabase, userId, email, scores, prefs);
      }
    }
  }

  if (prefs.goalMilestone) {
    await checkGoalMilestones(supabase, userId, email, prefs);
  }
  if (prefs.streakMilestone) {
    await checkStreakMilestones(supabase, userId, email, prefs);
  }
  if (prefs.budgetChallenge) {
    await checkBudgetChallenges(supabase, userId, email, prefs);
  }
  if (prefs.billReminders) {
    await checkBillsDue(supabase, userId, email, prefs);
  }
  if (prefs.priceAlerts) {
    await checkPriceAlerts(supabase, userId, email, prefs);
  }
}

// scores is already ordered most-recent-first (see the query above), so the
// last two *non-null* entries in that order are exactly "the two most
// recent scores" CelebrationBanner compares client-side — no reversal needed.
async function checkScoreChange(
  supabase: ServiceClient,
  userId: string,
  email: string | null,
  scores: ScoreRow[],
  prefs: Prefs
) {
  const nonNull = scores.filter((s) => s.overall_score !== null);
  if (nonNull.length < 2) return;
  const latest = nonNull[0];
  const prior = nonNull[1];
  const rise = (latest.overall_score as number) - (prior.overall_score as number);
  if (rise < SCORE_RISE_THRESHOLD) return;

  await deliver(
    supabase,
    userId,
    email,
    "score_change",
    "Your Financial Health Score went up",
    `Your Financial Health Score rose ${rise} points to ${latest.overall_score}.`,
    prefs,
    `score_change:${latest.snapshot_date}`
  );
}

async function checkGoalMilestones(supabase: ServiceClient, userId: string, email: string | null, prefs: Prefs) {
  const { data } = await supabase
    .from("financial_goals")
    .select("id, name, current_amount, target_amount")
    .eq("user_id", userId);
  const goals = (data ?? []) as Array<{ id: string; name: string; current_amount: number; target_amount: number }>;

  for (const goal of goals) {
    if (!(goal.target_amount > 0) || goal.current_amount < goal.target_amount) continue;
    await deliver(
      supabase,
      userId,
      email,
      "goal_milestone",
      "You've reached a goal",
      `You've reached your "${goal.name}" goal.`,
      prefs,
      `goal_milestone:${goal.id}`
    );
  }
}

async function checkStreakMilestones(supabase: ServiceClient, userId: string, email: string | null, prefs: Prefs) {
  // Mirrors lib/monthlyBudget.ts's getBudgetHistory: order descending +
  // limit to get the most recent N months, then reverse to ascending —
  // the shape calculateSavingsStreak/calculateInvestmentConsistencyStreak
  // expect (they walk forward for the longest run, backward from the end
  // for the current one).
  const { data } = await supabase
    .from("monthly_budgets")
    .select("income, categories")
    .eq("user_id", userId)
    .order("month", { ascending: false })
    .limit(12);
  const history = ((data ?? []) as Array<{ income: number; categories: BudgetCategoryEntry[] }>).slice().reverse();
  if (history.length === 0) return;

  await checkStreakType(supabase, userId, email, prefs, "savings", calculateSavingsStreak(history));
  await checkStreakType(supabase, userId, email, prefs, "investing", calculateInvestmentConsistencyStreak(history));
}

async function checkStreakType(
  supabase: ServiceClient,
  userId: string,
  email: string | null,
  prefs: Prefs,
  kind: "savings" | "investing",
  streak: Streak
) {
  if (!STREAK_MILESTONES.includes(streak.currentMonths)) return;
  const label = kind === "savings" ? "income above spending" : "money logged toward savings/investments";
  await deliver(
    supabase,
    userId,
    email,
    "streak_milestone",
    "Streak milestone reached",
    `${streak.currentMonths} months in a row with ${label}.`,
    prefs,
    `streak_milestone:${kind}:${streak.currentMonths}`
  );
}

async function checkBudgetChallenges(supabase: ServiceClient, userId: string, email: string | null, prefs: Prefs) {
  // Mirrors getBudgetHistory's shape (descending + limit, then reversed to
  // ascending) so detectSpendingAnomalies — which always evaluates the last
  // (most recent) entry against the trailing average of the rest — sees the
  // same ordering it does when called from the dashboard/health-score code.
  const { data } = await supabase
    .from("monthly_budgets")
    .select("month, categories")
    .eq("user_id", userId)
    .order("month", { ascending: false })
    .limit(12);
  const rows = ((data ?? []) as Array<{ month: string; categories: BudgetCategoryEntry[] }>).slice().reverse();
  if (rows.length < 2) return;

  const anomalies = detectSpendingAnomalies(rows.map((r) => ({ categories: r.categories })));
  if (anomalies.length === 0) return;

  const currentMonth = rows[rows.length - 1].month;
  for (const anomaly of anomalies) {
    const direction = anomaly.percentChange > 0 ? "up" : "down";
    const pct = Math.round(Math.abs(anomaly.percentChange) * 100);
    await deliver(
      supabase,
      userId,
      email,
      "budget_challenge",
      "Unusual spending detected",
      `Your "${anomaly.category}" spending is ${pct}% ${direction} from your recent average (${money(anomaly.currentAmount)} vs. ~${money(anomaly.averageAmount)}).`,
      prefs,
      `budget_challenge:${currentMonth}:${anomaly.category}`
    );
  }
}

async function checkBillsDue(supabase: ServiceClient, userId: string, email: string | null, prefs: Prefs) {
  const { data } = await supabase
    .from("bills")
    .select("id, name, amount, due_day, category, autopay, created_at")
    .eq("user_id", userId);
  const bills: Bill[] = ((data ?? []) as Array<{
    id: string;
    name: string;
    amount: number;
    due_day: number;
    category: string | null;
    autopay: boolean;
    created_at: string;
  }>).map((b) => ({
    id: b.id,
    name: b.name,
    amount: b.amount,
    dueDay: b.due_day,
    category: b.category,
    autopay: b.autopay,
    createdAt: b.created_at
  }));
  if (bills.length === 0) return;

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const cutoff = new Date(today);
  cutoff.setUTCDate(cutoff.getUTCDate() + BILL_DUE_WITHIN_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const upcoming = withNextDueDate(bills, today).filter((b) => b.nextDueDate >= todayStr && b.nextDueDate <= cutoffStr);
  for (const bill of upcoming) {
    await deliver(
      supabase,
      userId,
      email,
      "bill_due",
      "Upcoming bill",
      `"${bill.name}" (${money(bill.amount)}) is due ${formatDate(bill.nextDueDate)}.`,
      prefs,
      `bill_due:${bill.id}:${bill.nextDueDate}`
    );
  }
}

// Given MAX_WATCHLIST_ITEMS=30/user and getQuoteChange's shared 200ms-gap
// rate-limited queue (lib/finnhub.ts), this is the one check in the cron
// whose cost scales with total tracked symbols across all users rather
// than per-user work — acceptable at this app's current scale, same
// "loop everyone in one invocation" tradeoff already made for the rest of
// this route.
async function checkPriceAlerts(supabase: ServiceClient, userId: string, email: string | null, prefs: Prefs) {
  const { data } = await supabase.from("watchlist_items").select("id, symbol, alert_threshold_pct").eq("user_id", userId);
  const items = (data ?? []) as Array<{ id: string; symbol: string; alert_threshold_pct: number }>;
  if (items.length === 0) return;

  const todayStr = new Date().toISOString().slice(0, 10);
  for (const item of items) {
    let quote;
    try {
      quote = await getQuoteChange(item.symbol);
    } catch (err) {
      logWarn(`cron.daily.priceAlert.${item.symbol}`, err);
      continue;
    }
    if (!quote || Math.abs(quote.changePercent) < item.alert_threshold_pct) continue;

    const direction = quote.changePercent >= 0 ? "up" : "down";
    await deliver(
      supabase,
      userId,
      email,
      "price_alert",
      `${item.symbol} moved ${direction}`,
      `${item.symbol} is ${direction} ${Math.abs(quote.changePercent).toFixed(1)}% today, now ${money(quote.price)}.`,
      prefs,
      `price_alert:${item.symbol}:${todayStr}`
    );
  }
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

// The cron has no way to recompute a fresh score/net worth for an arbitrary
// user (getHealthScoreForUser's whole dependency chain needs a per-user
// cookie session this route doesn't have — see Part C's plan notes), so
// instead of silently presenting a possibly-weeks-old number as current,
// prefix the message with the actual snapshot date whenever it isn't today.
function withStalenessPrefix(summary: string, referenceDate: string | undefined, todayStr: string): string {
  if (!referenceDate || referenceDate === todayStr) return summary;
  return `As of your last visit on ${formatDate(referenceDate)}: ${summary} Open the app to refresh it.`;
}

function buildSummary(latestScore: ScoreRow | undefined, latestNetWorth: NetWorthRow | undefined, todayStr: string): string {
  const parts: string[] = [];
  if (latestScore?.overall_score !== null && latestScore?.overall_score !== undefined) {
    parts.push(`Your Financial Health Score is ${latestScore.overall_score}/100.`);
  }
  if (latestNetWorth) {
    parts.push(`Net worth: ${money(latestNetWorth.net_worth)}.`);
  }
  if (parts.length === 0) {
    return "Log this month's budget to start tracking your financial health.";
  }
  const referenceDate = latestScore?.snapshot_date ?? latestNetWorth?.snapshot_date;
  return withStalenessPrefix(parts.join(" "), referenceDate, todayStr);
}

function buildRecap(
  scores: ScoreRow[],
  netWorths: NetWorthRow[],
  lookbackDays: number,
  label: string,
  todayStr: string
): string | null {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - lookbackDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const parts: string[] = [];

  const latestScore = scores[0];
  const priorScore = scores.find((r) => r.snapshot_date <= cutoffStr);
  if (latestScore?.overall_score !== null && latestScore?.overall_score !== undefined) {
    if (priorScore?.overall_score !== null && priorScore?.overall_score !== undefined) {
      const delta = latestScore.overall_score - priorScore.overall_score;
      parts.push(
        delta === 0
          ? `Your Financial Health Score is ${latestScore.overall_score}/100, unchanged this ${label}.`
          : `Your Financial Health Score is ${latestScore.overall_score}/100, ${delta > 0 ? "up" : "down"} ${Math.abs(delta)} points this ${label}.`
      );
    } else {
      parts.push(`Your Financial Health Score is ${latestScore.overall_score}/100.`);
    }
  }

  const latestNetWorth = netWorths[0];
  const priorNetWorth = netWorths.find((r) => r.snapshot_date <= cutoffStr);
  if (latestNetWorth) {
    if (priorNetWorth) {
      const delta = latestNetWorth.net_worth - priorNetWorth.net_worth;
      parts.push(
        `Net worth ${delta >= 0 ? "grew" : "declined"} ${money(Math.abs(delta))} this ${label}, now ${money(latestNetWorth.net_worth)}.`
      );
    } else {
      parts.push(`Net worth: ${money(latestNetWorth.net_worth)}.`);
    }
  }

  if (parts.length === 0) return null;
  const referenceDate = latestScore?.snapshot_date ?? latestNetWorth?.snapshot_date;
  return withStalenessPrefix(parts.join(" "), referenceDate, todayStr);
}

async function deliver(
  supabase: ServiceClient,
  userId: string,
  email: string | null,
  type: NotificationType,
  title: string,
  body: string,
  prefs: Prefs,
  dedupeKey?: string
) {
  // For deduped (one-time) events, only a genuinely new insert should ever
  // email — a milestone that's still true on a later cron run must not
  // re-notify just because deliver() is called again for it. Dedup state
  // only exists as a row in `notifications`, so if in-app is disabled (no
  // row is ever created) a deduped event's email can re-fire on each
  // qualifying run — a narrow, known limitation of the current schema that
  // only affects the in-app-off/email-on combination, not worth a separate
  // dedup ledger table for in this phase.
  let isNew = true;
  if (prefs.inAppEnabled) {
    isNew = await createNotification(userId, { type, title, body, dedupeKey });
  }
  if (prefs.emailEnabled && email && isNew) {
    try {
      await sendNotificationEmail(email, { title, body });
    } catch (err) {
      logWarn(`cron.daily.email.${type}`, err);
    }
  }
}

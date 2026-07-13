import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createNotification, type NotificationType } from "@/lib/notifications";
import { DEFAULT_PREFERENCES } from "@/lib/notificationPreferences";
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
  emailEnabled: boolean;
  inAppEnabled: boolean;
};

type ScoreRow = { snapshot_date: string; overall_score: number | null };
type NetWorthRow = { snapshot_date: string; net_worth: number };

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
    .select("daily_checkin, weekly_recap, monthly_report, email_enabled, in_app_enabled")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) {
    return {
      dailyCheckin: DEFAULT_PREFERENCES.dailyCheckin,
      weeklyRecap: DEFAULT_PREFERENCES.weeklyRecap,
      monthlyReport: DEFAULT_PREFERENCES.monthlyReport,
      emailEnabled: DEFAULT_PREFERENCES.emailEnabled,
      inAppEnabled: DEFAULT_PREFERENCES.inAppEnabled
    };
  }

  const row = data as {
    daily_checkin: boolean;
    weekly_recap: boolean;
    monthly_report: boolean;
    email_enabled: boolean;
    in_app_enabled: boolean;
  };
  return {
    dailyCheckin: row.daily_checkin,
    weeklyRecap: row.weekly_recap,
    monthlyReport: row.monthly_report,
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
  const wantsWeekly = isMonday && prefs.weeklyRecap;
  const wantsMonthly = isFirstOfMonth && prefs.monthlyReport;
  if (!prefs.dailyCheckin && !wantsWeekly && !wantsMonthly) return;
  if (!prefs.inAppEnabled && !prefs.emailEnabled) return;

  // Read already-computed snapshots (from the user's last dashboard visit)
  // rather than recomputing the score/net worth here — recomputing would
  // mean an unbounded Finnhub call per user in a single batch invocation,
  // and this route has no per-user session to call the cookie-scoped lib
  // functions with anyway.
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
  if (scores.length === 0 && netWorths.length === 0) {
    // Never visited the dashboard yet — nothing computed to report.
    return;
  }

  if (prefs.dailyCheckin) {
    await deliver(supabase, userId, email, "daily_checkin", "Your daily check-in", buildSummary(scores[0], netWorths[0]), prefs);
  }
  if (wantsWeekly) {
    const body = buildRecap(scores, netWorths, 7, "week");
    if (body) await deliver(supabase, userId, email, "weekly_recap", "Your weekly recap", body, prefs);
  }
  if (wantsMonthly) {
    const body = buildRecap(scores, netWorths, 30, "month");
    if (body) await deliver(supabase, userId, email, "monthly_report", "Your monthly progress report", body, prefs);
  }
}

function buildSummary(latestScore: ScoreRow | undefined, latestNetWorth: NetWorthRow | undefined): string {
  const parts: string[] = [];
  if (latestScore?.overall_score !== null && latestScore?.overall_score !== undefined) {
    parts.push(`Your Financial Health Score is ${latestScore.overall_score}/100.`);
  }
  if (latestNetWorth) {
    parts.push(`Net worth: ${money(latestNetWorth.net_worth)}.`);
  }
  if (parts.length === 0) {
    parts.push("Log this month's budget to start tracking your financial health.");
  }
  return parts.join(" ");
}

function buildRecap(scores: ScoreRow[], netWorths: NetWorthRow[], lookbackDays: number, label: string): string | null {
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

  return parts.length > 0 ? parts.join(" ") : null;
}

async function deliver(
  supabase: ServiceClient,
  userId: string,
  email: string | null,
  type: NotificationType,
  title: string,
  body: string,
  prefs: Prefs
) {
  if (prefs.inAppEnabled) {
    await createNotification(userId, { type, title, body });
  }
  if (prefs.emailEnabled && email) {
    try {
      await sendNotificationEmail(email, { title, body });
    } catch (err) {
      logWarn(`cron.daily.email.${type}`, err);
    }
  }
}

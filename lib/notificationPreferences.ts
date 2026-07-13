import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type NotificationPreferences = {
  dailyCheckin: boolean;
  weeklyRecap: boolean;
  monthlyReport: boolean;
  goalMilestone: boolean;
  streakMilestone: boolean;
  scoreChange: boolean;
  budgetChallenge: boolean;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  updatedAt: string;
};

// Every column defaults to true at the database level, but the row itself is
// only created the first time a user visits Settings (no auto-insert trigger
// like public.profiles has) — DEFAULT_PREFERENCES mirrors those column
// defaults so "no row yet" and "row with everything true" behave identically
// everywhere that reads preferences (including the cron job in Part G).
export const DEFAULT_PREFERENCES: Omit<NotificationPreferences, "updatedAt"> = {
  dailyCheckin: true,
  weeklyRecap: true,
  monthlyReport: true,
  goalMilestone: true,
  streakMilestone: true,
  scoreChange: true,
  budgetChallenge: true,
  emailEnabled: true,
  inAppEnabled: true
};

export const notificationPreferencesInputSchema = z.object({
  dailyCheckin: z.boolean().optional(),
  weeklyRecap: z.boolean().optional(),
  monthlyReport: z.boolean().optional(),
  goalMilestone: z.boolean().optional(),
  streakMilestone: z.boolean().optional(),
  scoreChange: z.boolean().optional(),
  budgetChallenge: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional()
});

export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesInputSchema>;

const COLUMNS =
  "daily_checkin, weekly_recap, monthly_report, goal_milestone, streak_milestone, score_change, " +
  "budget_challenge, email_enabled, in_app_enabled, updated_at";

type NotificationPreferencesRow = {
  daily_checkin: boolean;
  weekly_recap: boolean;
  monthly_report: boolean;
  goal_milestone: boolean;
  streak_milestone: boolean;
  score_change: boolean;
  budget_challenge: boolean;
  email_enabled: boolean;
  in_app_enabled: boolean;
  updated_at: string;
};

function toPreferences(row: NotificationPreferencesRow): NotificationPreferences {
  return {
    dailyCheckin: row.daily_checkin,
    weeklyRecap: row.weekly_recap,
    monthlyReport: row.monthly_report,
    goalMilestone: row.goal_milestone,
    streakMilestone: row.streak_milestone,
    scoreChange: row.score_change,
    budgetChallenge: row.budget_challenge,
    emailEnabled: row.email_enabled,
    inAppEnabled: row.in_app_enabled,
    updatedAt: row.updated_at
  };
}

// Returns null if the user has never saved preferences yet — callers should
// treat null the same as DEFAULT_PREFERENCES (see comment above).
export async function getNotificationPreferences(): Promise<NotificationPreferences | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("notification_preferences").select(COLUMNS).maybeSingle();
  if (error) throw error;
  return data ? toPreferences(data as unknown as NotificationPreferencesRow) : null;
}

export async function upsertNotificationPreferences(
  userId: string,
  input: NotificationPreferencesInput
): Promise<NotificationPreferences> {
  const supabase = await createClient();
  const row: Record<string, unknown> = {
    user_id: userId,
    daily_checkin: input.dailyCheckin,
    weekly_recap: input.weeklyRecap,
    monthly_report: input.monthlyReport,
    goal_milestone: input.goalMilestone,
    streak_milestone: input.streakMilestone,
    score_change: input.scoreChange,
    budget_challenge: input.budgetChallenge,
    email_enabled: input.emailEnabled,
    in_app_enabled: input.inAppEnabled,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("notification_preferences")
    .upsert(row, { onConflict: "user_id" })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return toPreferences(data as unknown as NotificationPreferencesRow);
}

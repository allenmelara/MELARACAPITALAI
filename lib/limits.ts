import type { Plan } from "@/lib/profile";

export const PLAN_LIMITS: Record<
  Plan,
  { reportsPerMonth: number; savedReports: number; chatMessagesPerMonth: number }
> = {
  free: { reportsPerMonth: 3, savedReports: 5, chatMessagesPerMonth: 10 },
  pro: { reportsPerMonth: 100, savedReports: Infinity, chatMessagesPerMonth: 200 },
  business: { reportsPerMonth: Infinity, savedReports: Infinity, chatMessagesPerMonth: Infinity }
};

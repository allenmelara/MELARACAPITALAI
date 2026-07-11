import type { Plan } from "@/lib/profile";

export const PLAN_LIMITS: Record<Plan, { reportsPerMonth: number; savedReports: number }> = {
  free: { reportsPerMonth: 3, savedReports: 5 },
  pro: { reportsPerMonth: 100, savedReports: Infinity },
  business: { reportsPerMonth: Infinity, savedReports: Infinity }
};

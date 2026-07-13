import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { listGoals } from "@/lib/financialGoals";
import GoalsTracker from "@/components/GoalsTracker";

export default async function GoalsPage() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const goals = await listGoals();
  return <GoalsTracker initialGoals={goals} />;
}

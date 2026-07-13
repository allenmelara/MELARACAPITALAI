import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { getPlan } from "@/lib/profile";
import DashboardSidebar from "@/components/DashboardSidebar";
import NotificationBell from "@/components/NotificationBell";

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }
  const plan = await getPlan();

  return (
    <div className="dash-shell">
      <DashboardSidebar email={user.email ?? ""} plan={plan} />
      <NotificationBell />
      <main className="dash-content">
        <div className="dash-content-inner">{children}</div>
      </main>
    </div>
  );
}

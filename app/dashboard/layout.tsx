import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { signOutAction } from "@/app/auth/actions";

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="shell">
      <nav className="nav">
        <Link href="/" className="brand">
          Melara Capital <span>AI</span>
        </Link>
        <div className="nav-actions">
          <Link href="/dashboard" className="nav-note">
            Workspace
          </Link>
          <Link href="/dashboard/reports" className="nav-note">
            Saved reports
          </Link>
          <Link href="/pricing" className="nav-note">
            Billing
          </Link>
          <span className="nav-note">{user.email}</span>
          <form action={signOutAction}>
            <button className="secondary" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </nav>
      <main className="main">{children}</main>
    </div>
  );
}

import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { getPlan } from "@/lib/profile";
import { signOutAction } from "@/app/auth/actions";

const PLAN_LABELS = { free: "Free", pro: "Pro", business: "Business" };

export default async function SettingsPage() {
  const user = await getUser();
  const plan = await getPlan();

  return (
    <>
      <section className="dash-header">
        <h1>Settings</h1>
        <p>Your account details and plan.</p>
      </section>

      <div className="panel">
        <div className="form-grid">
          <label className="full">
            Email
            <input value={user?.email ?? ""} disabled />
          </label>
          <label className="full">
            Current plan
            <input value={PLAN_LABELS[plan]} disabled />
          </label>
        </div>
        <div className="actions">
          <Link href="/pricing" className="secondary">
            Manage billing
          </Link>
          <form action={signOutAction}>
            <button className="secondary" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

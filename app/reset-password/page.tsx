"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updatePassword, type AuthState } from "@/app/auth/actions";

const initialState: AuthState = { error: "" };

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(updatePassword, initialState);

  return (
    <div className="shell">
      <nav className="nav">
        <Link href="/" className="brand">
          Melara Capital <span>AI</span>
        </Link>
      </nav>
      <main className="main">
        <div className="panel auth-card">
          <h2>Set a new password</h2>
          <form action={formAction} className="form-grid">
            <label className="full">
              New password
              <input type="password" name="password" required autoComplete="new-password" minLength={8} />
            </label>
            <label className="full">
              Confirm new password
              <input type="password" name="confirmPassword" required autoComplete="new-password" minLength={8} />
            </label>
            {state.error && <div className="error full">{state.error}</div>}
            <div className="actions full">
              <button className="primary" type="submit" disabled={pending}>
                {pending ? "Saving..." : "Save new password"}
              </button>
            </div>
          </form>
          <p className="disclaimer">
            If this link has expired, <Link href="/forgot-password">request a new one</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}

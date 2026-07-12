"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, type AuthState } from "@/app/auth/actions";

const initialState: AuthState = { error: "" };

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  return (
    <div className="shell">
      <nav className="nav">
        <Link href="/" className="brand">
          Melara Capital <span>AI</span>
        </Link>
      </nav>
      <main className="main">
        <div className="panel auth-card">
          <h2>Reset your password</h2>
          <p className="disclaimer">
            Enter your account email and we&apos;ll send you a link to set a new password.
          </p>
          <form action={formAction} className="form-grid">
            <label className="full">
              Email
              <input type="email" name="email" required autoComplete="email" />
            </label>
            {state.error && <div className="error full">{state.error}</div>}
            <div className="actions full">
              <button className="primary" type="submit" disabled={pending}>
                {pending ? "Sending..." : "Send reset link"}
              </button>
            </div>
          </form>
          <p className="link-muted">
            <Link href="/login">Back to log in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

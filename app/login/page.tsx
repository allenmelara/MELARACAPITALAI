"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn, type AuthState } from "@/app/auth/actions";

const initialState: AuthState = { error: "" };

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const searchParams = useSearchParams();
  const justSignedUp = searchParams.get("confirm") === "1";
  const resetRequested = searchParams.get("resetRequested") === "1";

  return (
    <div className="shell">
      <nav className="nav">
        <Link href="/" className="brand">
          Melara Capital <span>AI</span>
        </Link>
      </nav>
      <main className="main">
        <div className="panel auth-card">
          <h2>Log in</h2>
          {justSignedUp && (
            <p className="notice">Check your email to confirm your account, then log in.</p>
          )}
          {resetRequested && (
            <p className="notice">
              If that email has an account, we&apos;ve sent a password reset link — check your inbox.
            </p>
          )}
          <form action={formAction} className="form-grid">
            <label className="full">
              Email
              <input type="email" name="email" required autoComplete="email" />
            </label>
            <label className="full">
              Password
              <input type="password" name="password" required autoComplete="current-password" />
            </label>
            {state.error && <div className="error full">{state.error}</div>}
            <div className="actions full">
              <button className="primary" type="submit" disabled={pending}>
                {pending ? "Logging in..." : "Log in"}
              </button>
            </div>
          </form>
          <p className="link-muted">
            <Link href="/forgot-password">Forgot password?</Link>
          </p>
          <p className="link-muted">
            No account? <Link href="/signup">Sign up</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

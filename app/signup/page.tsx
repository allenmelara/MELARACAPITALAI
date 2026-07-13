"use client";

import { useActionState } from "react";
import Link from "next/link";
import Image from "next/image";
import { signUp, type AuthState } from "@/app/auth/actions";

const initialState: AuthState = { error: "" };

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  return (
    <div className="shell">
      <nav className="nav">
        <Link href="/" className="brand">
          <Image src="/logo.png" alt="" width={28} height={28} className="brand-logo" />
          Melara Capital <span>AI</span>
        </Link>
      </nav>
      <main className="main">
        <div className="panel auth-card">
          <h2>Create your account</h2>
          <form action={formAction} className="form-grid">
            <label className="full">
              Email
              <input type="email" name="email" required autoComplete="email" />
            </label>
            <label className="full">
              Password
              <input type="password" name="password" required autoComplete="new-password" minLength={8} />
            </label>
            {state.error && <div className="error full">{state.error}</div>}
            <div className="actions full">
              <button className="primary" type="submit" disabled={pending}>
                {pending ? "Creating account..." : "Sign up"}
              </button>
            </div>
          </form>
          <p className="link-muted">
            Already have an account? <Link href="/login">Log in</Link>
          </p>
          <p className="auth-legal-note">
            By signing up, you agree to our <Link href="/terms">Terms of Service</Link> and{" "}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}

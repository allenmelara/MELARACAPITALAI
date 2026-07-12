"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/ip";

export type AuthState = { error: string };

const credentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters.")
});

export async function signIn(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const ip = await getClientIp();
  if (!checkRateLimit(`auth:signin:${ip}`, 10, 60_000)) {
    return { error: "Too many attempts. Try again in a minute." };
  }

  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid credentials." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: error.message };
  }
  redirect("/dashboard");
}

export async function signUp(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const ip = await getClientIp();
  if (!checkRateLimit(`auth:signup:${ip}`, 5, 60_000)) {
    return { error: "Too many attempts. Try again in a minute." };
  }

  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    ...parsed.data,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm`
    }
  });
  if (error) {
    return { error: error.message };
  }
  redirect("/login?confirm=1");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const emailSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.")
});

export async function requestPasswordReset(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const ip = await getClientIp();
  if (!checkRateLimit(`auth:reset-request:${ip}`, 5, 60_000)) {
    return { error: "Too many attempts. Try again in a minute." };
  }

  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid email address." };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    // Recovery links land on /auth/confirm first to exchange the token for a
    // session, then forward here so the user can set a new password while
    // that (temporary) session is active.
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/reset-password`
  });
  // Always redirect to the same "check your email" state, whether or not the
  // address has an account — this avoids leaking which emails are registered.
  redirect("/login?resetRequested=1");
}

const newPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"]
  });

export async function updatePassword(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword")
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { error: error.message };
  }
  redirect("/dashboard?passwordUpdated=1");
}

"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authErrorCode } from "@/lib/auth-errors";
import { clientKeyFromHeaders, isRateLimited } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Tighter than the geo API routes' 60/min — these gate actual authentication
// attempts, so scripted credential-stuffing/signup-spam should hit a wall fast.
const LOGIN_ATTEMPTS_PER_MINUTE = 10;
const SIGNUP_ATTEMPTS_PER_MINUTE = 5;

function parseCredentials(formData: FormData): { email: string; password: string } | null {
  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || typeof password !== "string") return null;
  const trimmedEmail = email.trim();
  if (!EMAIL_RE.test(trimmedEmail) || password.length < 6) return null;
  return { email: trimmedEmail, password };
}

export async function login(formData: FormData) {
  const clientId = clientKeyFromHeaders(await headers());
  if (isRateLimited(`login:${clientId}`, LOGIN_ATTEMPTS_PER_MINUTE)) {
    redirect("/login?error=rate_limited");
  }

  const credentials = parseCredentials(formData);
  if (!credentials) redirect("/login?error=invalid_input");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(credentials);

  if (error) {
    redirect(`/login?error=${authErrorCode(error)}`);
  }

  revalidatePath("/", "layout");
  redirect("/trips");
}

export async function signup(formData: FormData) {
  const clientId = clientKeyFromHeaders(await headers());
  if (isRateLimited(`signup:${clientId}`, SIGNUP_ATTEMPTS_PER_MINUTE)) {
    redirect("/signup?error=rate_limited");
  }

  const credentials = parseCredentials(formData);
  if (!credentials) redirect("/signup?error=invalid_input");

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp(credentials);

  if (error) {
    redirect(`/signup?error=${authErrorCode(error)}`);
  }

  revalidatePath("/", "layout");
  redirect("/trips");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

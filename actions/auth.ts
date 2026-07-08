"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authErrorCode } from "@/lib/auth-errors";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseCredentials(formData: FormData): { email: string; password: string } | null {
  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || typeof password !== "string") return null;
  const trimmedEmail = email.trim();
  if (!EMAIL_RE.test(trimmedEmail) || password.length < 6) return null;
  return { email: trimmedEmail, password };
}

export async function login(formData: FormData) {
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

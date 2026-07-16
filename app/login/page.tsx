import Link from "next/link";
import { login, resendConfirmation } from "@/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";
import { authErrorMessage, authNoticeMessage } from "@/lib/auth-errors";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { error, notice } = await searchParams;
  const noticeMessage = authNoticeMessage(notice);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="glass-card enter w-full max-w-sm p-8">
        <h1 className="font-display mb-1 text-2xl font-semibold">Welcome back</h1>
        <p className="mb-6 text-sm text-white/70">Log in to plan your next trip.</p>

        {noticeMessage && (
          <p
            role="status"
            className="border-accent-400/40 bg-accent-500/10 text-accent-300 mb-4 rounded-md border px-3 py-2 text-sm"
          >
            {noticeMessage}
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="border-danger-400/40 bg-danger-500/20 text-danger-300 mb-4 rounded-md border px-3 py-2 text-sm"
          >
            {authErrorMessage(error)}
          </p>
        )}

        {/*
          "Email not confirmed" is the one login error with an actual next
          step (Supabase requires clicking a link it emailed on signup) —
          give a way to resend it instead of leaving the user stuck with
          just an error message and no path forward.
        */}
        {error === "email_not_confirmed" && (
          <form
            action={resendConfirmation}
            className="border-accent-400/20 bg-accent-500/5 mb-4 flex flex-col gap-2 rounded-md border p-3"
          >
            <label className="flex flex-col gap-1 text-xs text-white/70">
              Resend the confirmation email to
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                className="glass-input px-3 py-2"
              />
            </label>
            <SubmitButton variant="ghost" pendingLabel="Resending…">
              Resend confirmation email
            </SubmitButton>
          </form>
        )}

        <form action={login} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-xs text-white/70">
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              className="glass-input px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-white/70">
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              className="glass-input px-3 py-2"
            />
          </label>
          <SubmitButton pendingLabel="Logging in…" className="mt-2">
            Log in
          </SubmitButton>
        </form>

        <p className="mt-6 text-sm text-white/70">
          No account?{" "}
          <Link href="/signup" className="underline hover:text-white">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}

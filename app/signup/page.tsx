import Link from "next/link";
import { signup } from "@/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";
import { authErrorMessage } from "@/lib/auth-errors";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="glass-card enter w-full max-w-sm p-8">
        <h1 className="font-display mb-1 text-2xl font-semibold">Create your account</h1>
        <p className="mb-6 text-sm text-white/70">
          Start planning trips and tracking weather for every stop.
        </p>

        {error && (
          <p
            role="alert"
            className="border-danger-400/40 bg-danger-500/20 text-danger-300 mb-4 rounded-md border px-3 py-2 text-sm"
          >
            {authErrorMessage(error)}
          </p>
        )}

        <form action={signup} className="flex flex-col gap-4">
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
              autoComplete="new-password"
              placeholder="Min 6 characters"
              required
              minLength={6}
              className="glass-input px-3 py-2"
            />
          </label>
          <SubmitButton pendingLabel="Creating account…" className="mt-2">
            Sign up
          </SubmitButton>
        </form>

        <p className="mt-6 text-sm text-white/70">
          Already have an account?{" "}
          <Link href="/login" className="underline hover:text-white">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}

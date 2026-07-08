import Link from "next/link";
import { signup } from "@/actions/auth";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="glass-card w-full max-w-sm p-8">
        <h1 className="mb-1 text-2xl font-semibold">Create your account</h1>
        <p className="mb-6 text-sm text-white/70">
          Start planning trips and tracking weather for every stop.
        </p>

        {error && (
          <p className="mb-4 rounded-md border border-red-400/40 bg-red-500/20 px-3 py-2 text-sm text-red-100">
            {error}
          </p>
        )}

        <form action={signup} className="flex flex-col gap-4">
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="glass-input px-3 py-2"
          />
          <input
            name="password"
            type="password"
            placeholder="Password (min 6 characters)"
            required
            minLength={6}
            className="glass-input px-3 py-2"
          />
          <button
            type="submit"
            className="mt-2 rounded-md bg-white/90 px-4 py-2 font-medium text-slate-900 transition hover:bg-white"
          >
            Sign up
          </button>
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

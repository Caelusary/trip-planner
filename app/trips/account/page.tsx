import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/user";
import { logout } from "@/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const initial = (user.email ?? "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 pt-4">
      <h1 className="font-display text-xl font-semibold">Account</h1>

      <div className="glass-card flex flex-col items-center gap-3 p-6 text-center">
        <span
          aria-hidden="true"
          className="bg-accent-400/20 text-accent-400 flex h-16 w-16 items-center justify-center rounded-full text-2xl font-semibold"
        >
          {initial}
        </span>
        <p className="break-all text-sm font-medium text-white/90">{user.email}</p>
        <form action={logout} className="w-full">
          <SubmitButton variant="ghost" pendingLabel="Logging out…" className="w-full">
            Log out
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}

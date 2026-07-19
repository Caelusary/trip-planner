import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/user";

export default async function Home() {
  const user = await getCurrentUser();

  redirect(user ? "/trips" : "/login");
}

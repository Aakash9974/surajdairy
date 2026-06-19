"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      className="rounded-lg px-3 py-1.5 text-sm text-white/85 ring-1 ring-white/25 transition hover:bg-white/15"
    >
      Sign out
    </button>
  );
}

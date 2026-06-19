import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DAIRY_NAME } from "@/lib/format";
import AppNav from "@/components/AppNav";
import SignOutButton from "@/components/SignOutButton";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col">
      <header className="sticky top-0 z-10 bg-gradient-to-r from-teal-700 to-emerald-600 text-white shadow-md">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="" className="h-9 w-9 rounded-xl bg-white shadow-sm" />
            <div className="leading-tight">
              <p className="font-semibold">{DAIRY_NAME}</p>
              <p className="text-[11px] text-white/70">Sales &amp; ledger</p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </header>

      <main className="flex-1 px-4 pb-28 pt-4">{children}</main>

      <AppNav />
    </div>
  );
}

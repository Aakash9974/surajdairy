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
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="text-xl">🥛</span>
          <span className="font-semibold">{DAIRY_NAME}</span>
        </div>
        <SignOutButton />
      </header>

      <main className="flex-1 px-4 pb-24 pt-4">{children}</main>

      <AppNav />
    </div>
  );
}

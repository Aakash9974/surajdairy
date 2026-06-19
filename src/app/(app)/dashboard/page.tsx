import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatINR, DAIRY_NAME } from "@/lib/format";

export const dynamic = "force-dynamic";

function isConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return url.length > 0 && !url.includes("placeholder");
}

async function getStats() {
  const today = new Date().toISOString().slice(0, 10);
  const supabase = await createClient();

  const [salesToday, outstanding, customers] = await Promise.all([
    supabase.from("sales").select("total_amount, paid_amount").eq("sale_date", today),
    supabase.from("customer_balances").select("balance"),
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("is_active", true),
  ]);

  const todayTotal = salesToday.data?.reduce((s, r) => s + Number(r.total_amount), 0) ?? 0;
  const todayUdhar =
    salesToday.data?.reduce((s, r) => s + (Number(r.total_amount) - Number(r.paid_amount)), 0) ?? 0;
  // Only positive balances count as outstanding (advances shouldn't reduce it).
  const totalOutstanding =
    outstanding.data?.reduce((s, r) => s + Math.max(0, Number(r.balance)), 0) ?? 0;

  return { todayTotal, todayUdhar, totalOutstanding, customerCount: customers.count ?? 0 };
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const configured = isConfigured();
  const stats = configured ? await getStats().catch(() => null) : null;

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-600 p-5 text-white shadow-md">
        <p className="text-sm text-white/80">{greeting()} 👋</p>
        <p className="text-xl font-semibold">{DAIRY_NAME}</p>
        <Link
          href="/sale"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur transition hover:bg-white/25"
        >
          🛒 Start a new sale →
        </Link>
      </div>

      {!configured && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-medium">Connect Supabase to go live</p>
          <p className="mt-1">
            Add your project URL and anon key to <code>.env.local</code>, then run the
            SQL in <code>supabase/</code>. See <code>SETUP.md</code>.
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Stat icon="💰" label="Sales today" value={formatINR(stats?.todayTotal ?? 0)} tint="bg-teal-50 text-teal-700" />
        <Stat icon="📝" label="Udhar today" value={formatINR(stats?.todayUdhar ?? 0)} tint="bg-orange-50 text-orange-700" />
        <Stat icon="⚠️" label="Total outstanding" value={formatINR(stats?.totalOutstanding ?? 0)} tint="bg-red-50 text-red-700" />
        <Stat icon="👥" label="Customers" value={String(stats?.customerCount ?? 0)} tint="bg-indigo-50 text-indigo-700" />
      </div>

      {/* Quick actions */}
      <div>
        <p className="mb-2 px-1 text-sm font-semibold text-slate-500">Quick actions</p>
        <div className="grid grid-cols-2 gap-3">
          <Action href="/sale" icon="🛒" label="New sale" primary />
          <Action href="/customers/new" icon="➕" label="Add customer" />
          <Action href="/products" icon="📦" label="Inventory" />
          <Action href="/ledger" icon="📒" label="Ledger & reports" />
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, tint }: { icon: string; label: string; value: string; tint: string }) {
  return (
    <div className="card p-4">
      <span className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl text-lg ${tint}`}>
        {icon}
      </span>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 text-xl font-bold text-slate-800">{value}</p>
    </div>
  );
}

function Action({ href, icon, label, primary }: { href: string; icon: string; label: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={
        primary
          ? "btn-brand flex items-center gap-3 p-4"
          : "card flex items-center gap-3 p-4 text-slate-800 transition hover:bg-slate-50"
      }
    >
      <span className="text-2xl">{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  );
}

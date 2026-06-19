import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatINR } from "@/lib/format";

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

  const todayTotal =
    salesToday.data?.reduce((s, r) => s + Number(r.total_amount), 0) ?? 0;
  const todayUdhar =
    salesToday.data?.reduce(
      (s, r) => s + (Number(r.total_amount) - Number(r.paid_amount)),
      0,
    ) ?? 0;
  const totalOutstanding =
    outstanding.data?.reduce((s, r) => s + Number(r.balance), 0) ?? 0;

  return {
    todayTotal,
    todayUdhar,
    totalOutstanding,
    customerCount: customers.count ?? 0,
  };
}

export default async function DashboardPage() {
  const configured = isConfigured();
  const stats = configured
    ? await getStats().catch(() => null)
    : null;

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold">Today at a glance</h1>

      {!configured && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-medium">Connect Supabase to go live</p>
          <p className="mt-1">
            Add your project URL and anon key to <code>.env.local</code>, then run the
            SQL in <code>supabase/migrations</code>. See <code>SETUP.md</code>.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Sales today" value={formatINR(stats?.todayTotal ?? 0)} accent="text-brand" />
        <Stat label="Udhar today" value={formatINR(stats?.todayUdhar ?? 0)} accent="text-orange-600" />
        <Stat label="Total outstanding" value={formatINR(stats?.totalOutstanding ?? 0)} accent="text-red-600" />
        <Stat label="Customers" value={String(stats?.customerCount ?? 0)} accent="text-slate-700" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Action href="/sale" icon="🛒" label="New sale" primary />
        <Action href="/customers/new" icon="➕" label="Add customer" />
        <Action href="/products" icon="📦" label="Inventory" />
        <Action href="/ledger" icon="📒" label="Ledger & reports" />
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${accent}`}>{value}</p>
    </div>
  );
}

function Action({
  href,
  icon,
  label,
  primary,
}: {
  href: string;
  icon: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl p-4 ring-1 transition ${
        primary
          ? "bg-brand text-white ring-brand hover:bg-brand-dark"
          : "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      <span className="text-2xl">{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  );
}

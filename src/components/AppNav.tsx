"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Home", icon: "🏠" },
  { href: "/sale", label: "Sell", icon: "🛒" },
  { href: "/customers", label: "Customers", icon: "👥" },
  { href: "/products", label: "Inventory", icon: "📦" },
  { href: "/ledger", label: "Ledger", icon: "📒" },
];

export default function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-1">
      <ul className="mx-auto flex max-w-md items-stretch justify-between rounded-2xl bg-white/95 p-1.5 shadow-lg ring-1 ring-slate-200/70 backdrop-blur">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] transition ${
                  active
                    ? "bg-gradient-to-br from-teal-600 to-emerald-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className={active ? "font-semibold" : ""}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

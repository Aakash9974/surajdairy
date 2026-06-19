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
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-2xl">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-xs ${
                  active ? "text-brand" : "text-slate-500"
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className={active ? "font-medium" : ""}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

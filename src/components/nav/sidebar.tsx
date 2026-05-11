"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  ShieldCheck,
  Bot,
  BarChart3,
  Settings,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/outputs", label: "Outputs", icon: FileText },
  { href: "/policies", label: "Policies", icon: ShieldCheck },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-56 border-r border-zinc-800 bg-zinc-950 h-screen sticky top-0 shrink-0">
      <div className="flex items-center gap-2 px-4 h-14 border-b border-zinc-800">
        <Shield className="h-5 w-5 text-amber-500" />
        <span className="font-semibold text-zinc-100 tracking-tight">Sentinel</span>
      </div>

      <nav className="flex flex-col gap-0.5 p-2 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-amber-500" : "")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t border-zinc-800">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </aside>
  );
}

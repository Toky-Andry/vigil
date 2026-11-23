"use client";

import { Eye } from "lucide-react";
import { usePathname } from "next/navigation";
import { SidebarItem } from "@/components/shell/sidebar-item";
import { NAV_ITEMS, isActive } from "@/lib/nav-items";

const VERSION = "0.1.0";
const ASIDE = [
  "sticky top-0 hidden h-screen w-64 shrink-0 flex-col",
  "border-r border-border bg-surface/40 lg:flex",
].join(" ");

export function Sidebar({ openCount }: { openCount: number }) {
  const pathname = usePathname();
  return (
    <aside className={ASIDE}>
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="rounded-md bg-primary/10 p-1.5 text-primary">
          <Eye size={18} />
        </span>
        <div>
          <p className="font-semibold leading-tight">Vigil</p>
          <p className="font-mono text-[11px] text-muted">Monitoring</p>
        </div>
      </div>
      <p className="px-5 pb-2 font-mono text-[11px] uppercase tracking-wider text-muted">
        Navigation
      </p>
      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => (
          <SidebarItem
            key={item.href}
            item={item}
            active={isActive(item.href, pathname)}
            badge={item.href === "/alerts" ? openCount : 0}
          />
        ))}
      </nav>
      <p className="border-t border-border px-5 py-3 font-mono text-xs text-muted">v{VERSION}</p>
    </aside>
  );
}

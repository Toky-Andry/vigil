"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isActive } from "@/lib/nav-items";

// Navigation horizontale pour les écrans étroits (la barre latérale est masquée).
export function MobileNav() {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((i) => i.enabled);
  return (
    <nav className="flex gap-4 overflow-x-auto border-b border-border px-4 py-2 text-sm lg:hidden">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={isActive(i.href, pathname) ? "text-primary" : "text-muted"}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useIncidents } from "@/hooks/use-incidents";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/alerts", label: "Alerts" },
] as const;

const isActive = (href: string, path: string) =>
  href === "/" ? path === "/" || path.startsWith("/servers") : path.startsWith(href);

export function Nav() {
  const pathname = usePathname();
  const { incidents } = useIncidents("open");
  const open = incidents?.length ?? 0;

  return (
    <header className="border-b border-border bg-surface/60">
      <nav className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3 text-sm">
        <span className="font-semibold">Vigil</span>
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={isActive(l.href, pathname) ? "text-primary" : "text-muted hover:text-text"}
          >
            {l.label}
            {l.href === "/alerts" && open > 0 && (
              <span className="ml-2 rounded bg-danger/20 px-1.5 text-xs text-danger">{open}</span>
            )}
          </Link>
        ))}
      </nav>
    </header>
  );
}

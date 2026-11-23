"use client";

import { Suspense, type ReactNode } from "react";
import { MobileNav } from "@/components/shell/mobile-nav";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { useIncidents } from "@/hooks/use-incidents";

// Une seule requête d'incidents ouverts, partagée par la barre latérale et la barre du haut.
export function AppShell({ children }: { children: ReactNode }) {
  const { incidents, error } = useIncidents("open");
  const apiDown = error !== null && incidents === null;

  return (
    <div className="flex min-h-screen">
      <Suspense fallback={null}>
        <Sidebar openCount={incidents?.length ?? 0} />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar incidents={incidents} apiDown={apiDown} />
        <Suspense fallback={null}>
          <MobileNav />
        </Suspense>
        {children}
      </div>
    </div>
  );
}

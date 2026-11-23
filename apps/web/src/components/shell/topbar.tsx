import { LiveIndicator } from "@/components/shell/live-indicator";
import { SystemStatus } from "@/components/shell/system-status";
import type { Incident } from "@/lib/incidents-api";

type Props = { incidents: Incident[] | null; apiDown: boolean };

const HEADER = [
  "sticky top-0 z-10 flex h-14 items-center border-b border-border",
  "bg-bg/80 px-4 backdrop-blur lg:px-6",
].join(" ");

export function Topbar({ incidents, apiDown }: Props) {
  return (
    <header className={HEADER}>
      <span className="font-semibold lg:hidden">Vigil</span>
      <div className="ml-auto flex items-center gap-4">
        <LiveIndicator />
        <SystemStatus incidents={incidents} apiDown={apiDown} />
      </div>
    </header>
  );
}

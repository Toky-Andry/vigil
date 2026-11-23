import Link from "next/link";
import type { NavItem } from "@/lib/nav-items";

const BASE = [
  "flex items-center gap-3 whitespace-nowrap rounded-md px-3 py-2",
  "text-sm transition-colors",
].join(" ");
const ACTIVE = "bg-primary/10 text-primary";
const IDLE = "text-muted hover:bg-surface hover:text-text";

type Props = { item: NavItem; active: boolean; badge?: number };

export function SidebarItem({ item, active, badge = 0 }: Props) {
  const Icon = item.icon;

  if (!item.enabled) {
    return (
      <span aria-disabled className={`${BASE} cursor-not-allowed text-muted/50`}>
        <Icon size={18} />
        {item.label}
        <span className="ml-auto font-mono text-[10px] uppercase">Bientôt</span>
      </span>
    );
  }

  const style = active ? ACTIVE : IDLE;
  return (
    <Link href={item.href} className={`${BASE} ${style}`}>
      <Icon size={18} />
      {item.label}
      {badge > 0 && (
        <span className="ml-auto rounded bg-danger/20 px-1.5 font-mono text-xs text-danger">
          {badge}
        </span>
      )}
    </Link>
  );
}

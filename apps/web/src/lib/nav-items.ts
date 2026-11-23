import {
  Bell,
  FlaskConical,
  LayoutDashboard,
  Server,
  Settings,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  enabled: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard, enabled: true },
  { href: "/servers", label: "Servers", icon: Server, enabled: true },
  { href: "/alerts", label: "Alerts", icon: Bell, enabled: true },
  { href: "/incidents", label: "Incidents", icon: TriangleAlert, enabled: false },
  { href: "/methods", label: "Detection methods", icon: FlaskConical, enabled: false },
  { href: "/settings", label: "Settings", icon: Settings, enabled: false },
];

export function isActive(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

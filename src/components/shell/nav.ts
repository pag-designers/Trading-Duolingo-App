import {
  BookOpen,
  ChartCandlestick,
  FlaskConical,
  HeartPulse,
  Map,
  NotebookPen,
  Settings,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown in the phone tab bar (the rest live in the desktop sidebar and Profile). */
  tab: boolean;
}

export const NAV: NavItem[] = [
  { href: "/", label: "Learn", icon: Map, tab: true },
  { href: "/chart-school", label: "Chart School", icon: ChartCandlestick, tab: true },
  { href: "/trade-lab", label: "Trade Lab", icon: FlaskConical, tab: true },
  { href: "/journal", label: "Journal", icon: NotebookPen, tab: true },
  { href: "/profile", label: "Profile", icon: UserRound, tab: true },
  { href: "/glossary", label: "Glossary", icon: BookOpen, tab: false },
  { href: "/settings", label: "Settings", icon: Settings, tab: false },
  { href: "/admin/health", label: "Health", icon: HeartPulse, tab: false },
];

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

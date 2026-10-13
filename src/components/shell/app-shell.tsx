"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Wick } from "@/components/mascot/wick";
import { cn } from "@/lib/utils";
import { isActive, NAV } from "./nav";
import { Splash } from "./splash";
import { useAppReady } from "./use-app-ready";
import { StreakChip, XpChip } from "./stats";

/** Wraps every in-app page: nav, stats, and the first-run redirect to onboarding. */
export function AppShell({ children }: { children: ReactNode }) {
  const ready = useAppReady();
  const pathname = usePathname();

  if (!ready) return <Splash />;

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[17rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-1 border-r-2 border-border bg-surface p-4 md:flex">
        <Link
          href="/"
          className="mb-4 flex min-h-12 items-center gap-2 px-2 py-1"
          aria-label="Candlo home"
        >
          <Wick size={44} decorative animate={false} />
          <span className="text-3xl font-black tracking-tight text-brand">Candlo</span>
        </Link>
        <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-12 items-center gap-3 rounded-2xl border-2 px-3 font-extrabold tracking-wide uppercase",
                  active
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-transparent text-muted hover:bg-surface-2",
                )}
              >
                <Icon className="size-6" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-1 border-t-2 border-border pt-3">
          <StreakChip />
          <XpChip />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col pb-24 md:pb-0">
        {/* Phone top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b-2 border-border bg-background/95 px-4 py-1 backdrop-blur md:hidden">
          <Link href="/" className="flex min-h-12 items-center gap-2" aria-label="Candlo home">
            <Wick size={36} decorative animate={false} />
            <span className="text-2xl font-black text-brand">Candlo</span>
          </Link>
          <div className="flex items-center">
            <StreakChip />
            <XpChip />
          </div>
        </header>
        <main id="main" className="flex-1">
          {children}
        </main>
      </div>

      {/* Phone bottom tab bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t-2 border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {NAV.filter((n) => n.tab).map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-extrabold",
                active ? "text-brand" : "text-muted",
              )}
            >
              <Icon className={cn("size-7", active && "stroke-[2.5]")} aria-hidden />
              <span>{label.replace("Chart School", "Charts").replace("Trade Lab", "Lab")}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

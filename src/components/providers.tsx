"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { ThemeProvider, useTheme } from "next-themes";
import { useEffect, useState, type ReactNode } from "react";
import { useHydrated } from "@/store/hydration";
import { useSettings } from "@/store/settings";
import { SyncBridge } from "./sync-bridge";

/** Keeps <html> attributes and next-themes in step with the settings store. */
function SettingsEffects() {
  const hydrated = useHydrated();
  const { setTheme } = useTheme();
  const theme = useSettings((s) => s.theme);
  const readingMode = useSettings((s) => s.readingMode);
  const reducedMotion = useSettings((s) => s.reducedMotion);

  useEffect(() => {
    if (hydrated) setTheme(theme);
  }, [hydrated, theme, setTheme]);

  useEffect(() => {
    const root = document.documentElement;
    if (readingMode) root.dataset.reading = "large";
    else delete root.dataset.reading;
    if (reducedMotion) root.dataset.motion = "reduced";
    else delete root.dataset.motion;
  }, [readingMode, reducedMotion]);

  return null;
}

/** framer-motion skips transform animations for reduced motion: "always" when the learner asked, else follow the device. */
function MotionConfigBridge({ children }: { children: ReactNode }) {
  const reduced = useSettings((s) => s.reducedMotion);
  return <MotionConfig reducedMotion={reduced ? "always" : "user"}>{children}</MotionConfig>;
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1 } } }),
  );
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="candlo-theme"
      disableTransitionOnChange
    >
      <QueryClientProvider client={client}>
        <MotionConfigBridge>
          <SettingsEffects />
          <SyncBridge />
          {children}
        </MotionConfigBridge>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

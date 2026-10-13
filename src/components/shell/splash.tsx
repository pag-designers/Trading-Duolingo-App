import { Wick } from "@/components/mascot/wick";

/** Shown for a moment while stored progress loads. */
export function Splash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3" role="status">
      <Wick mood="sleepy" size={120} decorative />
      <p className="skeleton text-lg font-bold text-muted">Waking up Wick…</p>
    </div>
  );
}

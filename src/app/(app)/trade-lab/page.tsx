import type { Metadata } from "next";
import Link from "next/link";
import { RiskReminder } from "@/components/risk-reminder";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Trade Lab" };

export default function TradeLabPage() {
  return (
    <EmptyState
      mood="think"
      title="Trade Lab is warming up"
      action={
        <Button variant="secondary" asChild>
          <Link href="/settings">See the Trade Lab rules</Link>
        </Button>
      }
    >
      <p>
        Soon you will replay a market day one candle at a time and place trades with pretend money.
        You will only see the past, never the future.
      </p>
      <RiskReminder className="text-left" />
    </EmptyState>
  );
}

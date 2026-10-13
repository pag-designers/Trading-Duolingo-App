import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Journal" };

export default function JournalPage() {
  return (
    <EmptyState mood="sleepy" title="No trades yet">
      <p>
        After each pretend trade, Candlo writes a journal entry for you. You add why you took the
        trade and what you learned.
      </p>
      <p className="text-base">
        Your win rate and other numbers will come only from trades you really made here.
      </p>
    </EmptyState>
  );
}

import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Chart School" };

export default function ChartSchoolPage() {
  return (
    <EmptyState mood="think" title="Chart School opens with Unit 2">
      <p>
        Here you will learn the TradingView screen one button at a time, then draw lines and turn on
        indicators on a practice chart.
      </p>
      <p className="text-base">Finish Unit 1 on the Learn page to get ready.</p>
    </EmptyState>
  );
}

import type { Metadata } from "next";
import { ChartSchoolScreen } from "@/components/chart/chart-school-screen";

export const metadata: Metadata = { title: "Chart School" };

export default function ChartSchoolPage() {
  return <ChartSchoolScreen />;
}

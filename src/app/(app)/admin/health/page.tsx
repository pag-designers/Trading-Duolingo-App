import type { Metadata } from "next";
import { HealthDashboard } from "@/components/admin/health-dashboard";

export const metadata: Metadata = { title: "App health" };

export default function HealthPage() {
  return <HealthDashboard />;
}

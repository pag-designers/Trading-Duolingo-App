"use client";

import { Award, Download, Flame, Star, Zap } from "lucide-react";
import Link from "next/link";
import { Wick } from "@/components/mascot/wick";
import { useStats } from "@/components/shell/stats";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { downloadBackup } from "@/lib/backup";
import { longestStreak } from "@/lib/progress";
import { useProfile } from "@/store/profile";
import { useProgress } from "@/store/progress";

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Zap;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border-2 border-border p-4">
      <Icon className="size-8 text-brand" aria-hidden />
      <div>
        <p className="tabular text-2xl font-black">{value}</p>
        <p className="text-sm font-bold tracking-wide text-muted uppercase">{label}</p>
      </div>
    </div>
  );
}

export function ProfileScreen() {
  const { displayName, mascotName, accessory } = useProfile();
  const { totalXp, streak, level } = useStats();
  const days = useProgress((s) => s.days);
  const nodes = useProgress((s) => s.nodes);
  const done = Object.values(nodes).filter((n) => n.status === "done").length;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <Card className="flex flex-col items-center gap-2 text-center sm:flex-row sm:text-left">
        <Wick mood="happy" accessory={accessory} name={mascotName} size={120} />
        <div>
          <h1 className="text-3xl">{displayName || "Trader in training"}</h1>
          <p className="text-lg text-muted">
            Level {level} · with {mascotName}
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={Zap} label="Total XP" value={totalXp} />
        <Stat icon={Flame} label="Streak" value={streak} />
        <Stat icon={Star} label="Best streak" value={longestStreak(days)} />
        <Stat icon={Award} label="Steps done" value={done} />
      </div>

      <Card>
        <CardTitle>Badges</CardTitle>
        <p className="mt-1 text-lg text-muted">
          Badges show up here when you earn them. Finish your first lesson to get the first one.
        </p>
      </Card>

      <Card>
        <CardTitle>Certificate</CardTitle>
        <p className="mt-1 text-lg text-muted">
          Beat the final boss in Unit 8 to earn your Candlo certificate.
        </p>
      </Card>

      <Card className="space-y-3">
        <CardTitle>Your data</CardTitle>
        <p className="text-lg text-muted">Everything stays on this device. Save a copy any time.</p>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={downloadBackup} data-testid="export">
            <Download /> Export my progress
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/settings">Settings</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/glossary">Glossary</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}

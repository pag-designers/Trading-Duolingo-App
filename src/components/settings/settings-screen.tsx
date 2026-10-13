"use client";

import { Moon, Monitor, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { useTheme } from "next-themes";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { playSound } from "@/lib/sound";
import { useProfile } from "@/store/profile";
import { useSettings, type CoachModelChoice, type ThemeChoice } from "@/store/settings";

function Row({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 sm:max-w-sm">
        <label htmlFor={id} className="block text-lg font-extrabold">
          {label}
        </label>
        {hint && <p className="text-base text-muted">{hint}</p>}
      </div>
      <div className="sm:shrink-0">{children}</div>
    </div>
  );
}

const dollars = (cents: number) => `$${(cents / 100).toLocaleString("en-US")}`;

export function SettingsScreen() {
  const s = useSettings();
  const profile = useProfile();
  const { setTheme } = useTheme();

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <h1 className="text-3xl">Settings</h1>

      <Card>
        <CardTitle>You</CardTitle>
        <Row id="name" label="Your name">
          <Input
            id="name"
            className="sm:w-64"
            value={profile.displayName}
            maxLength={30}
            onChange={(e) => profile.update({ displayName: e.target.value })}
          />
        </Row>
      </Card>

      <Card>
        <CardTitle>Look and feel</CardTitle>
        <Row id="theme" label="Theme" hint="Light, dark, or match your device.">
          <Segmented<ThemeChoice>
            label="Theme"
            value={s.theme}
            onValueChange={(theme) => {
              s.update({ theme });
              setTheme(theme);
            }}
            options={[
              {
                value: "light",
                label: (
                  <>
                    <Sun className="size-5" /> Light
                  </>
                ),
              },
              {
                value: "dark",
                label: (
                  <>
                    <Moon className="size-5" /> Dark
                  </>
                ),
              },
              {
                value: "system",
                label: (
                  <>
                    <Monitor className="size-5" /> Auto
                  </>
                ),
              },
            ]}
          />
        </Row>
        <Row id="reading" label="Reading mode" hint="Makes all text bigger.">
          <Switch
            id="reading"
            checked={s.readingMode}
            onCheckedChange={(readingMode) => s.update({ readingMode })}
          />
        </Row>
        <Row id="motion" label="Reduce motion" hint="Less movement and no bouncing.">
          <Switch
            id="motion"
            checked={s.reducedMotion}
            onCheckedChange={(reducedMotion) => s.update({ reducedMotion })}
          />
        </Row>
      </Card>

      <Card>
        <CardTitle>Sounds</CardTitle>
        <Row id="sound" label="Sound effects" hint="Chimes, cheers and a soft thud.">
          <Switch
            id="sound"
            checked={s.soundOn}
            onCheckedChange={(soundOn) => {
              s.update({ soundOn });
              if (soundOn) playSound("correct");
            }}
          />
        </Row>
        <Row id="volume" label="Volume">
          <div className="flex items-center gap-3 sm:w-72">
            <Slider
              id="volume"
              aria-label="Volume"
              min={0}
              max={100}
              step={5}
              value={[s.volume]}
              onValueChange={([volume]) => s.update({ volume: volume ?? 0 })}
              onValueCommit={() => playSound("tap")}
            />
            <span className="tabular w-10 text-right font-bold">{s.volume}</span>
          </div>
        </Row>
      </Card>

      <Card>
        <CardTitle>Daily goal</CardTitle>
        <Row id="goal" label="XP per day" hint="A small goal you can hit every day.">
          <Segmented
            label="Daily XP goal"
            value={String(s.dailyXpGoal)}
            onValueChange={(v) => s.update({ dailyXpGoal: Number(v) })}
            options={["10", "20", "30", "50"].map((v) => ({ value: v, label: v }))}
          />
        </Row>
      </Card>

      <Card>
        <CardTitle>Trade Lab rules</CardTitle>
        <p className="text-base text-muted">
          Pretend money only. These make the practice market feel like the real one.
        </p>
        <Row id="balance" label="Starting money" hint="How much pretend cash you start with.">
          <Segmented
            label="Starting balance"
            value={String(s.startingBalanceCents)}
            onValueChange={(v) => s.update({ startingBalanceCents: Number(v) })}
            options={[500_000, 1_000_000, 2_500_000, 5_000_000].map((c) => ({
              value: String(c),
              label: dollars(c),
            }))}
          />
        </Row>
        <Row
          id="pdt"
          label="Pattern day trader rule"
          hint="In the US, accounts under $25,000 can make only 3 day trades in 5 business days."
        >
          <Switch
            id="pdt"
            checked={s.pdtEnabled}
            onCheckedChange={(pdtEnabled) => s.update({ pdtEnabled })}
          />
        </Row>
        <Row
          id="slip"
          label="Slippage"
          hint="How far a fill can slip from the price you saw. 5 means 0.05%."
        >
          <Segmented
            label="Slippage in basis points"
            value={String(s.slippageBps)}
            onValueChange={(v) => s.update({ slippageBps: Number(v) })}
            options={["0", "5", "10", "25"].map((v) => ({ value: v, label: v }))}
          />
        </Row>
        <Row id="fee" label="Commission per trade" hint="Most stock brokers charge $0.">
          <Segmented
            label="Commission per trade"
            value={String(s.commissionCents)}
            onValueChange={(v) => s.update({ commissionCents: Number(v) })}
            options={[0, 100, 500].map((c) => ({
              value: String(c),
              label: dollars(c) === "$0" ? "$0" : `$${c / 100}`,
            }))}
          />
        </Row>
      </Card>

      <Card>
        <CardTitle>Coach</CardTitle>
        <Row
          id="coach"
          label="Coach model"
          hint="Auto uses a small fast model for hints and a bigger one for reviews."
        >
          <Segmented<CoachModelChoice>
            label="Coach model"
            value={s.coachModel}
            onValueChange={(coachModel) => s.update({ coachModel })}
            options={[
              { value: "auto", label: "Auto" },
              { value: "sonnet", label: "Smart" },
              { value: "haiku", label: "Fast" },
            ]}
          />
        </Row>
        <Row id="usage" label="Coach use today" hint="The Coach arrives in a later update.">
          <span className="tabular text-lg font-bold" data-testid="ai-usage">
            0 messages
          </span>
        </Row>
      </Card>
    </div>
  );
}

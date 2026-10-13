"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Heart, PiggyBank, TriangleAlert, Volume2, VolumeX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Wick, type Mood } from "@/components/mascot/wick";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { ease } from "@/lib/motion";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/store/hydration";
import { ACCESSORIES, useProfile, type Accessory } from "@/store/profile";
import { useSettings } from "@/store/settings";

const STEPS = ["name", "look", "sound", "honest"] as const;
type Step = (typeof STEPS)[number];

const ACCESSORY_LABEL: Record<Accessory, string> = {
  none: "Plain",
  beanie: "Beanie",
  glasses: "Glasses",
  headband: "Headband",
};

function Bubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative rounded-3xl border-2 border-border bg-surface p-5 text-xl font-bold shadow-[0_3px_0_0_var(--border)]">
      {children}
    </div>
  );
}

export function OnboardingFlow() {
  const hydrated = useHydrated();
  const router = useRouter();
  const profile = useProfile();
  const settings = useSettings();
  const [index, setIndex] = useState(0);
  const step: Step = STEPS[index]!;

  const [name, setName] = useState<string | null>(null);
  const nameValue = name ?? profile.displayName;

  if (!hydrated) {
    return (
      <div className="grid min-h-dvh place-items-center" role="status">
        <Wick mood="sleepy" size={120} decorative />
      </div>
    );
  }

  const next = () => setIndex((i) => Math.min(STEPS.length - 1, i + 1));
  const back = () => setIndex((i) => Math.max(0, i - 1));

  const finish = () => {
    profile.update({ displayName: nameValue.trim() });
    profile.completeOnboarding();
    playSound("levelup");
    router.push("/");
  };

  const mood: Mood =
    step === "name" ? "wave" : step === "look" ? "cheer" : step === "sound" ? "happy" : "think";

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 py-6">
      {/* Progress dots */}
      <div
        className="flex items-center justify-center gap-2"
        role="progressbar"
        aria-label="Setup progress"
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-valuenow={index + 1}
      >
        {STEPS.map((s, i) => (
          <span
            key={s}
            className={cn(
              "h-3 rounded-full transition-all",
              i === index ? "w-10 bg-brand" : i < index ? "w-3 bg-brand" : "w-3 bg-border-strong",
            )}
          />
        ))}
      </div>

      <div className="flex flex-1 flex-col justify-center gap-6 py-6">
        <div className="flex justify-center">
          <Wick mood={mood} accessory={profile.accessory} name={profile.mascotName} size={170} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22, ease: ease.out }}
            className="space-y-5"
          >
            {step === "name" && (
              <>
                <Bubble>
                  Hi! I&apos;m {profile.mascotName}. I will help you learn about charts and trading.
                  What should I call you?
                </Bubble>
                <label className="block">
                  <span className="mb-2 block text-sm font-extrabold tracking-wide text-muted uppercase">
                    Your name
                  </span>
                  <Input
                    autoFocus
                    value={nameValue}
                    maxLength={30}
                    placeholder="Type your name"
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && next()}
                    autoComplete="given-name"
                  />
                </label>
              </>
            )}

            {step === "look" && (
              <>
                <Bubble>
                  Pick how I look{nameValue ? `, ${nameValue.trim()}` : ""}! You can change this
                  later.
                </Bubble>
                <Segmented
                  label="Mascot style"
                  value={profile.accessory}
                  onValueChange={(accessory) => profile.update({ accessory })}
                  options={ACCESSORIES.map((a) => ({ value: a, label: ACCESSORY_LABEL[a] }))}
                />
                <label className="block">
                  <span className="mb-2 block text-sm font-extrabold tracking-wide text-muted uppercase">
                    My name
                  </span>
                  <Input
                    value={profile.mascotName}
                    maxLength={20}
                    onChange={(e) => profile.update({ mascotName: e.target.value || "Wick" })}
                  />
                </label>
              </>
            )}

            {step === "sound" && (
              <>
                <Bubble>Do you like sounds? I have little chimes and cheers.</Bubble>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={settings.soundOn ? "primary" : "secondary"}
                    size="lg"
                    aria-pressed={settings.soundOn}
                    onClick={() => {
                      settings.update({ soundOn: true });
                      playSound("correct");
                    }}
                  >
                    <Volume2 /> Sounds on
                  </Button>
                  <Button
                    variant={!settings.soundOn ? "primary" : "secondary"}
                    size="lg"
                    aria-pressed={!settings.soundOn}
                    onClick={() => settings.update({ soundOn: false })}
                  >
                    <VolumeX /> Sounds off
                  </Button>
                </div>
                <p className="text-center text-muted">You can change this any time in Settings.</p>
              </>
            )}

            {step === "honest" && (
              <>
                <Bubble>Three honest things before we start:</Bubble>
                <ul className="space-y-3">
                  {[
                    {
                      icon: PiggyBank,
                      text: "You trade with pretend money. Nothing here can cost you real money.",
                    },
                    {
                      icon: TriangleAlert,
                      text: "In real life, most day traders lose money. We will show you why.",
                    },
                    {
                      icon: Heart,
                      text: "No hearts to lose! Mistakes never lock anything. Wrong answers just teach you.",
                    },
                  ].map(({ icon: Icon, text }) => (
                    <li
                      key={text}
                      className="flex items-start gap-3 rounded-2xl bg-surface-2 p-4 text-lg"
                    >
                      <Icon className="mt-0.5 size-7 shrink-0 text-brand" aria-hidden />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-3">
        {index > 0 && (
          <Button variant="secondary" size="lg" onClick={back}>
            Back
          </Button>
        )}
        {step === "honest" ? (
          <Button size="lg" block onClick={finish} data-testid="onboarding-finish">
            Let&apos;s go!
          </Button>
        ) : (
          <Button size="lg" block onClick={next} data-testid="onboarding-next">
            {step === "name" && !nameValue.trim() ? "Skip" : "Next"}
          </Button>
        )}
      </div>
    </div>
  );
}

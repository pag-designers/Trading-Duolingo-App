"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Wick } from "@/components/mascot/wick";
import { Button } from "@/components/ui/button";
import type { OutlineNode } from "@/lib/content/schema";
import { calcXp } from "@/lib/lesson/xp";
import { playSound } from "@/lib/sound";
import { useProfile } from "@/store/profile";
import { useProgress } from "@/store/progress";
import { ChestArt } from "./art";
import { Confetti } from "./confetti";
import { CountUp } from "./count-up";
import type { NextStep } from "./lesson-player";

/** A treasure chest: tap to open, get XP once. Opening it again later gives the small review bonus. */
export function ChestScreen({ node, next }: { node: OutlineNode; next: NextStep | null }) {
  const router = useRouter();
  const finishNode = useProgress((s) => s.finishNode);
  const mascotName = useProfile((s) => s.mascotName);
  const accessory = useProfile((s) => s.accessory);
  const [open, setOpen] = useState(false);
  const [repeat] = useState(() => useProgress.getState().nodes[node.id]?.status === "done");
  const xp = calcXp({
    nodeType: "chest",
    questionCount: 0,
    firstTryCorrect: 0,
    focusFills: 0,
    repeat,
  }).total;
  const recorded = useRef(false);

  useEffect(() => {
    if (!open || recorded.current) return;
    recorded.current = true;
    finishNode({ nodeId: node.id, score: 100, xp });
    playSound("levelup");
    playSound("cash");
  }, [open, finishNode, node.id, xp]);

  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-6 px-4 py-8 text-center"
      data-testid="chest"
      data-open={open}
    >
      {open && <Confetti count={44} seed={3} />}
      <div className="h-56">
        <ChestArt open={open} />
      </div>
      {!open ? (
        <>
          <h1 className="text-3xl">A treasure chest!</h1>
          <p className="text-xl text-muted">You worked hard. Open it to see what is inside.</p>
          <Button
            size="lg"
            variant="reward"
            onClick={() => {
              playSound("pop");
              setOpen(true);
            }}
            data-testid="open-chest"
          >
            Open the chest
          </Button>
        </>
      ) : (
        <>
          <Wick mood="cheer" accessory={accessory} size={110} name={mascotName} />
          <h1 className="text-3xl">{repeat ? "Welcome back!" : "Treasure!"}</h1>
          <p className="text-4xl font-black" data-testid="chest-xp">
            +<CountUp to={xp} /> XP
          </p>
          <div className="grid w-full gap-3">
            <Button size="lg" block onClick={() => router.push("/")} data-testid="finish-btn">
              Continue
            </Button>
            {next?.ready && (
              <Button
                size="lg"
                block
                variant="secondary"
                onClick={() => router.push(`/lesson/${next.id}`)}
              >
                Next: {next.title}
              </Button>
            )}
          </div>
        </>
      )}
    </main>
  );
}

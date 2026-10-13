"use client";

import { useState } from "react";
import { Splash } from "@/components/shell/splash";
import { useAppReady } from "@/components/shell/use-app-ready";
import type { GlossaryTerm, Lesson, Question } from "@/lib/content/lesson-schema";
import type { OutlineNode, OutlineUnit } from "@/lib/content/schema";
import { ChestScreen } from "./chest-screen";
import { GlossaryProvider, type LessonRefs } from "./glossary-context";
import { LessonPlayer, type NextStep } from "./lesson-player";

export interface LessonRouteProps {
  node: OutlineNode;
  unit: OutlineUnit;
  /** null for chests (they have no lesson file). */
  lesson: Lesson | null;
  poolSources: Question[][];
  terms: GlossaryTerm[];
  lessonRefs: LessonRefs;
  next: NextStep | null;
}

/** Client wrapper: waits for saved progress to load, then plays the lesson (or opens the chest). */
export function LessonRoute({
  node,
  unit,
  lesson,
  poolSources,
  terms,
  lessonRefs,
  next,
}: LessonRouteProps) {
  const ready = useAppReady();
  const [play, setPlay] = useState(0);
  if (!ready) return <Splash />;

  return (
    <GlossaryProvider terms={terms} lessons={lessonRefs}>
      {lesson ? (
        <LessonPlayer
          key={play}
          node={node}
          unit={unit}
          lesson={lesson}
          poolSources={poolSources}
          next={next}
          onRestart={() => setPlay((n) => n + 1)}
        />
      ) : (
        <ChestScreen node={node} next={next} />
      )}
    </GlossaryProvider>
  );
}

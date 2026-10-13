"use client";

import { motion } from "framer-motion";
import { Wick } from "@/components/mascot/wick";
import { Button } from "@/components/ui/button";
import type { Question } from "@/lib/content/lesson-schema";
import { correctAnswerText, type Grade } from "@/lib/lesson/grade";
import { cn } from "@/lib/utils";
import { RichText } from "./glossary-context";

const CHEERS = ["Nice!", "Great job!", "You got it!", "Yes!", "Super!"];

/**
 * What the learner sees after pressing Check. A miss is never punished: Wick stays kind, the right
 * answer and the reason are shown, and one more try comes at the end.
 */
export function FeedbackPanel({
  question,
  grade,
  retryQueued,
  cheerIndex,
  mascotName,
  onContinue,
}: {
  question: Question;
  grade: Grade;
  retryQueued: boolean;
  cheerIndex: number;
  mascotName: string;
  onContinue: () => void;
}) {
  const ok = grade.correct;
  return (
    <motion.section
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      role="status"
      aria-live="polite"
      data-testid="feedback"
      data-correct={ok}
      className={cn(
        "rounded-t-3xl border-2 border-b-0 px-5 pt-5 pb-6",
        ok
          ? "border-gain-press bg-gain-soft text-gain-text"
          : "border-loss-press bg-loss-soft text-loss-text",
      )}
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-3">
        <div className="flex items-center gap-3">
          <Wick mood={ok ? "cheer" : "oops"} size={56} name={mascotName} decorative />
          <h2 className="text-2xl" data-testid="feedback-title">
            {ok ? CHEERS[cheerIndex % CHEERS.length] : "Not quite. That is okay!"}
          </h2>
        </div>
        {!ok && (
          <p className="text-lg font-bold" data-testid="correct-answer">
            <span className="text-sm font-black tracking-wide uppercase">Right answer: </span>
            {correctAnswerText(question)}
          </p>
        )}
        {!ok && grade.partsTotal !== undefined && (
          <p className="text-base">
            You got {grade.partsRight} of {grade.partsTotal} right.
          </p>
        )}
        <p className="text-lg text-foreground" data-testid="explanation">
          <RichText text={question.explanation} />
        </p>
        {!ok && retryQueued && (
          <p className="text-base font-bold">You will get this one again at the end.</p>
        )}
        <Button
          size="lg"
          block
          variant={ok ? "primary" : "secondary"}
          onClick={onContinue}
          data-testid="continue-btn"
          autoFocus
        >
          Continue
        </Button>
      </div>
    </motion.section>
  );
}

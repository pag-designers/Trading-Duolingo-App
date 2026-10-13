"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useReducer, useState } from "react";
import { DemoChart } from "@/components/chart/demo-chart";
import { RiskReminder } from "@/components/risk-reminder";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import type { Lesson, Question } from "@/lib/content/lesson-schema";
import type { NodeType, OutlineNode, OutlineUnit } from "@/lib/content/schema";
import { isAnswerComplete, type Answer } from "@/lib/lesson/grade";
import { pickPoolQuestions } from "@/lib/lesson/pool";
import { buildSteps, progressFraction, sessionReducer, startSession } from "@/lib/lesson/session";
import { gentleShake } from "@/lib/motion";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { useProfile } from "@/store/profile";
import { Art } from "./art";
import { CompleteScreen } from "./complete-screen";
import { Confetti } from "./confetti";
import { FeedbackPanel } from "./feedback-panel";
import { FocusMeter } from "./focus-meter";
import { RichText } from "./glossary-context";
import { QuestionView } from "./question-views";

export interface NextStep {
  id: string;
  title: string;
  ready: boolean;
}

export interface LessonPlayerProps {
  node: OutlineNode;
  unit: OutlineUnit;
  lesson: Lesson;
  /** Questions of the lessons a practice or boss step draws from, one list per source lesson. */
  poolSources: Question[][];
  next: NextStep | null;
  /** The learner chose "Practice again": the route starts a fresh session. */
  onRestart: () => void;
}

const TYPE_LABEL: Record<Question["type"], string> = {
  mc: "Pick one",
  tf: "True or false",
  match: "Match",
  chart: "Chart spot",
  build: "Build",
  lab: "Chart lab",
};

/** Build the list of questions for this play: a lesson's own, plus a mix from earlier lessons for practice and boss steps. */
function questionsFor(lesson: Lesson, poolSources: Question[][]): Question[] {
  if (!lesson.pool) return lesson.questions;
  return pickPoolQuestions(poolSources, lesson.pool.perLesson, lesson.questions, Math.random);
}

export function LessonPlayer(props: LessonPlayerProps) {
  const { node, unit, lesson, poolSources, next, onRestart } = props;
  const router = useRouter();
  const mascotName = useProfile((s) => s.mascotName);
  const [state, dispatch] = useReducer(sessionReducer, undefined, () =>
    startSession(buildSteps(lesson.slides, questionsFor(lesson, poolSources))),
  );
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [shake, setShake] = useState(0);
  const [cheer, setCheer] = useState(0);

  const step = state.steps[state.index];
  const checked = state.phase === "feedback";
  const question = step?.kind === "question" ? step.question : null;
  const canCheck = !!question && !checked && isAnswerComplete(question, answer);

  const goNext = useCallback(() => {
    playSound("page");
    dispatch({ type: "next" });
  }, []);

  const check = useCallback(() => {
    if (!question || !answer || !isAnswerComplete(question, answer)) return;
    dispatch({ type: "submit", answer });
  }, [question, answer]);

  // Sounds, shake and confetti react to the graded answer.
  useEffect(() => {
    if (state.phase !== "feedback" || !state.last) return;
    if (state.last.grade.correct) {
      playSound("correct");
      setCheer((n) => n + 1);
      if (state.justFilled) playSound("pop");
    } else {
      playSound("wrong");
      setShake((n) => n + 1);
    }
  }, [state.phase, state.last, state.justFilled]);

  const goOn = useCallback(() => {
    setAnswer(null);
    dispatch({ type: "continue" });
  }, []);

  // Keyboard: Enter checks / continues; 1–4 picks an option.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // A control (an option, a candle) that already handled this key must not also trigger Check.
      if (e.defaultPrevented) return;
      if (leaving || (e.target as HTMLElement | null)?.closest("input, textarea, [role=dialog]"))
        return;
      if (state.phase === "done") return;
      if (e.key === "Enter") {
        if (state.phase === "feedback") goOn();
        else if (step?.kind === "slide") goNext();
        else if (canCheck) check();
        else return;
        e.preventDefault();
        return;
      }
      const n = Number(e.key);
      if (!question || checked || !Number.isInteger(n) || n < 1) return;
      if (question.type === "mc" && question.options[n - 1])
        setAnswer({ type: "mc", optionId: question.options[n - 1]!.id });
      else if (question.type === "tf" && n <= 2) setAnswer({ type: "tf", value: n === 1 });
      else if (question.type === "chart" && question.ask === "choice" && question.options?.[n - 1])
        setAnswer({ type: "chart", optionId: question.options[n - 1]!.id });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.phase, step, question, checked, canCheck, check, goNext, goOn, leaving]);

  if (state.phase === "done") {
    return (
      <CompleteScreen
        node={node}
        unit={unit}
        lesson={lesson}
        state={state}
        next={next}
        onRestart={onRestart}
      />
    );
  }

  const isFirst = state.index === 0;
  const fraction = progressFraction(state);

  return (
    <div
      className="flex min-h-dvh flex-col overflow-x-clip bg-background"
      data-testid="lesson-player"
      data-node={node.id}
      data-step={state.index}
    >
      <header className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Leave lesson"
          onClick={() => setLeaving(true)}
          data-testid="leave"
        >
          <X />
        </Button>
        <div
          role="progressbar"
          aria-label="Lesson progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(fraction * 100)}
          className="h-4 flex-1 overflow-hidden rounded-full bg-surface-2"
        >
          <motion.div
            className="h-full rounded-full bg-brand"
            animate={{ width: `${Math.max(4, fraction * 100)}%` }}
            transition={{ type: "spring", stiffness: 160, damping: 24 }}
          />
        </div>
        {lesson.questions.length > 0 || lesson.pool ? (
          <FocusMeter value={state.focus} justFilled={state.justFilled} />
        ) : null}
      </header>

      <main
        id="main"
        className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 pt-2 pb-6"
      >
        {lesson.touchesTrading && isFirst && <RiskReminder />}
        <AnimatePresence mode="wait">
          <motion.div
            key={state.index}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
            className="flex flex-1 flex-col gap-5"
          >
            {step?.kind === "slide" && (
              <div
                className="flex flex-1 flex-col items-center justify-center gap-5 text-center"
                data-testid="slide"
                data-step={state.index}
              >
                {step.slide.demo ? (
                  <DemoChart demo={step.slide.demo} />
                ) : (
                  step.slide.art && <Art name={step.slide.art} />
                )}
                {step.slide.title && <h1 className="text-3xl">{step.slide.title}</h1>}
                <p className="text-2xl leading-snug">
                  <RichText text={step.slide.text} />
                </p>
              </div>
            )}

            {step?.kind === "question" && (
              <motion.div
                key={shake}
                animate={shake ? gentleShake : undefined}
                className={cn("flex flex-col gap-5", checked && "pointer-events-auto")}
                data-testid="question"
                data-step={state.index}
                data-type={step.question.type}
                data-qid={step.question.id}
              >
                <div>
                  <p className="mb-2 text-base font-black tracking-wide text-brand uppercase">
                    {TYPE_LABEL[step.question.type]}
                    {step.retry && " · second try"}
                  </p>
                  <h1 className="text-2xl" data-testid="prompt">
                    <RichText text={step.question.prompt} />
                  </h1>
                </div>
                <QuestionView
                  q={step.question}
                  answer={answer}
                  onChange={setAnswer}
                  checked={checked}
                />
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="sticky bottom-0 z-20">
        {checked && state.last && question ? (
          <FeedbackPanel
            question={question}
            grade={state.last.grade}
            retryQueued={state.last.retryQueued}
            cheerIndex={cheer}
            mascotName={mascotName}
            onContinue={goOn}
          />
        ) : (
          <div className="border-t-2 border-border bg-background px-4 py-4">
            <div className="mx-auto max-w-2xl">
              {step?.kind === "slide" ? (
                <Button size="lg" block onClick={goNext} data-testid="slide-continue">
                  Continue
                </Button>
              ) : (
                <Button
                  size="lg"
                  block
                  disabled={!canCheck}
                  onClick={check}
                  data-testid="check-btn"
                  variant={canCheck ? "primary" : "secondary"}
                >
                  Check
                </Button>
              )}
            </div>
          </div>
        )}
      </footer>

      {state.justFilled && <Confetti count={20} seed={state.focusFills} />}

      <Sheet
        open={leaving}
        onOpenChange={setLeaving}
        title="Leave this lesson?"
        description="No worries. You can come back any time."
      >
        <div className="grid gap-3">
          <Button size="lg" block onClick={() => setLeaving(false)}>
            Keep going
          </Button>
          <Button
            size="lg"
            block
            variant="secondary"
            onClick={() => router.push("/")}
            data-testid="confirm-leave"
          >
            Leave
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

export type { NodeType };

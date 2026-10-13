"use client";

import Link from "next/link";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { Sheet } from "@/components/ui/sheet";
import type { GlossaryTerm } from "@/lib/content/lesson-schema";
import { buildMatcher, type TermMatcher } from "@/lib/glossary";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";

/** Where a term is taught: the lesson's title and whether that lesson is open yet. */
export type LessonRefs = Record<string, { title: string; ready: boolean }>;

interface GlossaryCtx {
  terms: Map<string, GlossaryTerm>;
  matcher: TermMatcher;
  open: (termId: string) => void;
}

const Ctx = createContext<GlossaryCtx | null>(null);

/** The card for one term. Used by the lesson sheet and the glossary page. */
export function TermCard({ term, lessons }: { term: GlossaryTerm; lessons: LessonRefs }) {
  const where = lessons[term.taughtIn];
  return (
    <div className="space-y-4" data-testid="term-card">
      <p className="text-xl font-bold">{term.definition}</p>
      <div className="rounded-2xl bg-surface-2 p-4">
        <p className="text-sm font-black tracking-wide text-muted uppercase">
          Think of it like this
        </p>
        <p className="text-lg">{term.analogy}</p>
      </div>
      <div className="rounded-2xl bg-brand-soft p-4">
        <p className="text-sm font-black tracking-wide text-brand uppercase">Example</p>
        <p className="text-lg">{term.example}</p>
      </div>
      {where && (
        <p className="flex flex-wrap items-center gap-x-1 text-base text-muted">
          Taught in{" "}
          {where.ready ? (
            <Link
              href={`/lesson/${term.taughtIn}`}
              className="inline-flex min-h-12 items-center font-bold text-brand underline underline-offset-4"
            >
              {where.title}
            </Link>
          ) : (
            <strong>{where.title}</strong>
          )}
          .
        </p>
      )}
    </div>
  );
}

/** Gives every <RichText> below it the glossary, and shows the card when a term is tapped. */
export function GlossaryProvider({
  terms,
  lessons,
  children,
}: {
  terms: GlossaryTerm[];
  lessons: LessonRefs;
  children: ReactNode;
}) {
  const value = useMemo<GlossaryCtx>(() => {
    const byId = new Map(terms.map((t) => [t.id, t]));
    return { terms: byId, matcher: buildMatcher(terms), open: () => {} };
  }, [terms]);
  const [openId, setOpenId] = useState<string | null>(null);
  const ctx = useMemo<GlossaryCtx>(
    () => ({
      ...value,
      open: (id) => {
        playSound("pop");
        setOpenId(id);
      },
    }),
    [value],
  );
  const term = openId ? value.terms.get(openId) : undefined;

  return (
    <Ctx.Provider value={ctx}>
      {children}
      <Sheet
        open={!!term}
        onOpenChange={(o) => !o && setOpenId(null)}
        title={term?.term ?? ""}
        description="A word from your lesson"
      >
        {term && <TermCard term={term} lessons={lessons} />}
      </Sheet>
    </Ctx.Provider>
  );
}

export function useGlossary(): GlossaryCtx | null {
  return useContext(Ctx);
}

/**
 * Text with glossary terms highlighted. Tap a highlighted word to see what it means.
 * Without a provider it renders plain text, so it is safe anywhere.
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  const g = useGlossary();
  const parts = useMemo(() => (g ? g.matcher.tokenize(text) : [{ text }]), [g, text]);
  return (
    <span className={className}>
      {parts.map((p, i) =>
        p.termId && g ? (
          <button
            key={i}
            type="button"
            data-testid={`term-${p.termId}`}
            onClick={() => g.open(p.termId!)}
            className={cn(
              "glossary-term inline cursor-pointer rounded-md px-0.5 font-bold text-brand",
              "underline decoration-brand/60 decoration-dotted decoration-2 underline-offset-4 hover:bg-brand-soft",
            )}
          >
            {p.text}
          </button>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </span>
  );
}

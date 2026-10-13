"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { TermCard, type LessonRefs } from "@/components/lesson/glossary-context";
import { Wick } from "@/components/mascot/wick";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import {
  ABBREVIATION_CATEGORIES,
  type Abbreviation,
  type GlossaryTerm,
} from "@/lib/content/lesson-schema";
import { cn } from "@/lib/utils";

type Tab = "words" | "short";
type Category = "all" | (typeof ABBREVIATION_CATEGORIES)[number];

const CATEGORY_LABEL: Record<Category, string> = {
  all: "All",
  company: "Company",
  market: "Market",
  chart: "Chart",
  news: "News",
  slang: "Slang",
};

const has = (haystack: string[], needle: string) =>
  haystack.some((h) => h.toLowerCase().includes(needle));

/** "u3-anatomy" → "Unit 3": for steps whose lesson is not open yet. */
const unitOf = (nodeId: string) => `Unit ${nodeId.match(/^u(\d)/)?.[1] ?? "?"}`;

function TaughtIn({ nodeId, lessons }: { nodeId: string; lessons: LessonRefs }) {
  const ref = lessons[nodeId];
  if (ref?.ready) {
    return (
      <Link
        href={`/lesson/${nodeId}`}
        className="inline-flex min-h-12 items-center font-bold text-brand underline underline-offset-4"
      >
        {ref.title}
      </Link>
    );
  }
  return (
    <span className="text-muted">
      {ref ? `${ref.title} (${unitOf(nodeId)}, coming)` : unitOf(nodeId)}
    </span>
  );
}

export function GlossaryScreen({
  terms,
  abbreviations,
  lessonRefs,
  initialTab = "words",
}: {
  terms: GlossaryTerm[];
  abbreviations: Abbreviation[];
  lessonRefs: LessonRefs;
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const q = query.trim().toLowerCase();

  const shownTerms = useMemo(
    () =>
      terms
        .filter((t) => !q || has([t.term, ...t.aliases, t.definition, t.analogy, t.example], q))
        .sort((a, b) => a.term.localeCompare(b.term, "en", { sensitivity: "base" })),
    [terms, q],
  );
  const shownAbbr = useMemo(
    () =>
      abbreviations
        .filter((a) => category === "all" || a.category === category)
        .filter((a) => !q || has([a.abbr, a.full, a.meaning, a.example], q))
        .sort((a, b) => a.abbr.localeCompare(b.abbr, "en", { sensitivity: "base" })),
    [abbreviations, q, category],
  );

  const count = tab === "words" ? shownTerms.length : shownAbbr.length;

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-6">
      <h1 className="text-3xl">Glossary</h1>
      <p className="text-lg text-muted">
        Every new word, in plain words. Tap a word in a lesson to see it here.
      </p>

      <Segmented<Tab>
        label="Glossary section"
        value={tab}
        onValueChange={(v) => {
          setTab(v);
          setQuery("");
        }}
        options={[
          { value: "words", label: `Words (${terms.length})` },
          { value: "short", label: `Short words (${abbreviations.length})` },
        ]}
      />

      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-6 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <Input
          type="search"
          aria-label={tab === "words" ? "Search words" : "Search short words"}
          placeholder={tab === "words" ? "Search words" : "Search short words, like EPS"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-12"
          data-testid="glossary-search"
        />
      </div>

      {tab === "short" && (
        <Segmented<Category>
          label="Filter by kind"
          value={category}
          onValueChange={setCategory}
          options={(["all", ...ABBREVIATION_CATEGORIES] as Category[]).map((c) => ({
            value: c,
            label: CATEGORY_LABEL[c],
          }))}
        />
      )}

      <p className="text-base text-muted" role="status" data-testid="glossary-count">
        {count}{" "}
        {tab === "words"
          ? count === 1
            ? "word"
            : "words"
          : count === 1
            ? "short word"
            : "short words"}
      </p>

      {count === 0 && (
        <div
          className="flex flex-col items-center gap-3 py-8 text-center"
          data-testid="glossary-empty"
        >
          <Wick mood="think" size={110} decorative />
          <p className="text-xl font-bold">No match. Try another word.</p>
        </div>
      )}

      {tab === "words" && (
        <ul className="grid gap-4 md:grid-cols-2" data-testid="term-list">
          {shownTerms.map((t) => (
            <li key={t.id}>
              <Card className="h-full space-y-3" data-term={t.id}>
                <h2 className="text-2xl">{t.term}</h2>
                <TermCard term={t} lessons={lessonRefs} />
              </Card>
            </li>
          ))}
        </ul>
      )}

      {tab === "short" && shownAbbr.length > 0 && (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table
              className="w-full border-separate border-spacing-y-2 text-left text-base"
              data-testid="abbr-table"
            >
              <caption className="sr-only">
                Short words, what they mean, and where they are taught
              </caption>
              <thead>
                <tr className="text-sm font-black tracking-wide text-muted uppercase">
                  <th scope="col" className="px-3 py-1">
                    Short word
                  </th>
                  <th scope="col" className="px-3 py-1">
                    Long form
                  </th>
                  <th scope="col" className="px-3 py-1">
                    What it means
                  </th>
                  <th scope="col" className="px-3 py-1">
                    Example
                  </th>
                  <th scope="col" className="px-3 py-1">
                    Taught in
                  </th>
                </tr>
              </thead>
              <tbody>
                {shownAbbr.map((a) => (
                  <tr key={a.abbr} className="bg-surface align-top" data-abbr={a.abbr}>
                    <th
                      scope="row"
                      className="rounded-l-2xl border-y-2 border-l-2 border-border px-3 py-3 text-lg font-black text-brand"
                    >
                      {a.abbr}
                    </th>
                    <td className="border-y-2 border-border px-3 py-3">{a.full}</td>
                    <td className="border-y-2 border-border px-3 py-3">{a.meaning}</td>
                    <td className="border-y-2 border-border px-3 py-3 text-muted">{a.example}</td>
                    <td className="rounded-r-2xl border-y-2 border-r-2 border-border px-3 py-3">
                      <TaughtIn nodeId={a.taughtIn} lessons={lessonRefs} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="grid gap-3 md:hidden" data-testid="abbr-list">
            {shownAbbr.map((a) => (
              <li key={a.abbr}>
                <Card className={cn("space-y-1")} data-abbr={a.abbr}>
                  <h2 className="text-2xl text-brand">{a.abbr}</h2>
                  <p className="text-sm font-bold tracking-wide text-muted uppercase">{a.full}</p>
                  <p className="text-lg">{a.meaning}</p>
                  <p className="text-base text-muted">Example: {a.example}</p>
                  <p className="flex flex-wrap items-center gap-x-1 text-base">
                    Taught in <TaughtIn nodeId={a.taughtIn} lessons={lessonRefs} />.
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

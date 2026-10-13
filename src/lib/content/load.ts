import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  abbreviationsSchema,
  glossarySchema,
  lessonSchema,
  type Abbreviations,
  type Glossary,
  type Lesson,
} from "./lesson-schema";
import { outlineSchema, type Outline } from "./schema";

export interface LoadedContent {
  outline: Outline | null;
  glossary: Glossary | null;
  abbreviations: Abbreviations | null;
  lessons: Lesson[];
  /** Files that could not be read or did not match their schema. Never thrown: callers decide how to react. */
  loadProblems: { file: string; message: string }[];
}

function readJsonFile(root: string, rel: string): { value?: unknown; problem?: string } {
  const full = join(root, rel);
  if (!existsSync(full)) return { problem: "file is missing" };
  try {
    return { value: JSON.parse(readFileSync(full, "utf8")) };
  } catch (e) {
    return { problem: `not valid JSON: ${(e as Error).message}` };
  }
}

const issues = (e: { issues: { path: PropertyKey[]; message: string }[] }): string =>
  e.issues
    .slice(0, 3)
    .map((i) => `${i.path.map(String).join(".") || "(root)"}: ${i.message}`)
    .join("; ");

/** Read and validate everything under /content. Pure Node (no Next.js), so agents, tests and pages can all use it. */
export function loadContent(root: string = process.cwd()): LoadedContent {
  const loadProblems: LoadedContent["loadProblems"] = [];

  const load = <T>(
    rel: string,
    parse: (
      v: unknown,
    ) =>
      | { success: true; data: T }
      | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } },
  ): T | null => {
    const { value, problem } = readJsonFile(root, rel);
    if (problem) {
      loadProblems.push({ file: rel, message: problem });
      return null;
    }
    const parsed = parse(value);
    if (!parsed.success) {
      loadProblems.push({ file: rel, message: issues(parsed.error) });
      return null;
    }
    return parsed.data;
  };

  const outline = load("content/outline.json", (v) => outlineSchema.safeParse(v));
  const glossary = load("content/glossary.json", (v) => glossarySchema.safeParse(v));
  const abbreviations = load("content/abbreviations.json", (v) => abbreviationsSchema.safeParse(v));

  const lessons: Lesson[] = [];
  const dir = join(root, "content", "lessons");
  if (existsSync(dir)) {
    for (const name of readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .sort()) {
      const rel = `content/lessons/${name}`;
      const lesson = load(rel, (v) => lessonSchema.safeParse(v));
      if (lesson) {
        if (`${lesson.id}.json` !== name)
          loadProblems.push({ file: rel, message: `file name must be ${lesson.id}.json` });
        lessons.push(lesson);
      }
    }
  }
  return { outline, glossary, abbreviations, lessons, loadProblems };
}

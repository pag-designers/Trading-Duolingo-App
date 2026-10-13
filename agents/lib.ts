import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import type { Check, Status } from "./types";

export const pass = (id: string, title: string, detail: string): Check => ({
  id,
  title,
  status: "green",
  detail,
});
export const warn = (id: string, title: string, detail: string): Check => ({
  id,
  title,
  status: "amber",
  detail,
});
export const fail = (id: string, title: string, detail: string): Check => ({
  id,
  title,
  status: "red",
  detail,
});
/** A placeholder for a check that arrives in a later checkpoint. Never green. */
export const stub = (id: string, title: string, arrivesIn: string): Check => ({
  id,
  title,
  status: "amber",
  stub: true,
  detail: `Not built yet — arrives in ${arrivesIn}.`,
});

export function worst(statuses: Status[]): Status {
  if (statuses.includes("red")) return "red";
  if (statuses.includes("amber")) return "amber";
  return "green";
}

export function readText(root: string, path: string): string | null {
  const full = join(root, path);
  return existsSync(full) ? readFileSync(full, "utf8") : null;
}

export function readJson(root: string, path: string): unknown {
  const text = readText(root, path);
  if (text === null) return undefined;
  return JSON.parse(text);
}

/** All files under `dir` (relative to root) matching the extension filter. */
export function listFiles(root: string, dir: string, exts: string[] = []): string[] {
  const base = join(root, dir);
  if (!existsSync(base)) return [];
  const out: string[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      if (name === "node_modules" || name === ".next" || name === "generated") continue;
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (exts.length === 0 || exts.some((e) => name.endsWith(e)))
        out.push(relative(root, full));
    }
  };
  walk(base);
  return out.sort();
}

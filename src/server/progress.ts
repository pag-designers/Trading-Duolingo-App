import "server-only";
import {
  mergeProgress,
  type DayActivity,
  type NodeRecord,
  type NodeStatus,
  type ProgressState,
} from "@/lib/progress";
import { db, LOCAL_USER_ID } from "./db";

async function ensureUser(): Promise<void> {
  await db.user.upsert({ where: { id: LOCAL_USER_ID }, update: {}, create: { id: LOCAL_USER_ID } });
}

/** Read the learner's progress from the database. Total XP is derived from the daily rows. */
export async function readProgress(): Promise<ProgressState> {
  const [nodes, days] = await Promise.all([
    db.nodeProgress.findMany({ where: { userId: LOCAL_USER_ID } }),
    db.dailyActivity.findMany({ where: { userId: LOCAL_USER_ID } }),
  ]);
  const out: ProgressState = { totalXp: 0, days: {}, nodes: {} };
  for (const d of days) {
    const day: DayActivity = { xp: d.xp, lessonsDone: d.lessonsDone };
    if (d.freezeEarned) day.freezeEarned = true;
    if (d.freezeUsed) day.frozen = true;
    out.days[d.date] = day;
    out.totalXp += d.xp;
  }
  for (const n of nodes) {
    const rec: NodeRecord = {
      status: n.status as NodeStatus,
      bestScore: n.bestScore,
      attempts: n.attempts,
      completedAt: n.completedAt?.toISOString() ?? null,
    };
    out.nodes[n.nodeId] = rec;
  }
  return out;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * One merge at a time. A merge reads the stored rows, combines them in memory and writes them back, so two
 * overlapping ones (two tabs) could each miss the other's change. Candlo is one local server process, so a
 * simple queue is enough to keep "progress only grows" true.
 */
let queue: Promise<unknown> = Promise.resolve();
function inOrder<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  queue = run.catch(() => undefined);
  return run;
}

/**
 * Merge incoming progress into what is stored (progress only grows, so this is lossless and
 * order-independent), save only the rows that changed, and return the merged result.
 */
export function mergeAndWriteProgress(incoming: ProgressState): Promise<ProgressState> {
  return inOrder(() => mergeAndWrite(incoming));
}

async function mergeAndWrite(incoming: ProgressState): Promise<ProgressState> {
  await ensureUser();
  const stored = await readProgress();
  const merged = mergeProgress(stored, incoming);

  const writes = [];
  for (const [date, day] of Object.entries(merged.days)) {
    if (same(day, stored.days[date])) continue;
    const data = {
      xp: day.xp,
      lessonsDone: day.lessonsDone,
      freezeEarned: !!day.freezeEarned,
      freezeUsed: !!day.frozen,
    };
    writes.push(
      db.dailyActivity.upsert({
        where: { userId_date: { userId: LOCAL_USER_ID, date } },
        update: data,
        create: { userId: LOCAL_USER_ID, date, ...data },
      }),
    );
  }
  for (const [nodeId, n] of Object.entries(merged.nodes)) {
    if (same(n, stored.nodes[nodeId])) continue;
    const data = {
      status: n.status,
      bestScore: n.bestScore,
      attempts: n.attempts,
      completedAt: n.completedAt ? new Date(n.completedAt) : null,
    };
    writes.push(
      db.nodeProgress.upsert({
        where: { userId_nodeId: { userId: LOCAL_USER_ID, nodeId } },
        update: data,
        create: { userId: LOCAL_USER_ID, nodeId, ...data },
      }),
    );
  }
  if (writes.length > 0) await db.$transaction(writes);
  return merged;
}

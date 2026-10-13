import "server-only";
import { meSchema, type Me } from "@/lib/me-schema";
import { db, LOCAL_USER_ID } from "./db";

async function ensureUser(): Promise<void> {
  await db.user.upsert({ where: { id: LOCAL_USER_ID }, update: {}, create: { id: LOCAL_USER_ID } });
  // Create the 1:1 rows separately so a half-created user (interrupted first run) self-repairs.
  await db.profile.upsert({
    where: { userId: LOCAL_USER_ID },
    update: {},
    create: { userId: LOCAL_USER_ID },
  });
  await db.settings.upsert({
    where: { userId: LOCAL_USER_ID },
    update: {},
    create: { userId: LOCAL_USER_ID },
  });
}

const findRows = () =>
  Promise.all([
    db.profile.findUnique({ where: { userId: LOCAL_USER_ID } }),
    db.settings.findUnique({ where: { userId: LOCAL_USER_ID } }),
  ]);

/** Read the learner's profile + settings, creating the local user's rows only when they are missing. */
export async function readMe(): Promise<Me> {
  let [p, s] = await findRows();
  if (!p || !s) {
    await ensureUser();
    [p, s] = await findRows();
  }
  if (!p || !s) throw new Error("Could not create the local user's profile and settings.");
  return meSchema.parse({
    profile: {
      displayName: p.displayName,
      mascotName: p.mascotName,
      accessory: p.accessory,
      onboardedAt: p.onboardedAt?.toISOString() ?? null,
      updatedAt: p.updatedAt.toISOString(),
    },
    settings: {
      theme: s.theme,
      soundOn: s.soundOn,
      volume: s.volume,
      reducedMotion: s.reducedMotion,
      readingMode: s.readingMode,
      dailyXpGoal: s.dailyXpGoal,
      startingBalanceCents: s.startingBalanceCents,
      pdtEnabled: s.pdtEnabled,
      slippageBps: s.slippageBps,
      commissionCents: s.commissionCents,
      coachModel: s.coachModel,
      updatedAt: s.updatedAt.toISOString(),
    },
  });
}

/**
 * Last-write-wins per section. Each update is one conditional statement (`updatedAt <= incoming`), so
 * two overlapping writes can never let the older one overwrite the newer. Returns what is stored.
 */
export async function writeMe(incoming: Me): Promise<Me> {
  await readMe(); // makes sure the rows exist before the conditional updates
  const { profile, settings } = incoming;

  await db.profile.updateMany({
    where: { userId: LOCAL_USER_ID, updatedAt: { lte: new Date(profile.updatedAt) } },
    data: {
      displayName: profile.displayName,
      mascotName: profile.mascotName,
      accessory: profile.accessory,
      onboardedAt: profile.onboardedAt ? new Date(profile.onboardedAt) : null,
      updatedAt: new Date(profile.updatedAt),
    },
  });
  await db.settings.updateMany({
    where: { userId: LOCAL_USER_ID, updatedAt: { lte: new Date(settings.updatedAt) } },
    data: { ...settings, updatedAt: new Date(settings.updatedAt) },
  });
  return readMe();
}

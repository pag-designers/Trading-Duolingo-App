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

/** Read the learner's profile + settings (creating the local user on first run). */
export async function readMe(): Promise<Me> {
  await ensureUser();
  const [p, s] = await Promise.all([
    db.profile.findUniqueOrThrow({ where: { userId: LOCAL_USER_ID } }),
    db.settings.findUniqueOrThrow({ where: { userId: LOCAL_USER_ID } }),
  ]);
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
 * Last-write-wins per section: an incoming section replaces the stored one only if its
 * `updatedAt` is not older. Returns the state that is stored afterwards.
 */
export async function writeMe(incoming: Me): Promise<Me> {
  const current = await readMe();
  const { profile, settings } = incoming;

  if (profile.updatedAt >= current.profile.updatedAt) {
    await db.profile.update({
      where: { userId: LOCAL_USER_ID },
      data: {
        displayName: profile.displayName,
        mascotName: profile.mascotName,
        accessory: profile.accessory,
        onboardedAt: profile.onboardedAt ? new Date(profile.onboardedAt) : null,
        updatedAt: new Date(profile.updatedAt),
      },
    });
  }
  if (settings.updatedAt >= current.settings.updatedAt) {
    await db.settings.update({
      where: { userId: LOCAL_USER_ID },
      data: { ...settings, updatedAt: new Date(settings.updatedAt) },
    });
  }
  return readMe();
}

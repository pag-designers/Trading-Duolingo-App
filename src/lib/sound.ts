"use client";

import { Howl } from "howler";
import { useSettings } from "@/store/settings";

export const SOUND_NAMES = [
  "correct",
  "wrong",
  "levelup",
  "streak",
  "cash",
  "thud",
  "page",
  "tap",
  "pop",
] as const;
export type SoundName = (typeof SOUND_NAMES)[number];

const cache = new Map<SoundName, Howl>();

function howl(name: SoundName): Howl {
  let h = cache.get(name);
  if (!h) {
    h = new Howl({ src: [`/sounds/${name}.wav`], preload: true, html5: false });
    cache.set(name, h);
  }
  return h;
}

/** Whether a sound should play right now. Pure so it can be unit-tested. */
export function shouldPlay(s: { soundOn: boolean; volume: number }): boolean {
  return s.soundOn && s.volume > 0;
}

/** Play a sound effect, honouring the mute toggle and volume setting. Safe to call anywhere. */
export function playSound(name: SoundName): void {
  if (typeof window === "undefined") return;
  const { soundOn, volume } = useSettings.getState();
  if (!shouldPlay({ soundOn, volume })) return;
  try {
    const h = howl(name);
    h.volume(Math.min(1, Math.max(0, volume / 100)));
    h.play();
  } catch {
    /* audio can be blocked until the first user gesture — never break the UI over it */
  }
}

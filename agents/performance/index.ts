import { statSync } from "node:fs";
import { join } from "node:path";
import { fail, listFiles, pass, stub } from "../lib";
import type { Agent, Check } from "../types";

const SOUND_TOTAL_KB = 400;
const SOUND_EACH_KB = 100;

export const performance: Agent = {
  id: "performance",
  name: "Performance",
  job: "Asset budgets now; Lighthouse, chart render time and frame drops later.",
  async run({ root }) {
    const checks: Check[] = [];
    const sounds = listFiles(root, "public/sounds", [".wav", ".mp3", ".ogg"]);
    const sizes = sounds.map((f) => ({ f, kb: statSync(join(root, f)).size / 1024 }));
    const total = sizes.reduce((n, s) => n + s.kb, 0);
    const big = sizes.filter((s) => s.kb > SOUND_EACH_KB);
    checks.push(
      sounds.length === 0
        ? fail(
            "sound-budget",
            "Sound files within budget",
            "No sound files found in public/sounds.",
          )
        : big.length > 0 || total > SOUND_TOTAL_KB
          ? fail(
              "sound-budget",
              "Sound files within budget",
              `${big.map((b) => `${b.f} is ${b.kb.toFixed(0)} KB`).join(", ") || ""} total ${total.toFixed(0)} KB (limit ${SOUND_TOTAL_KB} KB, ${SOUND_EACH_KB} KB each)`.trim(),
            )
          : pass(
              "sound-budget",
              "Sound files within budget",
              `${sounds.length} files, ${total.toFixed(0)} KB total.`,
            ),
    );
    checks.push(stub("lighthouse", "Lighthouse LCP < 2.5 s on a mid-range phone profile", "CP8"));
    checks.push(stub("chart-10k", "Chart renders 10,000 candles quickly", "CP2"));
    checks.push(stub("frames", "Animations hold 60 fps", "CP8"));
    checks.push(stub("bundle", "JavaScript bundle size budget", "CP8"));
    checks.push(stub("ai-latency", "Coach response latency tracked", "CP6"));
    return checks;
  },
};

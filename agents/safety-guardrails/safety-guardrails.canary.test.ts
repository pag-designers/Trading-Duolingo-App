import { describe, expect, it } from "vitest";
import { fixture, run } from "../testing";
import { REQUIRED_DISCLAIMERS, safetyGuardrails } from ".";

const files = [
  ...REQUIRED_DISCLAIMERS.map((d) => d.file),
  "src/lib/copy.ts",
  "src/components/risk-reminder.tsx",
];

describe("Safety & Guardrails canary", () => {
  it("control: the real screens pass", async () => {
    const r = await run(safetyGuardrails, fixture(files));
    expect(r.checks.find((c) => c.id === "disclaimers")?.status).toBe("green");
    expect(r.status).not.toBe("red");
  });

  it("catches a trade screen with the risk reminder removed", async () => {
    const r = await run(
      safetyGuardrails,
      fixture(files, {
        "src/app/(app)/trade-lab/page.tsx": "export default function P(){return <p>Trade now!</p>}",
      }),
    );
    expect(r.status).toBe("red");
    expect(r.checks.find((c) => c.id === "disclaimers")?.detail).toMatch(/trade-lab/);
  });

  it("catches an out-of-hearts screen (unlimited hearts rule)", async () => {
    const r = await run(
      safetyGuardrails,
      fixture(files, {
        "src/components/oops.tsx": "export const A = () => <p>You are out of hearts!</p>;",
      }),
    );
    expect(r.checks.find((c) => c.id === "no-hearts-lockout")?.status).toBe("red");
  });

  it("catches copy that claims the data is live", async () => {
    const r = await run(
      safetyGuardrails,
      fixture(files, {
        "src/components/live.tsx": "export const A = () => <p>Watch live market data now</p>;",
      }),
    );
    expect(r.checks.find((c) => c.id === "no-live-claims")?.status).toBe("red");
  });

  it("allows an honest 'not live' sentence", async () => {
    const r = await run(
      safetyGuardrails,
      fixture(files, {
        "src/components/ok.tsx": "export const A = () => <p>This is not live data.</p>;",
      }),
    );
    expect(r.checks.find((c) => c.id === "no-live-claims")?.status).toBe("green");
  });

  it("accepts the shared <RiskReminder /> component in place of the sentence", async () => {
    const r = await run(
      safetyGuardrails,
      fixture(files, {
        "src/app/(app)/trade-lab/page.tsx": "export default function P(){return <RiskReminder />}",
      }),
    );
    expect(r.checks.find((c) => c.id === "disclaimers")?.detail ?? "").not.toMatch(/trade-lab/);
  });

  it("catches a shared reminder text that no longer says the real thing", async () => {
    const r = await run(
      safetyGuardrails,
      fixture(files, { "src/lib/copy.ts": 'export const RISK_REMINDER = "Have fun!";' }),
    );
    expect(r.checks.find((c) => c.id === "disclaimers")?.status).toBe("red");
    expect(r.checks.find((c) => c.id === "disclaimers")?.detail).toMatch(/copy\.ts/);
  });
});

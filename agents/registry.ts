import { accessibilityUx } from "./accessibility-ux";
import { curriculumAuditor } from "./curriculum-auditor";
import { dataIntegrity } from "./data-integrity";
import { financialAccuracy } from "./financial-accuracy";
import { pedagogy } from "./pedagogy";
import { performance } from "./performance";
import { safetyGuardrails } from "./safety-guardrails";
import type { Agent } from "./types";

/** Every agent except the Orchestrator (which runs these). */
export const AGENTS: Agent[] = [
  curriculumAuditor,
  financialAccuracy,
  safetyGuardrails,
  pedagogy,
  accessibilityUx,
  performance,
  dataIntegrity,
];

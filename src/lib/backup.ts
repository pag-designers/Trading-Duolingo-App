import { useProfile } from "@/store/profile";
import { useProgress } from "@/store/progress";
import { useSettings } from "@/store/settings";

export interface BackupFile {
  app: "candlo";
  version: 1;
  exportedAt: string;
  profile: Record<string, unknown>;
  settings: Record<string, unknown>;
  progress: Record<string, unknown>;
}

/** Strip functions so only plain data ends up in the backup. */
function plain<T extends object>(state: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(state).filter(([, v]) => typeof v !== "function"));
}

export function buildBackup(now = new Date()): BackupFile {
  return {
    app: "candlo",
    version: 1,
    exportedAt: now.toISOString(),
    profile: plain(useProfile.getState()),
    settings: plain(useSettings.getState()),
    progress: plain(useProgress.getState()),
  };
}

/** Download a JSON backup of everything the learner has done (browser only). */
export function downloadBackup(): void {
  const blob = new Blob([JSON.stringify(buildBackup(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `candlo-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke later: some browsers start reading the blob after click() returns.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

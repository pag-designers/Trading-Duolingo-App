import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": r("./src"), "@agents": r("./agents"), "@content": r("./content") } },
  test: {
    // Component tests opt into jsdom with a `// @vitest-environment jsdom` comment at the top of the file.
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "agents/**/*.test.ts", "scripts/**/*.test.ts"],
    coverage: { provider: "v8", include: ["src/lib/**", "src/store/**", "agents/**"] },
  },
});

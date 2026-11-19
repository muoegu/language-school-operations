import { bindings, defineConfig } from "cf/config";

import * as entrypoint from "./src/worker.ts" with { type: "cf-worker" };

export default defineConfig(() => ({
  worker: {
    name: "portfolio-system-api",
    entrypoint,
    // Keep this at the newest date supported by the pinned local workerd.
    // Update when the cf/Vite runtime is upgraded.
    compatibilityDate: "2026-11-17",
    compatibilityFlags: ["nodejs_compat"],
    workersDev: true,
    env: {
      DATABASE_URL: bindings.secret(),
      NODE_ENV: bindings.text("production"),
    },
    observability: {
      enabled: true,
      logs: {
        enabled: true,
        headSamplingRate: 1,
      },
      traces: {
        enabled: true,
        headSamplingRate: 0.01,
      },
    },
  },
}));

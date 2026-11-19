import { bindings, defineConfig } from 'cf/config'

import * as entrypoint from '../api/src/worker.ts' with { type: 'cf-worker' }

export default defineConfig(() => ({
  worker: {
    name: 'portfolio-system',
    entrypoint,
    // Keep this aligned with the newest date supported by the pinned local workerd.
    compatibilityDate: '2026-11-17',
    compatibilityFlags: ['nodejs_compat'],
    workersDev: true,
    domains: ['portfolio.muoegu.org'],
    assets: {
      notFoundHandling: 'single-page-application',
      runWorkerFirst: ['/api/*'],
    },
    env: {
      DATABASE_URL: bindings.secret(),
      DEMO_SESSION_SECRET: bindings.secret(),
      NODE_ENV: bindings.text('production'),
      ASSETS: bindings.assets(),
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
}))

import type { DatabaseEnv } from "./db/client.js";

type AssetsBinding = {
  fetch(request: Request, init?: RequestInit): Promise<Response>;
};

export type AppEnv = {
  Variables: {
    requestId: string;
  };
  Bindings: DatabaseEnv & {
    NODE_ENV?: string;
    CORS_ORIGIN?: string;
    DEMO_SESSION_SECRET?: string;
    ASSETS?: AssetsBinding;
  };
};

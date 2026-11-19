import app from "./app.js";
import type { AppEnv } from "./types.js";

const apiPrefix = "/api/v1";

export default {
  async fetch(request: Request, env: AppEnv["Bindings"]): Promise<Response> {
    const url = new URL(request.url);
    const hasApiPrefix =
      url.pathname === apiPrefix || url.pathname.startsWith(`${apiPrefix}/`);

    if (hasApiPrefix) {
      url.pathname = url.pathname.slice(apiPrefix.length) || "/";
      return await app.fetch(new Request(url, request), env);
    }

    if (env.ASSETS) {
      return await env.ASSETS.fetch(request);
    }

    return await app.fetch(request, env);
  },
};

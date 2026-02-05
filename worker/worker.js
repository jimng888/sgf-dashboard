/**
 * Cloudflare Worker entry: Hono app. D1 + Google OAuth + embedded views.
 */
import { createWorkerApp } from './worker-hono.mjs';

const app = createWorkerApp();

export default {
  async fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  },
};

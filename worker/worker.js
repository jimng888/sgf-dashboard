/**
 * Cloudflare Worker entry: Hono app. D1 + Google OAuth + embedded views.
 */
import { createWorkerApp } from './worker-hono.mjs';

const app = createWorkerApp();

export default {
  async fetch(request, env, ctx) {
    try {
      return await app.fetch(request, env, ctx);
    } catch (err) {
      const message = err?.message || String(err);
      return new Response(
        `Internal Server Error:\n${message}`,
        { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }
  },
};

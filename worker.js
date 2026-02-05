/**
 * Cloudflare Worker entry: runs the full Express dashboard (D1 + Google OAuth).
 * Build: run "node scripts/embed-worker-assets.js" then deploy.
 */
import { createServer } from 'node:http';
import { handleAsNodeRequest } from 'cloudflare:node';
import { createApp } from './app-worker.mjs';

export default {
  async fetch(request, env, ctx) {
    const app = createApp(env);
    const server = createServer(app);
    await new Promise((resolve, reject) => {
      server.listen(0, () => resolve());
      server.on('error', reject);
    });
    const port = server.address().port;
    try {
      return await handleAsNodeRequest(port, request);
    } finally {
      server.close();
    }
  },
};

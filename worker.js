/**
 * Minimal Cloudflare Worker entry. Returns a placeholder.
 * The full dashboard (Express + SQLite) runs on Node/Railway.
 * To run the full app on Workers you need to migrate to D1 + Express-on-Workers
 * (see DEPLOY-CLOUDFLARE.md and https://developers.cloudflare.com/workers/tutorials/deploy-an-express-app/).
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(
        JSON.stringify({
          ok: true,
          message: 'SGF Team Dashboard Worker (placeholder). For full app, use Railway or migrate to D1 + Express.',
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    return new Response('Not Found', { status: 404 });
  },
};

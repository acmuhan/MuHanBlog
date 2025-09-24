import type { APIRoute } from "astro";

// Proxy endpoint to fetch per-page stats from Umami API
// Required envs:
//  - UMAMI_API_URL (e.g. https://cloud.umami.is)
//  - UMAMI_WEBSITE_ID (UUID)
//  - UMAMI_API_TOKEN (Bearer token)

// Note: Kept for local dev only. On EdgeOne Pages, use node-functions/api/stats.js
export const GET: APIRoute = async () =>
	new Response(
		JSON.stringify({
			error:
				"Disabled on static hosting. Use EdgeOne Node Functions at /api/stats.",
		}),
		{ status: 404, headers: { "content-type": "application/json" } },
	);

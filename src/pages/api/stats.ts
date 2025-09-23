import type { APIRoute } from "astro";

// Proxy endpoint to fetch per-page stats from Umami API
// Required envs:
//  - UMAMI_API_URL (e.g. https://cloud.umami.is)
//  - UMAMI_WEBSITE_ID (UUID)
//  - UMAMI_API_TOKEN (Bearer token)

export const GET: APIRoute = async ({ url }) => {
	const targetUrl = url.searchParams.get("url");
	if (!targetUrl) {
		return new Response(JSON.stringify({ error: "Missing url parameter" }), {
			status: 400,
		});
	}

	const apiBase = import.meta.env.UMAMI_API_URL || "https://cloud.umami.is";
	const websiteId = import.meta.env.UMAMI_WEBSITE_ID;
	const token = import.meta.env.UMAMI_API_TOKEN;

	if (!websiteId || !token) {
		return new Response(JSON.stringify({ error: "Server not configured" }), {
			status: 500,
		});
	}

	// Fetch pageviews for the specific URL
	// Umami v2 metrics endpoint supports filtering by url
	const metricsEndpoint = `${apiBase}/api/websites/${websiteId}/metrics?type=pageviews&url=${encodeURIComponent(
		targetUrl,
	)}`;

	try {
		const resp = await fetch(metricsEndpoint, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});
		if (!resp.ok) {
			return new Response(JSON.stringify({ error: "Upstream error" }), {
				status: 502,
			});
		}
		const data = await resp.json();
		return new Response(JSON.stringify(data), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	} catch (_e) {
		return new Response(JSON.stringify({ error: "Request failed" }), {
			status: 500,
		});
	}
};

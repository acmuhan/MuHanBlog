// EdgeOne Pages - Node Functions
// Docs: https://edgeone.cloud.tencent.com/pages/document/185234005644472320

export default async function onRequest(context) {
	try {
		const { request } = context;

		// Debug: Check what request.url contains
		console.log("[DEBUG] request.url:", request.url);
		console.log("[DEBUG] typeof request.url:", typeof request.url);

		// Try to create URL object safely
		let url;
		try {
			// EdgeOne Pages provides relative URLs, need to construct full URL
			// Check different ways to get host
			let host = "blog.muhan.wiki"; // fallback

			if (request.headers && typeof request.headers.get === "function") {
				host = request.headers.get("host") || host;
			} else if (request.headers?.host) {
				host = request.headers.host;
			} else if (context.env?.HOST) {
				host = context.env.HOST;
			}

			const fullUrl = `https://${host}${request.url}`;
			console.log("[DEBUG] constructed fullUrl:", fullUrl);
			console.log("[DEBUG] host source:", host);
			url = new URL(fullUrl);
		} catch (urlError) {
			return new Response(
				JSON.stringify({
					error: "URL parsing failed",
					requestUrl: request.url,
					urlError: urlError.message,
					requestHeaders: request.headers,
					contextKeys: Object.keys(context),
				}),
				{
					status: 400,
					headers: { "content-type": "application/json" },
				},
			);
		}

		const targetUrl = url.searchParams.get("url");
		const debug = url.searchParams.get("debug") === "1";

		if (!targetUrl) {
			return new Response(JSON.stringify({ error: "Missing url parameter" }), {
				status: 400,
				headers: { "content-type": "application/json" },
			});
		}

		const websiteId = process.env.UMAMI_WEBSITE_ID;
		const token = process.env.UMAMI_API_TOKEN;

		if (!websiteId || !token) {
			return new Response(
				JSON.stringify({
					error: "Server not configured",
					haveWebsiteId: !!websiteId,
					haveToken: !!token,
				}),
				{
					status: 500,
					headers: { "content-type": "application/json" },
				},
			);
		}

		const endAt = Date.now();
		const startAt = endAt - 30 * 24 * 60 * 60 * 1000; // last 30 days

		const isApiKey = typeof token === "string" && token.startsWith("api_");
		const headersV1 = isApiKey
			? { "x-umami-api-key": token, Accept: "application/json" }
			: { Authorization: `Bearer ${token}`, Accept: "application/json" };
		const headersV2 = {
			Authorization: `Bearer ${token}`,
			Accept: "application/json",
		};

		// Prefer v1 stats (Umami Cloud), fallback to legacy /api stats
		const v1Stats = `https://api.umami.is/v1/websites/${encodeURIComponent(websiteId)}/stats?startAt=${startAt}&endAt=${endAt}&url=${encodeURIComponent(
			targetUrl,
		)}`;
		const v2Stats = `${process.env.UMAMI_API_URL || "https://cloud.umami.is"}/api/websites/${encodeURIComponent(websiteId)}/stats?startAt=${startAt}&endAt=${endAt}&url=${encodeURIComponent(
			targetUrl,
		)}`;

		console.log("[stats] Attempting v1 fetch to:", v1Stats);
		console.log("[stats] Headers:", headersV1);

		let mode = "v1";
		let res;
		try {
			res = await fetch(v1Stats, { headers: headersV1 });
			console.log("[stats] v1 response status:", res.status);
			if (!res.ok) {
				console.log("[stats] v1 failed", res.status);
				mode = "v2";
				console.log("[stats] Attempting v2 fetch to:", v2Stats);
				res = await fetch(v2Stats, { headers: headersV2 });
				console.log("[stats] v2 response status:", res.status);
			}
		} catch (err) {
			console.log("[stats] Fetch error:", err.message);
			return new Response(
				JSON.stringify({
					error: "Fetch failed",
					message: String(err?.message || err),
				}),
				{
					status: 502,
					headers: { "content-type": "application/json" },
				},
			);
		}

		if (!res.ok) {
			const body = await res.text().catch(() => "");
			return new Response(
				JSON.stringify({
					error: "Upstream error",
					status: res.status,
					body: body.slice(0, 200),
					mode,
				}),
				{ status: 502, headers: { "content-type": "application/json" } },
			);
		}

		const raw = await res.text();
		let data = {};
		try {
			data = JSON.parse(raw);
		} catch {}

		// Handle different response formats from Umami API
		const toNumber = (v) => {
			if (typeof v === "number") return v;
			if (v?.value !== undefined) return Number(v.value);
			if (v?.count !== undefined) return Number(v.count);
			return Number(v || 0);
		};

		// Extract pageviews and visitors from different possible response formats
		let pageviews = 0;
		let visitors = 0;

		if (data?.pageviews !== undefined) {
			pageviews = toNumber(data.pageviews);
		} else if (data?.stats?.pageviews !== undefined) {
			pageviews = toNumber(data.stats.pageviews);
		} else if (Array.isArray(data) && data.length > 0) {
			// Handle array response format
			pageviews = data.reduce((sum, item) => sum + toNumber(item.pageviews), 0);
		}

		if (data?.visitors !== undefined) {
			visitors = toNumber(data.visitors);
		} else if (data?.stats?.visitors !== undefined) {
			visitors = toNumber(data.stats.visitors);
		} else if (Array.isArray(data) && data.length > 0) {
			// Handle array response format
			visitors = data.reduce((sum, item) => sum + toNumber(item.visitors), 0);
		}

		const payload = { pageviews, visitors };
		if (debug)
			Object.assign(payload, {
				mode,
				websiteId,
				tokenType: isApiKey ? "apiKey" : "bearer",
				url: targetUrl,
				rawData: data,
			});

		console.log("[stats] Final payload:", payload);
		return new Response(JSON.stringify(payload), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	} catch (e) {
		return new Response(
			JSON.stringify({
				error: "Request failed",
				message: String(e?.message || e),
				stack: e?.stack,
			}),
			{
				status: 500,
				headers: { "content-type": "application/json" },
			},
		);
	}
}

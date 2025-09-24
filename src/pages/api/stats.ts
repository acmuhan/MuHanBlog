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

	// Date range: last 30 days by default
	const endAt = Date.now();
	const startAt = endAt - 30 * 24 * 60 * 60 * 1000;

	// Endpoints
	const pvEndpoint = `${apiBase}/api/websites/${websiteId}/metrics?type=pageviews&startAt=${startAt}&endAt=${endAt}&url=${encodeURIComponent(
		targetUrl,
	)}`;
	const statsEndpoint = `${apiBase}/api/websites/${websiteId}/stats?startAt=${startAt}&endAt=${endAt}&url=${encodeURIComponent(
		targetUrl,
	)}`;
	const devicesEndpoint = `${apiBase}/api/websites/${websiteId}/metrics?type=devices&startAt=${startAt}&endAt=${endAt}&url=${encodeURIComponent(
		targetUrl,
	)}`;

	try {
		const [pvRes, statsRes, devRes] = await Promise.all([
			fetch(pvEndpoint, { headers: { Authorization: `Bearer ${token}` } }),
			fetch(statsEndpoint, { headers: { Authorization: `Bearer ${token}` } }),
			fetch(devicesEndpoint, { headers: { Authorization: `Bearer ${token}` } }),
		]);
		if (!pvRes.ok || !statsRes.ok || !devRes.ok) {
			return new Response(JSON.stringify({ error: "Upstream error" }), {
				status: 502,
			});
		}
		const [pvData, statsData, devicesData] = await Promise.all([
			pvRes.json(),
			statsRes.json(),
			devRes.json(),
		]);

		const result = {
			pageviews: Array.isArray(pvData?.data)
				? pvData.data.reduce((sum: number, i: any) => sum + (i?.y || 0), 0)
				: (pvData?.value ?? 0),
			visitors: statsData?.visitors ?? 0,
			devices: devicesData?.data ?? [],
		};

		return new Response(JSON.stringify(result), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	} catch (_e) {
		return new Response(JSON.stringify({ error: "Request failed" }), {
			status: 500,
		});
	}
};

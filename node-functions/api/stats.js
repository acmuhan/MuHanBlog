// EdgeOne Pages - Node Functions
// Docs: https://edgeone.cloud.tencent.com/pages/document/185234005644472320

export default async function onRequest(context) {
	try {
		const { request } = context;
		const url = new URL(request.url);
		const targetUrl = url.searchParams.get("url");
		if (!targetUrl) {
			return new Response(JSON.stringify({ error: "Missing url parameter" }), {
				status: 400,
				headers: { "content-type": "application/json" },
			});
		}

		const apiBase = process.env.UMAMI_API_URL || "https://cloud.umami.is";
		const websiteId = process.env.UMAMI_WEBSITE_ID;
		const token = process.env.UMAMI_API_TOKEN;

		if (!websiteId || !token) {
			return new Response(JSON.stringify({ error: "Server not configured" }), {
				status: 500,
				headers: { "content-type": "application/json" },
			});
		}

		const endAt = Date.now();
		const startAt = endAt - 30 * 24 * 60 * 60 * 1000; // last 30 days

		const pvEndpoint = `${apiBase}/api/websites/${websiteId}/metrics?type=pageviews&startAt=${startAt}&endAt=${endAt}&url=${encodeURIComponent(
			targetUrl,
		)}`;
		const statsEndpoint = `${apiBase}/api/websites/${websiteId}/stats?startAt=${startAt}&endAt=${endAt}&url=${encodeURIComponent(
			targetUrl,
		)}`;

		const [pvRes, statsRes] = await Promise.all([
			fetch(pvEndpoint, { headers: { Authorization: `Bearer ${token}` } }),
			fetch(statsEndpoint, { headers: { Authorization: `Bearer ${token}` } }),
		]);

		if (!pvRes.ok || !statsRes.ok) {
			return new Response(JSON.stringify({ error: "Upstream error" }), {
				status: 502,
				headers: { "content-type": "application/json" },
			});
		}

		const [pvData, statsData] = await Promise.all([
			pvRes.json(),
			statsRes.json(),
		]);

		const pageviews = Array.isArray(pvData?.data)
			? pvData.data.reduce((sum, i) => sum + (Number(i?.y) || 0), 0)
			: Number(pvData?.value || 0);
		const visitors = Number(statsData?.visitors || 0);

		return new Response(JSON.stringify({ pageviews, visitors }), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	} catch (_e) {
		return new Response(JSON.stringify({ error: "Request failed" }), {
			status: 500,
			headers: { "content-type": "application/json" },
		});
	}
}

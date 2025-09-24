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

		const apiBase = process.env.UMAMI_API_URL || "https://api.umami.is";
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

		const isApiKey = typeof token === "string" && token.startsWith("api_");
		const headersV1 = isApiKey
			? { "x-umami-api-key": token, Accept: "application/json" }
			: { Authorization: `Bearer ${token}`, Accept: "application/json" };
		const headersV2 = {
			Authorization: `Bearer ${token}`,
			Accept: "application/json",
		};

		// Prefer v1 stats (Umami Cloud), fallback to legacy /api stats
		const v1Stats = `${apiBase.replace(/\/$/, "")}/v1/websites/${websiteId}/stats?startAt=${startAt}&endAt=${endAt}&url=${encodeURIComponent(
			targetUrl,
		)}`;
		const v2Stats = `${(process.env.UMAMI_API_URL || "https://cloud.umami.is").replace(/\/$/, "")}/api/websites/${websiteId}/stats?startAt=${startAt}&endAt=${endAt}&url=${encodeURIComponent(
			targetUrl,
		)}`;

		// Debug logs to EdgeOne Pages Logs
		console.log(
			"[stats] using",
			apiBase,
			"websiteId",
			websiteId,
			"tokenType",
			isApiKey ? "apiKey" : "bearer",
		);
		console.log("[stats] url", targetUrl);

		let res = await fetch(v1Stats, { headers: headersV1 });
		if (!res.ok) {
			console.log("[stats] v1 failed", res.status);
			res = await fetch(v2Stats, { headers: headersV2 });
			if (!res.ok) {
				const body = await res.text().catch(() => "");
				return new Response(
					JSON.stringify({
						error: "Upstream error",
						status: res.status,
						body: body.slice(0, 200),
					}),
					{ status: 502, headers: { "content-type": "application/json" } },
				);
			}
		}

		const raw = await res.text();
		let data = {};
		try {
			data = JSON.parse(raw);
		} catch {}

		const toNumber = (v) => (typeof v === "number" ? v : Number(v?.value || 0));
		const pageviews = toNumber(data?.pageviews);
		const visitors = toNumber(data?.visitors);

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

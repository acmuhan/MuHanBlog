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

		const _pvEndpoint = `${apiBase}/api/websites/${websiteId}/metrics?type=pageviews&startAt=${startAt}&endAt=${endAt}&url=${encodeURIComponent(
			targetUrl,
		)}`;
		const _statsEndpoint = `${apiBase}/api/websites/${websiteId}/stats?startAt=${startAt}&endAt=${endAt}&url=${encodeURIComponent(
			targetUrl,
		)}`;

		const isApiKey = typeof token === "string" && token.startsWith("api_");
		const headersV1 = isApiKey
			? { "x-umami-api-key": token, Accept: "application/json" }
			: { Authorization: `Bearer ${token}`, Accept: "application/json" };
		const headersV2 = {
			Authorization: `Bearer ${token}`,
			Accept: "application/json",
		};

		// Prefer v1 endpoints for Umami Cloud; fallback to legacy /api/* if needed
		const v1Pv = `${apiBase.replace(/\/$/, "")}/v1/websites/${websiteId}/metrics?type=pageviews&startAt=${startAt}&endAt=${endAt}&url=${encodeURIComponent(
			targetUrl,
		)}`;
		const v1Stats = `${apiBase.replace(/\/$/, "")}/v1/websites/${websiteId}/stats?startAt=${startAt}&endAt=${endAt}&url=${encodeURIComponent(
			targetUrl,
		)}`;

		async function fetchPair(pvUrl, stUrl, hdrs) {
			const [pvRes, statsRes] = await Promise.all([
				fetch(pvUrl, { headers: hdrs }),
				fetch(stUrl, { headers: hdrs }),
			]);
			return { pvRes, statsRes };
		}

		let pvRes;
		let statsRes;
		try {
			({ pvRes, statsRes } = await fetchPair(v1Pv, v1Stats, headersV1));
			if (!pvRes.ok || !statsRes.ok) {
				throw new Error(`v1 failed ${pvRes.status}/${statsRes.status}`);
			}
		} catch {
			// Fallback to legacy endpoints
			const v2Pv = `${(process.env.UMAMI_API_URL || "https://cloud.umami.is").replace(/\/$/, "")}/api/websites/${websiteId}/metrics?type=pageviews&startAt=${startAt}&endAt=${endAt}&url=${encodeURIComponent(
				targetUrl,
			)}`;
			const v2Stats = `${(process.env.UMAMI_API_URL || "https://cloud.umami.is").replace(/\/$/, "")}/api/websites/${websiteId}/stats?startAt=${startAt}&endAt=${endAt}&url=${encodeURIComponent(
				targetUrl,
			)}`;
			({ pvRes, statsRes } = await fetchPair(v2Pv, v2Stats, headersV2));
			if (!pvRes.ok || !statsRes.ok) {
				const pvBody = await pvRes.text().catch(() => "");
				const stBody = await statsRes.text().catch(() => "");
				return new Response(
					JSON.stringify({
						error: "Upstream error",
						pvStatus: pvRes.status,
						statsStatus: statsRes.status,
						pvBody: pvBody.slice(0, 200),
						statsBody: stBody.slice(0, 200),
					}),
					{
						status: 502,
						headers: { "content-type": "application/json" },
					},
				);
			}
		}

		const [pvRaw, statsRaw] = await Promise.all([
			pvRes.text(),
			statsRes.text(),
		]);
		let pvData = {};
		let statsData = {};
		try {
			pvData = JSON.parse(pvRaw);
		} catch {}
		try {
			statsData = JSON.parse(statsRaw);
		} catch {}

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

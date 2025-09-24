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

		// Simple test - just return debug info first
		if (debug) {
			return new Response(
				JSON.stringify({
					debug: true,
					websiteId,
					tokenType: token.startsWith("api_") ? "apiKey" : "bearer",
					targetUrl,
					requestUrl: request.url,
					env: {
						UMAMI_API_URL: process.env.UMAMI_API_URL,
						UMAMI_WEBSITE_ID: process.env.UMAMI_WEBSITE_ID,
						UMAMI_API_TOKEN: process.env.UMAMI_API_TOKEN
							? `***${process.env.UMAMI_API_TOKEN.slice(-4)}`
							: "missing",
					},
				}),
				{
					status: 200,
					headers: { "content-type": "application/json" },
				},
			);
		}

		// For now, return mock data to test the flow
		return new Response(JSON.stringify({ pageviews: 123, visitors: 45 }), {
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

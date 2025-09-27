import type { APIRoute } from "astro";

/**
 * 网络测试API
 * 用于检查生产环境的网络策略和外部服务访问能力
 */
export const GET: APIRoute = async ({ request }) => {
	const url = new URL(request.url);
	const testType = url.searchParams.get("test") || "local";

	const timestamp = new Date().toISOString();
	const userAgent = request.headers.get("user-agent") || "Unknown";

	console.log(`[Network Test] ${testType} test requested at ${timestamp}`);

	try {
		switch (testType) {
			case "local": {
				return new Response(
					JSON.stringify({
						success: true,
						test: "local",
						message: "本地API响应正常",
						timestamp,
						userAgent,
						environment: {
							nodeVersion: process.version,
							platform: process.platform,
							arch: process.arch,
						},
					}),
					{
						status: 200,
						headers: {
							"Content-Type": "application/json",
							"Cache-Control": "no-cache",
						},
					},
				);
			}

			case "proxy": {
				// 测试代理功能 - 尝试访问外部API
				const testEndpoints = [
					"http://111.170.19.241:8002",
					"https://111.170.19.241:8002",
					"http://111.170.19.241:8002/playlist?playlist_id=12291029891&page=1&page_size=5",
				];

				const results = [];

				for (const endpoint of testEndpoints) {
					try {
						console.log(`[Network Test] Testing endpoint: ${endpoint}`);

						const startTime = Date.now();
						const response = await fetch(endpoint, {
							method: "GET",
							headers: {
								Accept: "application/json",
								"Content-Type": "application/json",
								"User-Agent": "Mozilla/5.0 (compatible; Network-Test/1.0)",
							},
							signal: AbortSignal.timeout(8000), // 8秒超时
						});

						const endTime = Date.now();
						const duration = endTime - startTime;

						if (response.ok) {
							let responseData = null;
							try {
								responseData = await response.json();
							} catch {
								responseData = { error: "Failed to parse JSON response" };
							}

							results.push({
								endpoint,
								success: true,
								status: response.status,
								statusText: response.statusText,
								duration,
								contentType: response.headers.get("content-type"),
								data: responseData,
							});

							console.log(
								`[Network Test] ✅ ${endpoint} - ${response.status} (${duration}ms)`,
							);
						} else {
							results.push({
								endpoint,
								success: false,
								status: response.status,
								statusText: response.statusText,
								duration,
								error: `HTTP ${response.status}: ${response.statusText}`,
							});

							console.log(
								`[Network Test] ❌ ${endpoint} - ${response.status} ${response.statusText}`,
							);
						}
					} catch (error) {
						const errorMessage =
							error instanceof Error ? error.message : String(error);

						results.push({
							endpoint,
							success: false,
							error: errorMessage,
							errorType: error instanceof Error ? error.name : "UnknownError",
						});

						console.log(
							`[Network Test] ❌ ${endpoint} - Error: ${errorMessage}`,
						);
					}
				}

				return new Response(
					JSON.stringify({
						success: true,
						test: "proxy",
						message: "代理测试完成",
						timestamp,
						results,
						summary: {
							total: results.length,
							successful: results.filter((r) => r.success).length,
							failed: results.filter((r) => !r.success).length,
						},
					}),
					{
						status: 200,
						headers: {
							"Content-Type": "application/json",
							"Cache-Control": "no-cache",
						},
					},
				);
			}

			case "environment": {
				// 环境信息检测
				const envInfo = {
					timestamp,
					userAgent,
					headers: Object.fromEntries(request.headers.entries()),
					url: request.url,
					method: request.method,
					environment: {
						nodeVersion: process.version,
						platform: process.platform,
						arch: process.arch,
						env: {
							NODE_ENV: process.env.NODE_ENV,
							// 不暴露敏感环境变量，只显示是否存在
							hasUmamiConfig: !!(
								process.env.UMAMI_WEBSITE_ID && process.env.UMAMI_API_TOKEN
							),
							hasUmamiUrl: !!process.env.UMAMI_API_URL,
						},
					},
				};

				return new Response(
					JSON.stringify({
						success: true,
						test: "environment",
						message: "环境信息获取成功",
						data: envInfo,
					}),
					{
						status: 200,
						headers: {
							"Content-Type": "application/json",
							"Cache-Control": "no-cache",
						},
					},
				);
			}

			default:
				return new Response(
					JSON.stringify({
						success: false,
						error: "Unknown test type",
						availableTests: ["local", "proxy", "environment"],
					}),
					{
						status: 400,
						headers: {
							"Content-Type": "application/json",
						},
					},
				);
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);

		console.error(`[Network Test] Error in ${testType} test:`, error);

		return new Response(
			JSON.stringify({
				success: false,
				test: testType,
				error: errorMessage,
				timestamp,
			}),
			{
				status: 500,
				headers: {
					"Content-Type": "application/json",
				},
			},
		);
	}
};

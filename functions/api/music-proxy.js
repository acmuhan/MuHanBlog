/**
 * EdgeOne Functions - 音乐API代理
 * 用于解决生产环境CORS问题
 */
export default async function onRequest(context) {
	const { request } = context;
	const url = new URL(request.url);

	// 获取查询参数
	const playlistId = url.searchParams.get("id");
	const limit = url.searchParams.get("limit") || "20";
	const offset = url.searchParams.get("offset") || "0";

	if (!playlistId) {
		return new Response(
			JSON.stringify({
				error: "Missing playlist ID parameter",
			}),
			{
				status: 400,
				headers: {
					"Content-Type": "application/json",
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type, Authorization",
				},
			},
		);
	}

	// 定义多个备用API端点
	const apiEndpoints = [
		"https://netease-cloud-music-api-lovat-ten.vercel.app",
		"https://music-api-steel-nine.vercel.app",
		"https://netease-music-api-xi.vercel.app",
		"https://music-api-kappa-six.vercel.app",
	];

	let lastError = null;

	// 尝试每个API端点
	for (const endpoint of apiEndpoints) {
		try {
			const apiUrl = `${endpoint}/playlist/track/all?id=${playlistId}&limit=${limit}&offset=${offset}`;

			const response = await fetch(apiUrl, {
				method: "GET",
				headers: {
					Accept: "application/json",
					"User-Agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
				},
				signal: AbortSignal.timeout(10000), // 10秒超时
			});

			if (response.ok) {
				const data = await response.json();

				// 返回成功响应
				return new Response(JSON.stringify(data), {
					status: 200,
					headers: {
						"Content-Type": "application/json",
						"Access-Control-Allow-Origin": "*",
						"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
						"Access-Control-Allow-Headers": "Content-Type, Authorization",
						"Cache-Control": "max-age=300", // 缓存5分钟
					},
				});
			}
		} catch (error) {
			lastError = error;
			console.error(`API端点 ${endpoint} 失败:`, error);
		}
	}

	// 所有端点都失败了
	return new Response(
		JSON.stringify({
			error: "All music API endpoints failed",
			details: lastError?.message || "Unknown error",
			code: 500,
		}),
		{
			status: 500,
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
			},
		},
	);
}

// 处理OPTIONS预检请求
export async function onRequestOptions() {
	return new Response(null, {
		status: 200,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
			"Access-Control-Max-Age": "86400",
		},
	});
}

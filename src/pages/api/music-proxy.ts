import type { APIRoute } from "astro";

/**
 * 音乐API代理服务
 * 解决HTTPS环境下的混合内容问题
 */
export const GET: APIRoute = async ({ request }) => {
	const url = new URL(request.url);
	const targetPath = url.searchParams.get("path") || "/api/playlist";
	const playlistId = url.searchParams.get("playlist_id") || "12291029891";
	const page = url.searchParams.get("page") || "1";
	const pageSize = url.searchParams.get("page_size") || "20";

	// 构建目标URL
	const targetUrl = `http://111.170.19.241:8002${targetPath}?playlist_id=${playlistId}&page=${page}&page_size=${pageSize}`;

	try {
		console.log(`[Music Proxy] 代理请求: ${targetUrl}`);

		const response = await fetch(targetUrl, {
			method: "GET",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				"User-Agent": "Mozilla/5.0 (compatible; Music-Proxy/1.0)",
			},
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const data = await response.json();

		return new Response(JSON.stringify(data), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Accept",
				"Cache-Control": "max-age=300", // 缓存5分钟
			},
		});
	} catch (error) {
		console.error("[Music Proxy] 代理请求失败:", error);
		console.error("[Music Proxy] 错误详情:", {
			message: error instanceof Error ? error.message : String(error),
			targetUrl,
			timestamp: new Date().toISOString(),
		});

		// 返回模拟数据作为降级方案
		const mockData = {
			code: 200,
			playlist_id: Number.parseInt(playlistId, 10),
			playlist_name: "默认歌单",
			songs: [
				{
					id: 1,
					name: "示例歌曲",
					artist: "示例艺术家",
					url: "https://via.placeholder.com/audio.mp3",
					pic_url:
						"https://via.placeholder.com/300x300/4f46e5/ffffff?text=Music",
				},
			],
			pagination: {
				page: Number.parseInt(page, 10),
				page_size: Number.parseInt(pageSize, 10),
				total: 1,
				total_pages: 1,
				has_next: false,
				has_prev: false,
			},
		};

		return new Response(JSON.stringify(mockData), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Accept",
			},
		});
	}
};

export const OPTIONS: APIRoute = async () => {
	return new Response(null, {
		status: 200,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Accept",
		},
	});
};

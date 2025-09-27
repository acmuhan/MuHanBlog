import type { APIRoute } from "astro";

/**
 * 网络测试API
 * 用于检查生产环境的网络策略和外部服务访问能力
 */
export const GET: APIRoute = async ({ request }) => {
	const url = new URL(request.url);
	const testType = url.searchParams.get("test") || "local";

	console.log(`[Network Test] 测试类型: ${testType}`);

	try {
		switch (testType) {
			case "local":
				return await testLocalEnvironment();

			case "proxy":
				return await testProxyCapabilities();

			case "external":
				return await testExternalServices();

			case "music":
				return await testMusicAPIConnectivity();

			default:
				return new Response(
					JSON.stringify({
						error: "Invalid test type",
						availableTests: ["local", "proxy", "external", "music"],
					}),
					{
						status: 400,
						headers: { "Content-Type": "application/json" },
					},
				);
		}
	} catch (error) {
		console.error("[Network Test] 测试失败:", error);

		return new Response(
			JSON.stringify({
				error: "Test execution failed",
				message: error instanceof Error ? error.message : String(error),
				timestamp: new Date().toISOString(),
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
};

/**
 * 测试本地环境
 */
async function testLocalEnvironment() {
	const environmentInfo = {
		timestamp: new Date().toISOString(),
		nodeVersion: process.version,
		platform: process.platform,
		arch: process.arch,
		environment: process.env.NODE_ENV || "unknown",
		// 检查一些关键环境变量（不暴露敏感信息）
		hasUmamiConfig: !!(
			process.env.UMAMI_WEBSITE_ID && process.env.UMAMI_API_TOKEN
		),
		runtime: typeof globalThis !== "undefined" ? "edge" : "node",
	};

	console.log("[Network Test] 本地环境信息:", environmentInfo);

	return new Response(
		JSON.stringify({
			success: true,
			testType: "local",
			data: environmentInfo,
			message: "本地环境测试成功",
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

/**
 * 测试代理能力
 */
async function testProxyCapabilities() {
	const proxyTests = [];

	// 测试1: 基本HTTP请求能力
	try {
		const response = await fetch("https://httpbin.org/get", {
			method: "GET",
			headers: {
				"User-Agent": "MuHan-Blog-Network-Test/1.0",
				Accept: "application/json",
			},
			signal: AbortSignal.timeout(5000),
		});

		proxyTests.push({
			name: "HTTPS公共API访问",
			success: response.ok,
			status: response.status,
			statusText: response.statusText,
			headers: Object.fromEntries(response.headers.entries()),
		});
	} catch (error) {
		proxyTests.push({
			name: "HTTPS公共API访问",
			success: false,
			error: error instanceof Error ? error.message : String(error),
		});
	}

	// 测试2: 音乐API HTTP访问
	try {
		const musicResponse = await fetch(
			"http://111.170.19.241:8002/playlist?playlist_id=12291029891&page=1&page_size=1",
			{
				method: "GET",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
				},
				signal: AbortSignal.timeout(8000),
			},
		);

		let responseData = null;
		try {
			responseData = await musicResponse.json();
		} catch (_e) {
			responseData = { error: "无法解析JSON响应" };
		}

		proxyTests.push({
			name: "音乐API HTTP访问",
			success: musicResponse.ok,
			status: musicResponse.status,
			statusText: musicResponse.statusText,
			hasData: !!responseData,
			dataPreview: responseData
				? `${JSON.stringify(responseData).substring(0, 200)}...`
				: null,
		});
	} catch (error) {
		proxyTests.push({
			name: "音乐API HTTP访问",
			success: false,
			error: error instanceof Error ? error.message : String(error),
		});
	}

	// 测试3: 音乐API HTTPS访问
	try {
		const musicHttpsResponse = await fetch(
			"https://111.170.19.241:8002/playlist?playlist_id=12291029891&page=1&page_size=1",
			{
				method: "GET",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
				},
				signal: AbortSignal.timeout(8000),
			},
		);

		proxyTests.push({
			name: "音乐API HTTPS访问",
			success: musicHttpsResponse.ok,
			status: musicHttpsResponse.status,
			statusText: musicHttpsResponse.statusText,
		});
	} catch (error) {
		proxyTests.push({
			name: "音乐API HTTPS访问",
			success: false,
			error: error instanceof Error ? error.message : String(error),
		});
	}

	const successCount = proxyTests.filter((test) => test.success).length;
	const totalTests = proxyTests.length;

	console.log(
		`[Network Test] 代理测试完成: ${successCount}/${totalTests} 成功`,
	);

	return new Response(
		JSON.stringify({
			success: true,
			testType: "proxy",
			summary: {
				total: totalTests,
				successful: successCount,
				failed: totalTests - successCount,
			},
			tests: proxyTests,
			message: `代理能力测试完成: ${successCount}/${totalTests} 成功`,
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

/**
 * 测试外部服务访问
 */
async function testExternalServices() {
	const externalTests = [];

	const testUrls = [
		{
			name: "Google DNS",
			url: "https://dns.google/resolve?name=example.com&type=A",
		},
		{ name: "GitHub API", url: "https://api.github.com/zen" },
		{
			name: "JSONPlaceholder",
			url: "https://jsonplaceholder.typicode.com/posts/1",
		},
		{ name: "HTTPBin", url: "https://httpbin.org/ip" },
	];

	for (const testUrl of testUrls) {
		try {
			const startTime = Date.now();
			const response = await fetch(testUrl.url, {
				method: "GET",
				headers: {
					"User-Agent": "MuHan-Blog-Network-Test/1.0",
					Accept: "application/json",
				},
				signal: AbortSignal.timeout(10000),
			});

			const endTime = Date.now();
			const duration = endTime - startTime;

			externalTests.push({
				name: testUrl.name,
				url: testUrl.url,
				success: response.ok,
				status: response.status,
				statusText: response.statusText,
				duration: duration,
				contentType: response.headers.get("content-type"),
			});
		} catch (error) {
			externalTests.push({
				name: testUrl.name,
				url: testUrl.url,
				success: false,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	const successCount = externalTests.filter((test) => test.success).length;
	const totalTests = externalTests.length;

	console.log(
		`[Network Test] 外部服务测试完成: ${successCount}/${totalTests} 成功`,
	);

	return new Response(
		JSON.stringify({
			success: true,
			testType: "external",
			summary: {
				total: totalTests,
				successful: successCount,
				failed: totalTests - successCount,
			},
			tests: externalTests,
			message: `外部服务测试完成: ${successCount}/${totalTests} 成功`,
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

/**
 * 测试音乐API连通性
 */
async function testMusicAPIConnectivity() {
	const musicTests = [];

	const endpoints = [
		{ name: "音乐API根路径 (HTTP)", url: "http://111.170.19.241:8002" },
		{ name: "音乐API根路径 (HTTPS)", url: "https://111.170.19.241:8002" },
		{
			name: "音乐API歌单接口 (HTTP)",
			url: "http://111.170.19.241:8002/playlist?playlist_id=12291029891&page=1&page_size=5",
		},
		{
			name: "音乐API歌单接口 (HTTPS)",
			url: "https://111.170.19.241:8002/playlist?playlist_id=12291029891&page=1&page_size=5",
		},
	];

	for (const endpoint of endpoints) {
		try {
			console.log(`[Network Test] 测试音乐API: ${endpoint.url}`);

			const startTime = Date.now();
			const response = await fetch(endpoint.url, {
				method: "GET",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
					"User-Agent": "MuHan-Blog-Network-Test/1.0",
				},
				signal: AbortSignal.timeout(10000),
			});

			const endTime = Date.now();
			const duration = endTime - startTime;

			let responseData = null;
			let dataSize = 0;

			try {
				const text = await response.text();
				dataSize = text.length;
				responseData = JSON.parse(text);
			} catch (_e) {
				responseData = { error: "无法解析响应数据" };
			}

			musicTests.push({
				name: endpoint.name,
				url: endpoint.url,
				success: response.ok,
				status: response.status,
				statusText: response.statusText,
				duration: duration,
				dataSize: dataSize,
				contentType: response.headers.get("content-type"),
				hasValidData: responseData && !responseData.error,
				dataPreview: responseData
					? `${JSON.stringify(responseData).substring(0, 300)}...`
					: null,
			});

			console.log(
				`[Network Test] ${endpoint.name}: ${response.ok ? "成功" : "失败"} (${duration}ms)`,
			);
		} catch (error) {
			musicTests.push({
				name: endpoint.name,
				url: endpoint.url,
				success: false,
				error: error instanceof Error ? error.message : String(error),
			});

			console.log(
				`[Network Test] ${endpoint.name}: 错误 - ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	const successCount = musicTests.filter((test) => test.success).length;
	const totalTests = musicTests.length;

	console.log(
		`[Network Test] 音乐API测试完成: ${successCount}/${totalTests} 成功`,
	);

	return new Response(
		JSON.stringify({
			success: true,
			testType: "music",
			summary: {
				total: totalTests,
				successful: successCount,
				failed: totalTests - successCount,
				recommendation:
					successCount === 0
						? "所有音乐API端点都无法访问，建议检查网络策略或使用代理服务"
						: successCount < totalTests
							? "部分音乐API端点可访问，建议优先使用成功的端点"
							: "所有音乐API端点都可正常访问",
			},
			tests: musicTests,
			message: `音乐API连通性测试完成: ${successCount}/${totalTests} 成功`,
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

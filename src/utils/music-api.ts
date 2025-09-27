import type { PlaylistResponse, Song } from "../config/music";
import { musicConfig } from "../config/music";

export class MusicAPI {
	private apiBase: string;
	private defaultPlaylistId: number;
	private pageSize: number;
	private fallbackEndpoints: string[];

	constructor() {
		this.apiBase = musicConfig.apiBase;
		this.defaultPlaylistId = musicConfig.defaultPlaylistId;
		this.pageSize = musicConfig.pageSize;

		// 定义备用端点，优先使用新API
		this.fallbackEndpoints = [
			"http://111.170.19.241:8002", // 新API HTTP版本（优先）
			"https://111.170.19.241:8002", // 新API HTTPS版本
			// 减少备用端点数量，避免过多重试
		];
	}

	/**
	 * 随机获取3页歌单数据
	 * @param playlistId 歌单ID
	 * @param cookiesJson 自定义cookies
	 * @param musicU 请求头
	 */
	async getAllSongs(
		playlistId = this.defaultPlaylistId,
		cookiesJson?: string,
		musicU?: string,
	): Promise<{ songs: Song[]; totalPages: number }> {
		const allSongs: Song[] = [];
		let totalPages = 1;

		console.log("开始随机获取3页歌曲数据...");

		// 先获取第一页了解总页数
		try {
			const firstPageResult = await this.getPlaylist(
				playlistId,
				1,
				20, // 使用较小的页面大小获取总页数
				cookiesJson,
				musicU,
			);

			if (firstPageResult?.songs) {
				allSongs.push(...firstPageResult.songs);
				totalPages = firstPageResult.pagination.total_pages;
				console.log(
					`第1页获取成功，总页数: ${totalPages}，歌曲数量: ${firstPageResult.songs.length}`,
				);
			}
		} catch (error) {
			console.error("获取第一页失败:", error);
			return this.getMockAllSongsData();
		}

		// 随机选择另外2页（如果总页数大于1）
		if (totalPages > 1) {
			const availablePages = [];
			for (let i = 2; i <= Math.min(totalPages, 50); i++) {
				// 限制在前50页内随机选择
				availablePages.push(i);
			}

			// 随机打乱页面数组并选择前2页
			const shuffledPages = availablePages.sort(() => Math.random() - 0.5);
			const selectedPages = shuffledPages.slice(0, 2);

			console.log(`随机选择页面: ${selectedPages.join(", ")}`);

			// 顺序获取选中的页面
			for (const page of selectedPages) {
				try {
					const result = await this.getPlaylist(
						playlistId,
						page,
						20,
						cookiesJson,
						musicU,
					);
					if (result?.songs) {
						allSongs.push(...result.songs);
						console.log(
							`第${page}页获取成功，歌曲数量: ${result.songs.length}`,
						);
					}

					// 减少延迟提高加载速度
					await new Promise((resolve) => setTimeout(resolve, 100));
				} catch (error) {
					console.error(`获取第${page}页失败:`, error);
					// 继续获取下一页
				}
			}
		}

		console.log(`随机3页歌曲获取完成，总歌曲数量: ${allSongs.length}`);

		return {
			songs: allSongs,
			totalPages,
		};
	}

	/**
	 * 批量获取多页歌单数据
	 * @param playlistId 歌单ID
	 * @param pages 要获取的页数
	 * @param pageSize 每页数量
	 * @param cookiesJson 自定义cookies
	 * @param musicU 请求头
	 */
	async getMultiplePages(
		playlistId = this.defaultPlaylistId,
		pages = 5,
		pageSize = this.pageSize,
		cookiesJson?: string,
		musicU?: string,
	): Promise<{ songs: Song[]; totalPages: number }> {
		const allSongs: Song[] = [];
		let totalPages = 1;

		console.log(`开始获取${pages}页歌曲数据...`);

		// 使用顺序请求减少服务器压力，添加延迟
		for (let page = 1; page <= pages; page++) {
			try {
				const result = await this.getPlaylist(
					playlistId,
					page,
					pageSize,
					cookiesJson,
					musicU,
				);
				if (result?.songs) {
					allSongs.push(...result.songs);
					totalPages = Math.max(totalPages, result.pagination.total_pages);
					console.log(`第${page}页获取成功，歌曲数量: ${result.songs.length}`);
				}

				// 添加延迟减少服务器压力
				if (page < pages) {
					await new Promise((resolve) => setTimeout(resolve, 200)); // 200ms延迟
				}
			} catch (error) {
				console.error(`获取第${page}页失败:`, error);
				// 继续获取下一页
			}
		}

		console.log(`多页获取完成，总歌曲数量: ${allSongs.length}`);

		return {
			songs: allSongs,
			totalPages,
		};
	}

	/**
	 * 获取歌单数据 - 支持多端点降级和HTTPS/HTTP解决方案
	 * @param playlistId 歌单ID
	 * @param page 页码
	 * @param pageSize 每页数量
	 * @param cookiesJson 自定义cookies
	 * @param musicU 请求头
	 * @param retries 重试次数
	 */
	async getPlaylist(
		playlistId = this.defaultPlaylistId,
		page = 1,
		pageSize = this.pageSize,
		cookiesJson?: string,
		musicU?: string,
		retries = 3,
	): Promise<PlaylistResponse> {
		// 尝试所有可用的端点
		for (const endpoint of this.fallbackEndpoints) {
			console.log(`尝试端点: ${endpoint}`);

			// 减少重试次数，避免过多请求
			const maxAttempts = Math.min(retries, 2); // 最多重试2次
			for (let attempt = 1; attempt <= maxAttempts; attempt++) {
				try {
					const result = await this.tryFetchPlaylist(
						endpoint,
						playlistId,
						page,
						pageSize,
						cookiesJson,
						musicU,
					);

					if (result) {
						console.log(`成功从端点获取数据: ${endpoint}`);
						return result;
					}
				} catch (error) {
					console.error(
						`端点 ${endpoint} 尝试 ${attempt}/${retries} 失败:`,
						error,
					);

					// 如果是HTTPS混合内容错误，尝试其他解决方案
					if (this.isMixedContentError(error)) {
						console.log("检测到混合内容错误，尝试代理解决方案");
						try {
							const proxyResult = await this.tryProxyRequest(
								endpoint,
								playlistId,
								page,
								pageSize,
								cookiesJson,
								musicU,
							);
							if (proxyResult) {
								console.log("代理请求成功");
								return proxyResult;
							}
						} catch (proxyError) {
							console.error("代理请求失败:", proxyError);
						}
					}

					// 等待后重试
					if (attempt < retries) {
						await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
					}
				}
			}
		}

		// 所有端点都失败，返回模拟数据
		console.warn("所有端点和解决方案都失败，返回模拟数据");
		return this.getMockPlaylistData(page, pageSize);
	}

	/**
	 * 尝试从指定端点获取歌单数据
	 */
	private async tryFetchPlaylist(
		endpoint: string,
		playlistId: number,
		page: number,
		pageSize: number,
		cookiesJson?: string,
		musicU?: string,
	): Promise<PlaylistResponse | null> {
		const params = new URLSearchParams({
			playlist_id: playlistId.toString(),
			page: page.toString(),
			page_size: Math.min(pageSize, 100).toString(),
		});

		if (cookiesJson) {
			params.append("cookies_json", cookiesJson);
		}

		const headers: Record<string, string> = {
			Accept: "application/json",
			// 移除Content-Type避免CORS预检请求
		};

		if (musicU) {
			headers.music_u = musicU;
		}

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒超时

		try {
			const response = await fetch(`${endpoint}/playlist?${params}`, {
				method: "GET",
				headers,
				signal: controller.signal,
				mode: "cors",
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = (await response.json()) as PlaylistResponse;

			if (data.code !== 200) {
				throw new Error(`API Error: ${data.code}`);
			}

			return data;
		} catch (error) {
			clearTimeout(timeoutId);
			throw error;
		}
	}

	/**
	 * 检查是否是混合内容错误
	 */
	private isMixedContentError(error: unknown): boolean {
		const errorMessage = (error as Error)?.message?.toLowerCase() || "";
		return (
			errorMessage.includes("mixed content") ||
			errorMessage.includes("blocked") ||
			errorMessage.includes("cors") ||
			(typeof window !== "undefined" &&
				window.location.protocol === "https:" &&
				errorMessage.includes("fetch"))
		);
	}

	/**
	 * 尝试使用代理服务解决HTTPS/HTTP混合内容问题
	 */
	private async tryProxyRequest(
		endpoint: string,
		playlistId: number,
		page: number,
		pageSize: number,
		cookiesJson?: string,
		_musicU?: string,
	): Promise<PlaylistResponse | null> {
		// 如果原端点是HTTP，尝试使用公共代理服务
		if (endpoint.startsWith("http://")) {
			const proxyServices = [
				"https://api.allorigins.win/raw?url=",
				"https://cors-anywhere.herokuapp.com/",
				// 可以添加更多代理服务
			];

			for (const proxy of proxyServices) {
				try {
					const params = new URLSearchParams({
						playlist_id: playlistId.toString(),
						page: page.toString(),
						page_size: Math.min(pageSize, 100).toString(),
					});

					if (cookiesJson) {
						params.append("cookies_json", cookiesJson);
					}

					const proxyUrl = `${proxy}${encodeURIComponent(`${endpoint}/playlist?${params}`)}`;

					const response = await fetch(proxyUrl, {
						method: "GET",
						headers: {
							Accept: "application/json",
						},
					});

					if (response.ok) {
						const data = await response.json();
						if (data.code === 200) {
							console.log(`代理服务成功: ${proxy}`);
							return data as PlaylistResponse;
						}
					}
				} catch (error) {
					console.error(`代理服务失败 ${proxy}:`, error);
				}
			}
		}

		return null;
	}

	/**
	 * 获取模拟所有歌曲数据（用于API失败时的降级）
	 */
	private getMockAllSongsData(): { songs: Song[]; totalPages: number } {
		const mockSongs: Song[] = [];

		// 生成更多模拟歌曲数据
		for (let i = 1; i <= 100; i++) {
			mockSongs.push({
				id: i,
				name: `示例歌曲 ${i}`,
				artist: `示例艺术家 ${Math.ceil(i / 10)}`,
				url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
				pic_url: `https://via.placeholder.com/300x300/${Math.floor(Math.random() * 16777215).toString(16)}/ffffff?text=Music${i}`,
			});
		}

		return {
			songs: mockSongs,
			totalPages: 5,
		};
	}

	/**
	 * 获取模拟歌单数据（用于API失败时的降级）
	 */
	private getMockPlaylistData(
		page: number,
		pageSize: number,
	): PlaylistResponse {
		const mockSongs: Song[] = [
			{
				id: 1,
				name: "示例歌曲 1",
				artist: "示例艺术家",
				url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
				pic_url: "https://via.placeholder.com/300x300/4f46e5/ffffff?text=Music",
			},
			{
				id: 2,
				name: "示例歌曲 2",
				artist: "示例艺术家 2",
				url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
				pic_url: "https://via.placeholder.com/300x300/7c3aed/ffffff?text=Music",
			},
		];

		return {
			code: 200,
			playlist_id: this.defaultPlaylistId,
			playlist_name: "示例歌单",
			songs: mockSongs,
			pagination: {
				page,
				page_size: pageSize,
				total: mockSongs.length,
				total_pages: 1,
				has_next: false,
				has_prev: false,
			},
		};
	}

	/**
	 * 验证歌曲URL是否可访问
	 * @param url 歌曲URL
	 */
	async validateSongUrl(url: string): Promise<boolean> {
		try {
			const response = await fetch(url, { method: "HEAD" });
			return response.ok;
		} catch {
			return false;
		}
	}

	/**
	 * 获取歌曲的元数据
	 * @param url 歌曲URL
	 */
	async getSongMetadata(url: string) {
		try {
			const response = await fetch(url, { method: "HEAD" });
			if (!response.ok) return null;

			const contentLength = response.headers.get("content-length");
			const size = contentLength ? Number.parseInt(contentLength, 10) : 0;

			// 创建临时音频元素来获取时长
			return new Promise((resolve) => {
				const audio = new Audio();
				audio.addEventListener("loadedmetadata", () => {
					resolve({
						duration: audio.duration,
						size,
					});
				});
				audio.addEventListener("error", () => {
					resolve(null);
				});
				audio.src = url;
			});
		} catch {
			return null;
		}
	}

	/**
	 * 搜索歌曲
	 * @param query 搜索关键词
	 * @param page 页码
	 * @param pageSize 每页数量
	 */
	async searchSongs(
		query: string,
		page = 1,
		pageSize = this.pageSize,
	): Promise<Song[]> {
		// 这里可以实现搜索功能，如果API支持的话
		// 目前返回空数组
		console.log("搜索功能暂未实现:", { query, page, pageSize });
		return [];
	}

	/**
	 * 获取推荐歌曲
	 * @param count 推荐数量
	 */
	async getRecommendedSongs(count = 10): Promise<Song[]> {
		// 这里可以实现推荐功能，如果API支持的话
		// 目前返回空数组
		console.log("推荐功能暂未实现:", { count });
		return [];
	}
}

// 创建单例实例
export const musicAPI = new MusicAPI();

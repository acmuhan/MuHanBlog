import type { PlaylistResponse, Song } from "../config/music";
import { musicConfig } from "../config/music";

export class MusicAPI {
	private apiBase: string;
	private defaultPlaylistId: number;
	private pageSize: number;

	constructor() {
		this.apiBase = musicConfig.apiBase;
		this.defaultPlaylistId = musicConfig.defaultPlaylistId;
		this.pageSize = musicConfig.pageSize;
	}

	/**
	 * 获取歌单数据
	 * @param playlistId 歌单ID
	 * @param page 页码
	 * @param pageSize 每页数量
	 * @param cookiesJson 自定义cookies
	 * @param musicU 请求头
	 */
	async getPlaylist(
		playlistId = this.defaultPlaylistId,
		page = 1,
		pageSize = this.pageSize,
		cookiesJson?: string,
		musicU?: string,
		retries = 3,
	): Promise<PlaylistResponse> {
		for (let attempt = 1; attempt <= retries; attempt++) {
			try {
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
					"Content-Type": "application/json",
				};

				if (musicU) {
					headers.music_u = musicU;
				}

				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

				const response = await fetch(`${this.apiBase}/playlist?${params}`, {
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
				console.error(`获取歌单失败 (尝试 ${attempt}/${retries}):`, error);

				if (attempt === retries) {
					// 最后一次尝试失败，返回模拟数据
					console.warn("所有重试失败，返回模拟数据");
					return this.getMockPlaylistData(page, pageSize);
				}

				// 等待一段时间后重试
				await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
			}
		}

		// 这行代码理论上不会执行到，但为了类型安全
		return this.getMockPlaylistData(page, pageSize);
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

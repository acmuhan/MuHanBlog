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
	): Promise<PlaylistResponse> {
		try {
			const params = new URLSearchParams({
				playlist_id: playlistId.toString(),
				page: page.toString(),
				page_size: Math.min(pageSize, 100).toString(),
			});

			if (cookiesJson) {
				params.append("cookies_json", cookiesJson);
			}

			const headers = {
				Accept: "application/json",
				"Content-Type": "application/json",
			};

			if (musicU) {
				headers.music_u = musicU;
			}

			const response = await fetch(`${this.apiBase}/playlist?${params}`, {
				method: "GET",
				headers,
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = (await response.json()) as PlaylistResponse;

			if (data.code !== 200) {
				throw new Error(`API Error: ${data.code}`);
			}

			return data;
		} catch (error) {
			console.error("获取歌单失败:", error);
			throw error;
		}
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

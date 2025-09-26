export interface MusicConfig {
	apiBase: string;
	defaultPlaylistId: number;
	pageSize: number;
	enableKeyboardShortcuts: boolean;
	enableAutoPlay: boolean;
	enableShuffle: boolean;
	enableRepeat: boolean;
	defaultVolume: number;
	preloadPages: number; // 预加载页数
}

export const musicConfig: MusicConfig = {
	// 使用多个API端点进行降级处理
	apiBase:
		typeof window !== "undefined" ? getApiBase() : "http://111.170.19.241:8001",
	defaultPlaylistId: 12291029891,
	pageSize: 60, // 默认显示60首歌曲
	enableKeyboardShortcuts: true,
	enableAutoPlay: true,
	enableShuffle: true, // 默认开启随机播放
	enableRepeat: false,
	defaultVolume: 0.7,
	preloadPages: 10, // 预加载更多页面获取所有歌曲
};

/**
 * 根据当前环境选择合适的API基础URL
 */
function getApiBase(): string {
	// 如果是HTTPS环境，尝试多种解决方案
	if (window.location.protocol === "https:") {
		// 方案1: 尝试使用HTTPS端口（如果服务器支持）
		// 方案2: 使用公共代理服务
		// 方案3: 使用JSONP（如果API支持）
		return "https://111.170.19.241:8001"; // 先尝试HTTPS
	}

	// HTTP环境直接使用HTTP
	return "http://111.170.19.241:8001";
}

export interface Song {
	id: number;
	name: string;
	artist: string;
	url: string;
	pic_url: string;
}

export interface PlaylistResponse {
	code: number;
	playlist_id: number;
	playlist_name: string;
	songs: Song[];
	pagination: {
		page: number;
		page_size: number;
		total: number;
		total_pages: number;
		has_next: boolean;
		has_prev: boolean;
	};
}

export interface MusicPlayerState {
	isVisible: boolean;
	isPlaying: boolean;
	isExpanded: boolean;
	isLoading: boolean;
	currentSong: Song | null;
	currentTime: number;
	duration: number;
	volume: number;
	isShuffle: boolean;
	isRepeat: boolean;
	currentPage: number;
	totalPages: number;
	playlist: Song[]; // 当前页面显示的歌曲列表
	currentIndex: number;
	fullPlaylist: Song[]; // 完整的歌曲列表（多页合并）
	shuffledPlaylist: Song[]; // 随机播放列表
	shuffleIndex: number; // 随机播放列表中的当前索引
}

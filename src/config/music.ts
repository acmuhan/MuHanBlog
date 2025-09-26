export interface MusicConfig {
	apiBase: string;
	defaultPlaylistId: number;
	pageSize: number;
	enableKeyboardShortcuts: boolean;
	enableAutoPlay: boolean;
	enableShuffle: boolean;
	enableRepeat: boolean;
	defaultVolume: number;
}

export const musicConfig: MusicConfig = {
	// 使用多个API端点进行降级处理
	apiBase:
		typeof window !== "undefined" ? getApiBase() : "http://103.40.14.239:12237",
	defaultPlaylistId: 123456,
	pageSize: 20,
	enableKeyboardShortcuts: true,
	enableAutoPlay: true,
	enableShuffle: false,
	enableRepeat: false,
	defaultVolume: 0.7,
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
		return "https://103.40.14.239:12237"; // 先尝试HTTPS
	}

	// HTTP环境直接使用HTTP
	return "http://103.40.14.239:12237";
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
	playlist: Song[];
	currentIndex: number;
}

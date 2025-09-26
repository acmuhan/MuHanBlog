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
	apiBase:
		typeof window !== "undefined" && window.location.protocol === "https:"
			? "https://103.40.14.239:12237"
			: "http://103.40.14.239:12237",
	defaultPlaylistId: 123456,
	pageSize: 20,
	enableKeyboardShortcuts: true,
	enableAutoPlay: true,
	enableShuffle: false,
	enableRepeat: false,
	defaultVolume: 0.7,
};

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

<script lang="ts">
import { onMount, onDestroy } from 'svelte';
import Icon from '@iconify/svelte';
import { fetchSongUrl, searchFirstSongId } from '@/utils/music-proxy';
	
export let playlist: Array<{
    title: string;
    artist: string;
    src?: string;
    neteaseId?: number;
    keywords?: string;
    cover?: string;
}> = [];
export let musicProxyBaseUrl: string = 'http://103.40.14.239:12237';
export let musicU: string | undefined = undefined;
	
	export let autoplay: boolean = false;
	export let showPlaylist: boolean = true;
	export let position: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' = 'bottom-right';
	
	let currentTrack = 0;
	let isPlaying = false;
	let isMuted = false;
	let volume = 0.8;
	let currentTime = 0;
	let duration = 0;
	let audio: HTMLAudioElement;
	let progressBar: HTMLInputElement;
	let volumeBar: HTMLInputElement;
	let isExpanded = false;
	let showPlaylistPanel = false;
	
	// 创建音频元素
	onMount(() => {
		audio = new Audio();
		audio.volume = volume;
		audio.preload = 'metadata';
		
		// 音频事件监听
		audio.addEventListener('loadedmetadata', () => {
			duration = audio.duration;
		});
		
		audio.addEventListener('timeupdate', () => {
			currentTime = audio.currentTime;
		});
		
		audio.addEventListener('ended', () => {
			nextTrack();
		});
		
		audio.addEventListener('play', () => {
			isPlaying = true;
		});
		
		audio.addEventListener('pause', () => {
			isPlaying = false;
		});
		
        // 加载第一首歌曲
        if (playlist.length > 0) {
            loadTrack(0).then(() => {
                if (autoplay) {
                    audio.play();
                }
            });
        }
	});
	
	onDestroy(() => {
		if (audio) {
			audio.pause();
			audio.src = '';
		}
	});
	
const resolvePlayableUrl = async (index: number): Promise<string | null> => {
    const item = playlist[index];
    if (!item) return null;
    if (item.src) return item.src;
    if (typeof item.neteaseId === 'number') {
        return await fetchSongUrl(item.neteaseId, { baseUrl: musicProxyBaseUrl, musicU });
    }
    if (item.keywords && item.keywords.trim().length > 0) {
        const id = await searchFirstSongId(item.keywords, { baseUrl: musicProxyBaseUrl, musicU });
        if (typeof id === 'number') {
            return await fetchSongUrl(id, { baseUrl: musicProxyBaseUrl, musicU });
        }
    }
    return null;
};

const loadTrack = async (index: number) => {
    if (!playlist[index]) return;
    currentTrack = index;
    const url = await resolvePlayableUrl(index);
    if (url) {
        audio.src = url;
        audio.load();
    }
};
	
	const togglePlay = () => {
		if (isPlaying) {
			audio.pause();
		} else {
			audio.play();
		}
	};
	
	const nextTrack = () => {
		const next = (currentTrack + 1) % playlist.length;
		loadTrack(next);
		if (isPlaying) {
			audio.play();
		}
	};
	
	const prevTrack = () => {
		const prev = (currentTrack - 1 + playlist.length) % playlist.length;
		loadTrack(prev);
		if (isPlaying) {
			audio.play();
		}
	};
	
	const setProgress = (event: Event) => {
		const target = event.target as HTMLInputElement;
		const time = (parseFloat(target.value) / 100) * duration;
		audio.currentTime = time;
		currentTime = time;
	};
	
	const setVolume = (event: Event) => {
		const target = event.target as HTMLInputElement;
		volume = parseFloat(target.value) / 100;
		audio.volume = volume;
		isMuted = volume === 0;
	};
	
	const toggleMute = () => {
		if (isMuted) {
			audio.volume = volume;
			isMuted = false;
		} else {
			audio.volume = 0;
			isMuted = true;
		}
	};
	
const playTrack = (index: number) => {
    loadTrack(index).then(() => audio.play());
};
	
	const formatTime = (time: number) => {
		const minutes = Math.floor(time / 60);
		const seconds = Math.floor(time % 60);
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	};
</script>

{#if playlist.length > 0}
	<div class="fixed {position} z-50 m-4 transition-all duration-300 {isExpanded ? 'scale-110' : ''}">
		<!-- 主播放器 -->
		<div class="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/20 overflow-hidden">
			<!-- 当前播放信息 -->
			<div class="flex items-center p-3 space-x-3">
				<!-- 封面图片 -->
				<div class="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
					{#if playlist[currentTrack]?.cover}
						<img src={playlist[currentTrack].cover} alt="Cover" class="w-full h-full object-cover" />
					{:else}
						<div class="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
							<Icon name="material-symbols:music-note-rounded" class="w-6 h-6 text-white" />
						</div>
					{/if}
				</div>
				
				<!-- 歌曲信息 -->
				<div class="flex-1 min-w-0">
					<div class="text-sm font-medium text-gray-900 dark:text-white truncate">
						{playlist[currentTrack]?.title || 'Unknown'}
					</div>
					<div class="text-xs text-gray-500 dark:text-gray-400 truncate">
						{playlist[currentTrack]?.artist || 'Unknown Artist'}
					</div>
				</div>
				
				<!-- 展开/收起按钮 -->
				<button 
					class="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
					on:click={() => isExpanded = !isExpanded}
				>
					<Icon 
						name={isExpanded ? "material-symbols:keyboard-arrow-down-rounded" : "material-symbols:keyboard-arrow-up-rounded"} 
						class="w-5 h-5 text-gray-600 dark:text-gray-300" 
					/>
				</button>
			</div>
			
			<!-- 展开的控制面板 -->
			{#if isExpanded}
				<div class="px-3 pb-3 space-y-3">
					<!-- 进度条 -->
					<div class="space-y-1">
						<input 
							type="range" 
							min="0" 
							max="100" 
							value={duration > 0 ? (currentTime / duration) * 100 : 0}
							on:input={setProgress}
							class="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
						/>
						<div class="flex justify-between text-xs text-gray-500 dark:text-gray-400">
							<span>{formatTime(currentTime)}</span>
							<span>{formatTime(duration)}</span>
						</div>
					</div>
					
					<!-- 控制按钮 -->
					<div class="flex items-center justify-center space-x-4">
						<button 
							class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
							on:click={prevTrack}
						>
							<Icon name="material-symbols:skip-previous-rounded" class="w-5 h-5 text-gray-600 dark:text-gray-300" />
						</button>
						
						<button 
							class="p-3 rounded-full bg-purple-500 hover:bg-purple-600 text-white transition-colors"
							on:click={togglePlay}
						>
							<Icon 
								name={isPlaying ? "material-symbols:pause-rounded" : "material-symbols:play-arrow-rounded"} 
								class="w-6 h-6" 
							/>
						</button>
						
						<button 
							class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
							on:click={nextTrack}
						>
							<Icon name="material-symbols:skip-next-rounded" class="w-5 h-5 text-gray-600 dark:text-gray-300" />
						</button>
					</div>
					
					<!-- 音量控制 -->
					<div class="flex items-center space-x-2">
						<button 
							class="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
							on:click={toggleMute}
						>
							<Icon 
								name={isMuted ? "material-symbols:volume-off-rounded" : "material-symbols:volume-up-rounded"} 
								class="w-4 h-4 text-gray-600 dark:text-gray-300" 
							/>
						</button>
						<input 
							type="range" 
							min="0" 
							max="100" 
							value={isMuted ? 0 : volume * 100}
							on:input={setVolume}
							class="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
						/>
					</div>
					
					<!-- 播放列表按钮 -->
					{#if showPlaylist && playlist.length > 1}
						<button 
							class="w-full p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm text-gray-700 dark:text-gray-300"
							on:click={() => showPlaylistPanel = !showPlaylistPanel}
						>
							<Icon name="material-symbols:queue-music-rounded" class="w-4 h-4 inline mr-2" />
							播放列表 ({playlist.length})
						</button>
					{/if}
				</div>
			{/if}
		</div>
		
		<!-- 播放列表面板 -->
		{#if showPlaylistPanel && playlist.length > 1}
			<div class="mt-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/20 max-h-64 overflow-y-auto">
				<div class="p-3">
					<div class="text-sm font-medium text-gray-900 dark:text-white mb-2">播放列表</div>
					{#each playlist as track, index}
						<button 
							class="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left {index === currentTrack ? 'bg-purple-100 dark:bg-purple-900/30' : ''}"
							on:click={() => playTrack(index)}
						>
							<div class="w-8 h-8 rounded overflow-hidden flex-shrink-0">
								{#if track.cover}
									<img src={track.cover} alt="Cover" class="w-full h-full object-cover" />
								{:else}
									<div class="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
										<Icon name="material-symbols:music-note-rounded" class="w-4 h-4 text-white" />
									</div>
								{/if}
							</div>
							<div class="flex-1 min-w-0">
								<div class="text-sm font-medium text-gray-900 dark:text-white truncate">
									{track.title}
								</div>
								<div class="text-xs text-gray-500 dark:text-gray-400 truncate">
									{track.artist}
								</div>
							</div>
							{#if index === currentTrack && isPlaying}
								<Icon name="material-symbols:equalizer-rounded" class="w-4 h-4 text-purple-500" />
							{/if}
						</button>
					{/each}
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.slider::-webkit-slider-thumb {
		appearance: none;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: #8b5cf6;
		cursor: pointer;
		border: 2px solid white;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}
	
	.slider::-moz-range-thumb {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: #8b5cf6;
		cursor: pointer;
		border: 2px solid white;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}
</style>

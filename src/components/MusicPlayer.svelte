<script lang="ts">
import Icon from "@iconify/svelte";
import { onDestroy, onMount } from "svelte";
import { slide, fade } from "svelte/transition";
import type { MusicPlayerState, Song } from "../config/music";
import { musicConfig } from "../config/music";
import { musicAPI } from "../utils/music-api";

// 播放器状态
let playerState: MusicPlayerState = {
	isVisible: false,
	isPlaying: false,
	isExpanded: false,
	isLoading: false,
	currentSong: null,
	currentTime: 0,
	duration: 0,
	volume: musicConfig.defaultVolume,
	isShuffle: musicConfig.enableShuffle,
	isRepeat: musicConfig.enableRepeat,
	currentPage: 1,
	totalPages: 1,
	playlist: [],
	currentIndex: 0,
};

// 拖拽状态
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let playerPosition = { x: 20, y: 20 }; // 距离右下角的像素距离

// 移动端和边距把手状态
let isMobile = false;
let isMinimizedToEdge = false;
let windowWidth = 0;
let windowHeight = 0;

// 音频元素和相关变量
let audioElement: HTMLAudioElement;
let progressBar: HTMLElement;
let volumeSlider: HTMLElement;
let isProgressDragging = false;
let isVolumeDragging = false;
let animationFrame: number | undefined;

// 分页控制
let pageSize = musicConfig.pageSize;
let pageSizeInput = pageSize;

// 响应式变量
$: currentTimeFormatted = formatTime(playerState.currentTime);
$: durationFormatted = formatTime(playerState.duration);
$: progressPercent =
	playerState.duration > 0
		? (playerState.currentTime / playerState.duration) * 100
		: 0;

// 时间格式化函数
function formatTime(seconds: number): string {
	if (!seconds || Number.isNaN(seconds)) return "0:00";
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// 加载歌单数据
async function loadPlaylist(page = 1, size = pageSize) {
	try {
		playerState.isLoading = true;
		const response = await musicAPI.getPlaylist(
			musicConfig.defaultPlaylistId,
			page,
			size,
		);

		playerState.playlist = response.songs;
		playerState.currentPage = response.pagination.page;
		playerState.totalPages = response.pagination.total_pages;

		// 如果当前没有歌曲且歌单不为空，选择第一首歌
		if (!playerState.currentSong && playerState.playlist.length > 0) {
			playerState.currentSong = playerState.playlist[0];
			playerState.currentIndex = 0;
		}

		playerState.isLoading = false;
	} catch (error) {
		console.error("加载歌单失败:", error);
		playerState.isLoading = false;
	}
}

// 播放控制
function togglePlay() {
	if (!playerState.currentSong) return;

	if (playerState.isPlaying) {
		audioElement.pause();
	} else {
		audioElement.play();
	}
}

function playPrevious() {
	if (playerState.playlist.length === 0) return;

	let newIndex = playerState.currentIndex - 1;
	if (newIndex < 0) {
		// 如果是第一首歌且有上一页，切换到上一页的最后一首
		if (playerState.currentPage > 1) {
			changePage(playerState.currentPage - 1, true);
			return;
		}
		newIndex = playerState.playlist.length - 1;
	}

	selectSong(newIndex);
	
	// 自动播放上一首
	setTimeout(() => {
		if (audioElement && playerState.currentSong) {
			audioElement.play().catch(error => {
				console.log("自动播放失败:", error);
			});
		}
	}, 100);
}

function playNext() {
	if (playerState.playlist.length === 0) return;

	let newIndex = playerState.currentIndex + 1;
	if (newIndex >= playerState.playlist.length) {
		// 如果是最后一首歌且有下一页，切换到下一页的第一首
		if (playerState.currentPage < playerState.totalPages) {
			changePage(playerState.currentPage + 1, false);
			return;
		}
		newIndex = 0;
	}

	selectSong(newIndex);
	
	// 自动播放下一首
	setTimeout(() => {
		if (audioElement && playerState.currentSong) {
			audioElement.play().catch(error => {
				console.log("自动播放失败:", error);
			});
		}
	}, 100);
}

function selectSong(index: number) {
	if (index < 0 || index >= playerState.playlist.length) return;

	const wasPlaying = playerState.isPlaying;
	playerState.currentSong = playerState.playlist[index];
	playerState.currentIndex = index;

	if (audioElement) {
		audioElement.src = playerState.currentSong.url;
		if (wasPlaying) {
			audioElement.play();
		}
	}
}

// 分页控制
async function changePage(page: number, selectLast = false) {
	if (page < 1 || page > playerState.totalPages) return;

	const wasPlaying = playerState.isPlaying;
	await loadPlaylist(page, pageSize);

	// 选择新页面的歌曲
	if (playerState.playlist.length > 0) {
		const newIndex = selectLast ? playerState.playlist.length - 1 : 0;
		playerState.currentSong = playerState.playlist[newIndex];
		playerState.currentIndex = newIndex;

		if (audioElement) {
			audioElement.src = playerState.currentSong.url;
			if (wasPlaying) {
				audioElement.play();
			}
		}
	}
}

function validatePageSize() {
	const value = Math.max(20, Math.min(100, pageSizeInput));
	if (value !== pageSizeInput) {
		pageSizeInput = value;
	}
	pageSize = value;
}

// 进度条控制
function handleProgressMouseDown(event: MouseEvent) {
	isProgressDragging = true;
	updateProgress(event);
}

function handleProgressMouseMove(event: MouseEvent) {
	if (!isProgressDragging) return;
	updateProgress(event);
}

function handleProgressMouseUp() {
	isProgressDragging = false;
}

function updateProgress(event: MouseEvent) {
	if (!progressBar || !audioElement || playerState.duration === 0) return;

	const rect = progressBar.getBoundingClientRect();
	const percent = Math.max(
		0,
		Math.min(1, (event.clientX - rect.left) / rect.width),
	);
	const newTime = percent * playerState.duration;

	audioElement.currentTime = newTime;
	playerState.currentTime = newTime;
}

// 音量控制
function handleVolumeMouseDown(event: MouseEvent) {
	isVolumeDragging = true;
	updateVolume(event);
}

function handleVolumeMouseMove(event: MouseEvent) {
	if (!isVolumeDragging) return;
	updateVolume(event);
}

function handleVolumeMouseUp() {
	isVolumeDragging = false;
}

function updateVolume(event: MouseEvent) {
	if (!volumeSlider || !audioElement) return;

	const rect = volumeSlider.getBoundingClientRect();
	const percent = Math.max(
		0,
		Math.min(1, (event.clientX - rect.left) / rect.width),
	);

	playerState.volume = percent;
	audioElement.volume = percent;
}

// 音频事件处理
function handleAudioEvents() {
	if (!audioElement) return;

	audioElement.addEventListener("loadstart", () => {
		playerState.isLoading = true;
	});

	audioElement.addEventListener("loadedmetadata", () => {
		playerState.duration = audioElement.duration;
		playerState.isLoading = false;
	});

	audioElement.addEventListener("timeupdate", () => {
		if (!isProgressDragging) {
			playerState.currentTime = audioElement.currentTime;
		}
	});

	audioElement.addEventListener("play", () => {
		playerState.isPlaying = true;
	});

	audioElement.addEventListener("pause", () => {
		playerState.isPlaying = false;
	});

	audioElement.addEventListener("ended", () => {
		if (playerState.isRepeat) {
			audioElement.play();
		} else {
			playNext();
		}
	});

	audioElement.addEventListener("error", (e) => {
		console.error("音频播放错误:", e);
		playerState.isPlaying = false;
		playerState.isLoading = false;
	});
}

// 键盘快捷键
function handleKeydown(event: KeyboardEvent) {
	if (!musicConfig.enableKeyboardShortcuts || !playerState.isVisible) return;
	if (typeof document === "undefined") return; // SSR 检查

	switch (event.code) {
		case "Space":
			if (event.target === document.body) {
				event.preventDefault();
				togglePlay();
			}
			break;
		case "ArrowLeft":
			if (event.target === document.body) {
				event.preventDefault();
				playPrevious();
			}
			break;
		case "ArrowRight":
			if (event.target === document.body) {
				event.preventDefault();
				playNext();
			}
			break;
	}
}

// 拖拽功能
function handleDragStart(event: MouseEvent) {
	if (typeof window === "undefined") return;

	isDragging = true;
	const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
	dragOffset.x = event.clientX - rect.left;
	dragOffset.y = event.clientY - rect.top;

	document.addEventListener("mousemove", handleDragMove);
	document.addEventListener("mouseup", handleDragEnd);
	event.preventDefault();
}

function handleDragMove(event: MouseEvent) {
	if (!isDragging || typeof window === "undefined") return;

	const newX = window.innerWidth - (event.clientX - dragOffset.x + 400); // 400是播放器宽度
	const newY = window.innerHeight - (event.clientY - dragOffset.y + 200); // 200是播放器高度

	// 限制在屏幕范围内
	playerPosition.x = Math.max(20, Math.min(window.innerWidth - 400, newX));
	playerPosition.y = Math.max(20, Math.min(window.innerHeight - 200, newY));
}

function handleDragEnd() {
	isDragging = false;
	if (typeof document === "undefined") return;

	document.removeEventListener("mousemove", handleDragMove);
	document.removeEventListener("mouseup", handleDragEnd);
}

// 自动播放功能
async function startAutoPlay() {
	if (!musicConfig.enableAutoPlay || !playerState.currentSong) return;

	try {
		// 现代浏览器需要用户交互才能自动播放
		// 我们可以尝试播放，如果失败就显示播放按钮
		await audioElement.play();
		playerState.isPlaying = true;
	} catch (error) {
		console.log("自动播放被阻止，需要用户交互:", error);
		// 显示一个提示或者保持暂停状态
	}
}

// 移动端检测
function detectMobile() {
	if (typeof window === "undefined") return false;

	const userAgent =
		navigator.userAgent ||
		navigator.vendor ||
		(window as Window & { opera?: string }).opera ||
		"";
	const isMobileUA =
		/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
			userAgent,
		);
	const isTouchDevice =
		"ontouchstart" in window || navigator.maxTouchPoints > 0;
	const isSmallScreen = window.innerWidth <= 768;

	return isMobileUA || (isTouchDevice && isSmallScreen);
}

// 窗口大小变化处理
function handleResize() {
	if (typeof window === "undefined") return;

	windowWidth = window.innerWidth;
	windowHeight = window.innerHeight;
	isMobile = detectMobile();

	// 移动端自动调整位置
	if (isMobile) {
		if (playerState.isExpanded) {
			// 移动端展开时占据更多空间
			playerPosition.x = 10;
			playerPosition.y = 10;
		} else {
			// 移动端收起时靠边
			playerPosition.x = 10;
			playerPosition.y = 80;
		}
	}
}

// 边距把手功能 - 收回到边缘
function minimizeToEdge() {
	if (typeof window === "undefined") return;

	isMinimizedToEdge = true;
	playerState.isExpanded = false;

	// 收回到右边缘，只显示一个小把手
	playerPosition.x = -280; // 大部分隐藏在右边缘外
	playerPosition.y = Math.min(playerPosition.y, windowHeight - 100);
}

// 从边缘展开
function expandFromEdge() {
	isMinimizedToEdge = false;
	playerPosition.x = 20; // 恢复正常位置
}

// 点击展开播放器
function toggleExpanded() {
	if (isMinimizedToEdge) {
		expandFromEdge();
	}
	playerState.isExpanded = !playerState.isExpanded;
}

// 组件生命周期
onMount(async () => {
	// 确保在浏览器环境中运行
	if (typeof window === "undefined" || typeof document === "undefined") {
		return;
	}

	// 初始化窗口大小和移动端检测
	handleResize();
	window.addEventListener("resize", handleResize);

	// 创建音频元素
	audioElement = new Audio();
	audioElement.volume = playerState.volume;
	handleAudioEvents();

	// 加载初始歌单
	await loadPlaylist();

	// 显示播放器
	playerState.isVisible = true;

	// 尝试自动播放第一首歌
	if (playerState.playlist.length > 0) {
		playerState.currentSong = playerState.playlist[0];
		playerState.currentIndex = 0;
		audioElement.src = playerState.currentSong.url;

		// 延迟一点时间再尝试自动播放，确保音频加载完成
		setTimeout(() => {
			startAutoPlay();
		}, 500);
	}

	// 添加全局事件监听器
	document.addEventListener("keydown", handleKeydown);
	document.addEventListener("mousemove", handleProgressMouseMove);
	document.addEventListener("mouseup", handleProgressMouseUp);
	document.addEventListener("mousemove", handleVolumeMouseMove);
	document.addEventListener("mouseup", handleVolumeMouseUp);
});

onDestroy(() => {
	// 确保在浏览器环境中运行
	if (typeof window === "undefined" || typeof document === "undefined") {
		return;
	}

	// 清理资源
	if (audioElement) {
		audioElement.pause();
		audioElement.src = "";
	}

	if (animationFrame) {
		cancelAnimationFrame(animationFrame);
	}

	// 移除事件监听器
	window.removeEventListener("resize", handleResize);
	document.removeEventListener("keydown", handleKeydown);
	document.removeEventListener("mousemove", handleProgressMouseMove);
	document.removeEventListener("mouseup", handleProgressMouseUp);
	document.removeEventListener("mousemove", handleVolumeMouseMove);
	document.removeEventListener("mouseup", handleVolumeMouseUp);
});
</script>

<!-- 音乐播放器主容器 -->
{#if playerState.isVisible}
<div 
	class="music-player-container fixed z-50 transition-all duration-300 ease-out"
	class:expanded={playerState.isExpanded}
	class:dragging={isDragging}
	class:mobile={isMobile}
	class:minimized-to-edge={isMinimizedToEdge}
	style="bottom: {playerPosition.y}px; right: {playerPosition.x}px;"
>
	<!-- 主播放器卡片 -->
	<div class="music-player-card card-base shadow-2xl backdrop-blur-sm">
		<!-- 最小化状态 -->
		{#if !playerState.isExpanded}
		<div 
			class="mini-player flex items-center gap-3 p-4 cursor-move"
			on:mousedown={handleDragStart}
			role="button"
			tabindex="0"
			aria-label="拖拽音乐播放器"
			transition:slide={{ duration: 400, axis: 'y' }}
		>
			<!-- 专辑封面 -->
			<div class="album-cover relative overflow-hidden rounded-lg">
				{#if playerState.currentSong?.pic_url}
				<img 
					src={playerState.currentSong.pic_url} 
					alt="专辑封面"
					class="w-12 h-12 object-cover"
				/>
				{:else}
				<div class="w-12 h-12 bg-[var(--btn-regular-bg)] flex items-center justify-center rounded-lg">
					<Icon icon="material-symbols:music-note" class="text-[var(--primary)] text-xl" />
				</div>
				{/if}

				<!-- 播放状态指示器 -->
				{#if playerState.isPlaying}
				<div class="absolute inset-0 bg-black/20 flex items-center justify-center">
					<div class="audio-visualizer">
						<div class="bar"></div>
						<div class="bar"></div>
						<div class="bar"></div>
					</div>
				</div>
				{/if}
			</div>
			
			<!-- 歌曲信息 -->
			<div class="song-info flex-1 min-w-0">
				{#if playerState.currentSong}
				<div class="song-title text-sm font-medium text-[var(--deep-text)] truncate">
					{playerState.currentSong.name}
				</div>
				<div class="artist-name text-xs text-[var(--btn-content)] truncate">
					{playerState.currentSong.artist}
				</div>
				{:else}
				<div class="text-sm text-[var(--btn-content)]">暂无歌曲</div>
				{/if}
			</div>
			
			<!-- 播放控制按钮 -->
			<div class="play-controls flex items-center gap-2">
				<button 
					class="control-btn btn-plain rounded-full w-8 h-8 flex items-center justify-center"
					on:click={(e) => { e.stopPropagation(); playPrevious(); }}
					disabled={playerState.isLoading}
				>
					<Icon icon="material-symbols:skip-previous" class="text-lg" />
				</button>
				
				<button 
					class="play-pause-btn btn-plain rounded-full w-10 h-10 flex items-center justify-center bg-[var(--primary)] text-white"
					on:click={(e) => { e.stopPropagation(); togglePlay(); }}
					disabled={!playerState.currentSong || playerState.isLoading}
				>
					{#if playerState.isLoading}
					<Icon icon="material-symbols:hourglass-empty" class="text-lg animate-spin" />
					{:else if playerState.isPlaying}
					<Icon icon="material-symbols:pause" class="text-lg" />
					{:else}
					<Icon icon="material-symbols:play-arrow" class="text-lg" />
					{/if}
				</button>
				
				<button 
					class="control-btn btn-plain rounded-full w-8 h-8 flex items-center justify-center"
					on:click={(e) => { e.stopPropagation(); playNext(); }}
					disabled={playerState.isLoading}
				>
					<Icon icon="material-symbols:skip-next" class="text-lg" />
				</button>
			</div>
			
			<!-- 展开按钮 -->
			<button 
				class="expand-btn btn-plain rounded-full w-8 h-8 flex items-center justify-center"
				on:click={(e) => { e.stopPropagation(); playerState.isExpanded = true; }}
			>
				<Icon icon="material-symbols:expand-less" class="text-lg" />
			</button>
		</div>
		{/if}
		
		<!-- 展开状态 -->
		{#if playerState.isExpanded}
		<div class="expanded-player p-6" transition:slide={{ duration: 400, axis: 'y' }}>
			<!-- 头部控制栏 -->
			<div class="header flex items-center justify-between mb-6">
				<div 
					class="drag-handle flex items-center gap-2 cursor-move flex-1"
					on:mousedown={handleDragStart}
					role="button"
					tabindex="0"
					aria-label="拖拽音乐播放器"
				>
					<Icon icon="material-symbols:drag-indicator" class="text-[var(--btn-content)] text-lg" />
					<h3 class="text-lg font-semibold text-[var(--deep-text)]">音乐播放器</h3>
				</div>
				<div class="header-controls flex items-center gap-2">
					<button 
						class="edge-btn btn-plain rounded-full w-8 h-8 flex items-center justify-center"
						on:click={minimizeToEdge}
						title="收回到边缘"
					>
						<Icon icon="material-symbols:keyboard-double-arrow-right" class="text-lg" />
					</button>
					<button 
						class="collapse-btn btn-plain rounded-full w-8 h-8 flex items-center justify-center"
						on:click={() => playerState.isExpanded = false}
						title="收起播放器"
					>
						<Icon icon="material-symbols:expand-more" class="text-lg" />
					</button>
				</div>
			</div>
			
			<!-- 当前歌曲信息 -->
			<div class="current-song flex items-center gap-4 mb-6">
				<div class="album-cover-large relative overflow-hidden rounded-xl">
					{#if playerState.currentSong?.pic_url}
					<img 
						src={playerState.currentSong.pic_url} 
						alt="专辑封面"
						class="w-20 h-20 object-cover"
					/>
					{:else}
					<div class="w-20 h-20 bg-[var(--btn-regular-bg)] flex items-center justify-center rounded-xl">
						<Icon icon="material-symbols:music-note" class="text-[var(--primary)] text-3xl" />
					</div>
					{/if}
				</div>
				
				<div class="song-details flex-1 min-w-0">
					{#if playerState.currentSong}
					<h4 class="song-title text-base font-medium text-[var(--deep-text)] mb-1 truncate">
						{playerState.currentSong.name}
					</h4>
					<p class="artist-name text-sm text-[var(--btn-content)] truncate">
						{playerState.currentSong.artist}
					</p>
					{:else}
					<p class="text-sm text-[var(--btn-content)]">暂无歌曲</p>
					{/if}
				</div>
			</div>
			
			<!-- 进度控制 -->
			<div class="progress-section mb-6">
				<div class="time-display flex justify-between text-xs text-[var(--btn-content)] mb-2">
					<span>{currentTimeFormatted}</span>
					<span>{durationFormatted}</span>
				</div>
				
				<div 
					class="progress-bar-container relative h-2 bg-[var(--btn-regular-bg)] rounded-full cursor-pointer"
					bind:this={progressBar}
					on:mousedown={handleProgressMouseDown}
					role="slider"
					tabindex="0"
					aria-label="音乐进度"
					aria-valuenow={progressPercent}
					aria-valuemin="0"
					aria-valuemax="100"
				>
					<div 
						class="progress-bar-fill absolute top-0 left-0 h-full bg-[var(--primary)] rounded-full transition-all"
						style="width: {progressPercent}%"
					></div>
					<div 
						class="progress-thumb absolute top-1/2 w-4 h-4 bg-[var(--primary)] rounded-full shadow-md transform -translate-y-1/2 transition-all"
						style="left: calc({progressPercent}% - 8px)"
					></div>
				</div>
			</div>
			
			<!-- 播放控制 -->
			<div class="playback-controls flex items-center justify-center gap-4 mb-6">
				<button 
					class="control-btn btn-plain rounded-full w-12 h-12 flex items-center justify-center"
					class:active={playerState.isShuffle}
					on:click={() => playerState.isShuffle = !playerState.isShuffle}
				>
					<Icon icon="material-symbols:shuffle" class="text-xl" />
				</button>
				
				<button 
					class="control-btn btn-plain rounded-full w-12 h-12 flex items-center justify-center"
					on:click={playPrevious}
					disabled={playerState.isLoading}
				>
					<Icon icon="material-symbols:skip-previous" class="text-2xl" />
				</button>
				
				<button 
					class="play-pause-btn-large btn-plain rounded-full w-16 h-16 flex items-center justify-center bg-[var(--primary)] text-white shadow-lg"
					on:click={togglePlay}
					disabled={!playerState.currentSong || playerState.isLoading}
				>
					{#if playerState.isLoading}
					<Icon icon="material-symbols:hourglass-empty" class="text-2xl animate-spin" />
					{:else if playerState.isPlaying}
					<Icon icon="material-symbols:pause" class="text-2xl" />
					{:else}
					<Icon icon="material-symbols:play-arrow" class="text-2xl" />
					{/if}
				</button>
				
				<button 
					class="control-btn btn-plain rounded-full w-12 h-12 flex items-center justify-center"
					on:click={playNext}
					disabled={playerState.isLoading}
				>
					<Icon icon="material-symbols:skip-next" class="text-2xl" />
				</button>
				
				<button 
					class="control-btn btn-plain rounded-full w-12 h-12 flex items-center justify-center"
					class:active={playerState.isRepeat}
					on:click={() => playerState.isRepeat = !playerState.isRepeat}
				>
					<Icon icon="material-symbols:repeat" class="text-xl" />
				</button>
			</div>
			
			<!-- 音量控制 -->
			<div class="volume-section flex items-center gap-3 mb-6">
				<Icon icon="material-symbols:volume-down" class="text-lg text-[var(--btn-content)]" />
				<div 
					class="volume-slider-container flex-1 relative h-2 bg-[var(--btn-regular-bg)] rounded-full cursor-pointer"
					bind:this={volumeSlider}
					on:mousedown={handleVolumeMouseDown}
					role="slider"
					tabindex="0"
					aria-label="音量控制"
					aria-valuenow={playerState.volume * 100}
					aria-valuemin="0"
					aria-valuemax="100"
				>
					<div 
						class="volume-fill absolute top-0 left-0 h-full bg-[var(--primary)] rounded-full"
						style="width: {playerState.volume * 100}%"
					></div>
					<div 
						class="volume-thumb absolute top-1/2 w-4 h-4 bg-[var(--primary)] rounded-full shadow-md transform -translate-y-1/2"
						style="left: calc({playerState.volume * 100}% - 8px)"
					></div>
				</div>
				<Icon icon="material-symbols:volume-up" class="text-lg text-[var(--btn-content)]" />
			</div>
			
			<!-- 分页控制 -->
			<div class="pagination-section">
				<div class="pagination-header flex items-center justify-between mb-3">
					<span class="text-sm font-medium text-[var(--deep-text)]">歌单</span>
					<div class="page-info text-xs text-[var(--btn-content)]">
						第 {playerState.currentPage} 页 / 共 {playerState.totalPages} 页
					</div>
				</div>
				
				<div class="pagination-controls flex items-center gap-2 mb-4">
					<button 
						class="page-btn btn-card rounded-lg px-3 py-2 text-sm"
						class:disabled={playerState.currentPage <= 1}
						on:click={() => changePage(playerState.currentPage - 1)}
						disabled={playerState.currentPage <= 1 || playerState.isLoading}
					>
						<Icon icon="material-symbols:chevron-left" class="text-base" />
					</button>
					
					<div class="page-size-control flex items-center gap-2 flex-1">
						<label for="page-size-input" class="text-xs text-[var(--btn-content)]">每页:</label>
						<input 
							id="page-size-input"
							type="number" 
							min="20" 
							max="100" 
							bind:value={pageSizeInput}
							on:blur={validatePageSize}
							on:keydown={(e) => e.key === 'Enter' && validatePageSize()}
							class="page-size-input w-16 px-2 py-1 text-xs bg-[var(--btn-regular-bg)] border border-[var(--line-divider)] rounded focus:outline-none focus:border-[var(--primary)]"
						/>
						<button 
							class="apply-btn btn-card rounded px-2 py-1 text-xs"
							on:click={() => { validatePageSize(); changePage(1); }}
							disabled={playerState.isLoading}
						>
							应用
						</button>
					</div>
					
					<button 
						class="page-btn btn-card rounded-lg px-3 py-2 text-sm"
						class:disabled={playerState.currentPage >= playerState.totalPages}
						on:click={() => changePage(playerState.currentPage + 1)}
						disabled={playerState.currentPage >= playerState.totalPages || playerState.isLoading}
					>
						<Icon icon="material-symbols:chevron-right" class="text-base" />
					</button>
				</div>
				
				<!-- 歌曲列表 -->
				<div class="playlist max-h-48 overflow-y-auto">
					{#each playerState.playlist as song, index}
					<button 
						class="song-item w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors"
						class:active={index === playerState.currentIndex}
						class:playing={index === playerState.currentIndex && playerState.isPlaying}
						on:click={() => selectSong(index)}
					>
						<div class="song-index w-6 text-xs text-center text-[var(--btn-content)]">
							{#if index === playerState.currentIndex && playerState.isPlaying}
							<Icon icon="material-symbols:graphic-eq" class="text-[var(--primary)] animate-pulse" />
							{:else}
							{index + 1}
							{/if}
						</div>
						
						<div class="song-details flex-1 min-w-0">
							<div class="song-name text-sm font-medium text-[var(--deep-text)] truncate">
								{song.name}
							</div>
							<div class="artist-name text-xs text-[var(--btn-content)] truncate">
								{song.artist}
							</div>
						</div>
					</button>
					{/each}
				</div>
			</div>
		</div>
		{/if}
	</div>
	
	<!-- 边缘把手 -->
	{#if isMinimizedToEdge}
	<div 
		class="edge-handle fixed z-50 cursor-pointer"
		style="bottom: {playerPosition.y + 20}px; right: 0px;"
		on:click={expandFromEdge}
		on:keydown={(e) => e.key === 'Enter' && expandFromEdge()}
		role="button"
		tabindex="0"
		aria-label="展开音乐播放器"
	>
		<div class="handle-tab bg-[var(--primary)] text-white p-2 rounded-l-lg shadow-lg">
			<Icon icon="material-symbols:music-note" class="text-lg" />
		</div>
	</div>
	{/if}
</div>
{/if}

<style lang="stylus">
.music-player-container
	max-width: 400px
	min-width: 280px
	user-select: none
	transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1)
	
	&.expanded
		min-width: 360px
	
	&.dragging
		transition: none !important
		
		.music-player-card
			transform: scale(1.02)
			box-shadow: 0 32px 64px rgba(0, 0, 0, 0.2), 0 16px 32px rgba(0, 0, 0, 0.15)
	
	// 移动端适配
	&.mobile
		max-width: calc(100vw - 20px)
		min-width: 260px
		
		&.expanded
			max-width: calc(100vw - 20px)
			min-width: 300px
			max-height: calc(100vh - 40px)
			overflow-y: auto
		
		.mini-player
			padding: 12px
			
		.expanded-player
			padding: 16px
	
	// 边缘最小化状态
	&.minimized-to-edge
		.music-player-card
			opacity: 0.1
			pointer-events: none
			
		&:hover .music-player-card
			opacity: 0.3

.music-player-card
	background: var(--card-bg)
	border: 1px solid var(--line-divider)
	box-shadow: 0 24px 48px rgba(0, 0, 0, 0.12), 0 8px 16px rgba(0, 0, 0, 0.08)
	transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1)
	overflow: hidden
	
	:global(.dark) &
		box-shadow: 0 24px 48px rgba(0, 0, 0, 0.3), 0 8px 16px rgba(0, 0, 0, 0.2)

.control-btn
	color: var(--btn-content)
	transition: all 0.2s ease
	
	&:hover:not(:disabled)
		background: var(--btn-plain-bg-hover)
		color: var(--primary)
		transform: scale(1.05)
	
	&:active:not(:disabled)
		background: var(--btn-plain-bg-active)
		transform: scale(0.95)
	
	&.active
		color: var(--primary)
		background: var(--btn-plain-bg-hover)
	
	&:disabled
		opacity: 0.5
		cursor: not-allowed

.play-pause-btn, .play-pause-btn-large
	transition: all 0.2s ease
	
	&:hover:not(:disabled)
		transform: scale(1.05)
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15)
	
	&:active:not(:disabled)
		transform: scale(0.95)

.progress-bar-container:hover .progress-thumb, .volume-slider-container:hover .volume-thumb
	transform: translateY(-50%) scale(1.2)

.song-item
	&:hover
		background: var(--btn-plain-bg-hover)
	
	&.active
		background: var(--selection-bg)
		
		.song-name
			color: var(--primary)
			font-weight: 600

.page-btn
	&.disabled
		opacity: 0.5
		cursor: not-allowed

.page-size-input
	&:focus
		box-shadow: 0 0 0 2px var(--primary)

.drag-handle
	&:hover
		color: var(--primary)
	
	&:active
		color: var(--primary)
		opacity: 0.8

// 边缘把手样式
.edge-handle
	.handle-tab
		transition: all 0.3s ease
		transform: translateX(0)
		
		&:hover
			transform: translateX(-5px)
			box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2)

// 移动端特殊样式
@media (max-width: 768px)
	.music-player-container
		&.expanded
			position: fixed !important
			top: 20px !important
			left: 10px !important
			right: 10px !important
			bottom: 20px !important
			width: auto !important
			height: auto !important
			max-width: none !important
			max-height: none !important
			
		.mini-player
			min-height: 60px

// 安卓特殊适配
@media (max-width: 480px)
	.music-player-container
		font-size: 14px
		
		&.expanded .expanded-player
			padding: 12px
			
		.mini-player
			padding: 8px
			gap: 8px
			
		.album-cover img
			width: 40px !important
			height: 40px !important
			
		.song-details
			font-size: 12px

// 音频可视化效果
.audio-visualizer
	display: flex
	align-items: center
	gap: 2px
	
	.bar
		width: 2px
		background: white
		border-radius: 1px
		animation: audioWave 1s ease-in-out infinite alternate
		
		&:nth-child(1)
			height: 8px
			animation-delay: 0s
		
		&:nth-child(2)
			height: 12px
			animation-delay: 0.2s
		
		&:nth-child(3)
			height: 6px
			animation-delay: 0.4s

@keyframes audioWave
	0%
		transform: scaleY(0.3)
	100%
		transform: scaleY(1)

// 滚动条样式
.playlist
	&::-webkit-scrollbar
		width: 4px
	
	&::-webkit-scrollbar-track
		background: var(--btn-regular-bg)
		border-radius: 2px
	
	&::-webkit-scrollbar-thumb
		background: var(--scrollbar-bg)
		border-radius: 2px
		
		&:hover
			background: var(--scrollbar-bg-hover)

// 响应式设计
@media (max-width: 768px)
	.music-player-container
		bottom: 10vh !important
		right: 5vw !important
		left: 5vw !important
		max-width: none
		
		&.expanded
			min-width: auto

// 动画
.music-player-container
	animation: slideInUp 0.3s ease-out

@keyframes slideInUp
	from
		transform: translateY(100%)
		opacity: 0
	to
		transform: translateY(0)
		opacity: 1
</style>
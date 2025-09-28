<script lang="ts">
import Icon from "@iconify/svelte";
import { onDestroy, onMount } from "svelte";
import { fade, slide } from "svelte/transition";
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
	fullPlaylist: [], // 完整的歌曲列表
	shuffledPlaylist: [], // 随机播放列表
	shuffleIndex: 0, // 随机播放索引
};

// 拖拽状态
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let playerPosition = { x: 20, y: 20 }; // 距离右下角的像素距离

// 移动端和边距把手状态
let isMobile = false;
let isAndroid = false;
let isIOS = false;
let isMinimizedToEdge = false;
let windowWidth = 0;
let windowHeight = 0;

// 自动收缩功能
let autoCollapseTimer: ReturnType<typeof setTimeout> | undefined;
let isAutoCollapsed = false;
const AUTO_COLLAPSE_DELAY = 3000; // 3秒后自动收缩

// 音频元素和相关变量
let audioElement: HTMLAudioElement;
let progressBar: HTMLElement;
let volumeSlider: HTMLElement;
let isProgressDragging = false;
let isVolumeDragging = false;
let animationFrame: number | undefined;

// 播放控制锁，防止多个播放操作同时进行
let isPlayOperationInProgress = false;

// 边界检测和回弹系统
let boundaryCheckTimer: ReturnType<typeof setInterval> | undefined;
const BOUNDARY_CHECK_INTERVAL = 2000; // 每2秒检查一次边界
const SAFE_MARGIN = 50; // 安全边距，超出此范围会触发回弹

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

// 随机播放相关函数
function shuffleArray<T>(array: T[]): T[] {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

// 创建随机播放列表
function createShuffledPlaylist() {
	if (playerState.fullPlaylist.length === 0) return;

	playerState.shuffledPlaylist = shuffleArray(playerState.fullPlaylist);
	playerState.shuffleIndex = 0;

	if (import.meta.env.DEV) {
		console.log(
			`创建随机播放列表，歌曲数量: ${playerState.shuffledPlaylist.length}`,
		);
	}
}

// 随机排序所有歌曲（每次刷新时调用）
function shuffleAllSongs() {
	if (playerState.fullPlaylist.length === 0) return;

	// 随机排序完整歌单
	playerState.fullPlaylist = shuffleArray(playerState.fullPlaylist);

	// 更新当前显示的播放列表（前60首）
	const displayCount = Math.min(
		musicConfig.pageSize,
		playerState.fullPlaylist.length,
	);
	playerState.playlist = playerState.fullPlaylist.slice(0, displayCount);

	// 如果开启随机播放，重新创建随机播放列表
	if (playerState.isShuffle) {
		createShuffledPlaylist();
	}

	// 重置当前歌曲为第一首
	if (playerState.playlist.length > 0) {
		playerState.currentSong = playerState.playlist[0];
		playerState.currentIndex = 0;

		if (audioElement) {
			audioElement.src = playerState.currentSong.url;
		}
	}

	if (import.meta.env.DEV) {
		console.log(`歌曲随机排序完成，显示${displayCount}首歌曲`);
	}
}

// 获取当前播放的歌曲（根据播放模式）
function getCurrentSong(): Song | null {
	if (playerState.isShuffle && playerState.shuffledPlaylist.length > 0) {
		return playerState.shuffledPlaylist[playerState.shuffleIndex] || null;
	}
	return playerState.playlist[playerState.currentIndex] || null;
}

// 切换随机播放模式
function toggleShuffle() {
	playerState.isShuffle = !playerState.isShuffle;

	if (playerState.isShuffle) {
		// 开启随机播放时创建随机列表
		createShuffledPlaylist();
		// 如果当前有歌曲在播放，在随机列表中找到它的位置
		if (playerState.currentSong) {
			const currentSongIndex = playerState.shuffledPlaylist.findIndex(
				(song) => song.id === playerState.currentSong?.id,
			);
			if (currentSongIndex !== -1) {
				playerState.shuffleIndex = currentSongIndex;
			}
		}
	}

	console.log(`随机播放模式: ${playerState.isShuffle ? "开启" : "关闭"}`);
}

// 重新随机排序（手动触发）
function reshuffleSongs() {
	if (playerState.fullPlaylist.length === 0) return;

	console.log("手动重新随机排序歌曲...");
	shuffleAllSongs();

	// 如果当前在播放，停止播放
	if (audioElement && !audioElement.paused) {
		audioElement.pause();
		playerState.isPlaying = false;
	}

	// 重新设置音频源
	if (audioElement && playerState.currentSong) {
		audioElement.src = playerState.currentSong.url;
	}
}

// 加载完整歌单数据（获取所有歌曲）
async function loadFullPlaylist() {
	try {
		playerState.isLoading = true;
		if (import.meta.env.DEV) {
			console.log("开始加载所有歌曲数据...");
		}

		// 获取所有歌曲数据
		const allSongsData = await musicAPI.getAllSongs(
			musicConfig.defaultPlaylistId,
		);

		// 更新完整歌单
		playerState.fullPlaylist = allSongsData.songs;
		playerState.totalPages = allSongsData.totalPages;

		// 每次刷新时随机排序所有歌曲
		shuffleAllSongs();

		// 如果开启随机播放，创建随机播放列表
		if (playerState.isShuffle) {
			createShuffledPlaylist();
		}

		// 选择第一首歌并设置音频源
		if (playerState.playlist.length > 0) {
			if (playerState.isShuffle && playerState.shuffledPlaylist.length > 0) {
				playerState.currentSong = playerState.shuffledPlaylist[0];
				playerState.shuffleIndex = 0;
			} else {
				playerState.currentSong = playerState.playlist[0];
				playerState.currentIndex = 0;
			}

			// 设置音频源
			if (audioElement && playerState.currentSong?.url) {
				audioElement.src = playerState.currentSong.url;

				// 延迟自动播放
				if (musicConfig.enableAutoPlay) {
					setTimeout(() => {
						startAutoPlay();
					}, 300);
				}
			}
		}

		playerState.isLoading = false;
		if (import.meta.env.DEV) {
			console.log(
				`所有歌曲加载完成，总歌曲数: ${playerState.fullPlaylist.length}，显示: ${playerState.playlist.length}首`,
			);
		}
	} catch (error) {
		console.error("加载所有歌曲失败:", error);
		playerState.isLoading = false;
	}
}

// 加载单页歌单数据（用于分页显示）
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

		playerState.isLoading = false;
	} catch (error) {
		console.error("加载歌单失败:", error);
		playerState.isLoading = false;
	}
}

// 播放控制
async function togglePlay() {
	if (!playerState.currentSong) return;

	if (playerState.isPlaying) {
		audioElement.pause();
		playerState.isPlaying = false;
	} else {
		await safePlay("用户点击");
	}

	// 用户交互时重置自动收缩定时器
	if (isMobile && !playerState.isExpanded) {
		startAutoCollapseTimer();
	}
}

function playPrevious() {
	if (playerState.isShuffle && playerState.shuffledPlaylist.length > 0) {
		// 随机播放模式
		let newShuffleIndex = playerState.shuffleIndex - 1;
		if (newShuffleIndex < 0) {
			newShuffleIndex = playerState.shuffledPlaylist.length - 1;
		}

		playerState.shuffleIndex = newShuffleIndex;
		playerState.currentSong = playerState.shuffledPlaylist[newShuffleIndex];

		// 更新当前页面显示的索引（如果歌曲在当前页面）
		const songInCurrentPage = playerState.playlist.findIndex(
			(song) => song.id === playerState.currentSong?.id,
		);
		if (songInCurrentPage !== -1) {
			playerState.currentIndex = songInCurrentPage;
		}
	} else {
		// 普通播放模式
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
	}

	// 自动播放上一首
	setTimeout(async () => {
		await safePlay("上一首");
	}, 100);
}

function playNext() {
	if (playerState.isShuffle && playerState.shuffledPlaylist.length > 0) {
		// 随机播放模式
		let newShuffleIndex = playerState.shuffleIndex + 1;
		if (newShuffleIndex >= playerState.shuffledPlaylist.length) {
			newShuffleIndex = 0;
		}

		playerState.shuffleIndex = newShuffleIndex;
		playerState.currentSong = playerState.shuffledPlaylist[newShuffleIndex];

		// 更新当前页面显示的索引（如果歌曲在当前页面）
		const songInCurrentPage = playerState.playlist.findIndex(
			(song) => song.id === playerState.currentSong?.id,
		);
		if (songInCurrentPage !== -1) {
			playerState.currentIndex = songInCurrentPage;
		}
	} else {
		// 普通播放模式
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
	}

	// 自动播放下一首
	setTimeout(async () => {
		await safePlay("下一首");
	}, 100);
}

function selectSong(index: number) {
	if (index < 0 || index >= playerState.playlist.length) return;

	const wasPlaying = playerState.isPlaying;
	playerState.currentSong = playerState.playlist[index];
	playerState.currentIndex = index;

	if (audioElement) {
		// 先暂停当前播放
		if (!audioElement.paused) {
			audioElement.pause();
		}

		// 设置新的音频源
		audioElement.src = playerState.currentSong.url;

		// 如果之前在播放，使用安全播放
		if (wasPlaying) {
			setTimeout(async () => {
				await safePlay("选择歌曲");
			}, 50);
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
			// 先暂停当前播放
			if (!audioElement.paused) {
				audioElement.pause();
			}

			// 设置新的音频源
			audioElement.src = playerState.currentSong.url;

			// 如果之前在播放，使用安全播放
			if (wasPlaying) {
				setTimeout(async () => {
					await safePlay("切换页面");
				}, 50);
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

	audioElement.addEventListener("ended", async () => {
		if (playerState.isRepeat) {
			await safePlay("重复播放");
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
let dragStartPosition = { x: 0, y: 0 };
let hasDraggedEnough = false;
const DRAG_THRESHOLD = 5; // 像素阈值，超过此距离才认为是拖拽

function handleDragStart(event: MouseEvent) {
	if (typeof window === "undefined") return;

	// 记录初始位置
	dragStartPosition.x = event.clientX;
	dragStartPosition.y = event.clientY;
	hasDraggedEnough = false;

	const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();

	// 计算鼠标相对于播放器的偏移量
	dragOffset.x = event.clientX - rect.left;
	dragOffset.y = event.clientY - rect.top;

	document.addEventListener("mousemove", handleDragMove);
	document.addEventListener("mouseup", handleDragEnd);
	event.preventDefault();
}

function handleDragMove(event: MouseEvent) {
	if (typeof window === "undefined") return;

	// 检查是否移动了足够的距离才开始拖拽
	if (!hasDraggedEnough) {
		const deltaX = Math.abs(event.clientX - dragStartPosition.x);
		const deltaY = Math.abs(event.clientY - dragStartPosition.y);

		if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
			hasDraggedEnough = true;
			isDragging = true;
		} else {
			return; // 还没有移动足够的距离，不开始拖拽
		}
	}

	if (!isDragging) return;

	// 获取播放器实际尺寸
	const playerWidth = playerState.isExpanded ? 360 : 280;
	const playerHeight = playerState.isExpanded ? 600 : 80;

	// 计算新位置（从右下角定位）
	const newRightDistance =
		window.innerWidth - event.clientX + dragOffset.x - playerWidth;
	const newBottomDistance =
		window.innerHeight - event.clientY + dragOffset.y - playerHeight;

	// 限制在屏幕范围内
	playerPosition.x = Math.max(
		10,
		Math.min(window.innerWidth - playerWidth - 10, newRightDistance),
	);
	playerPosition.y = Math.max(
		10,
		Math.min(window.innerHeight - playerHeight - 10, newBottomDistance),
	);
}

function handleDragEnd() {
	const wasActuallyDragging = isDragging && hasDraggedEnough;

	isDragging = false;
	hasDraggedEnough = false;

	if (typeof document === "undefined") return;

	document.removeEventListener("mousemove", handleDragMove);
	document.removeEventListener("mouseup", handleDragEnd);

	// 只有在实际拖拽后才检查边界并回弹
	if (wasActuallyDragging) {
		setTimeout(() => {
			ensurePlayerInSafeBounds("拖拽结束");
		}, 100);
	}
}

// 安全播放函数，防止多个播放操作同时进行
async function safePlay(reason = "用户操作") {
	if (isPlayOperationInProgress || !audioElement || !playerState.currentSong) {
		console.log(`播放操作被跳过 (${reason})：操作进行中或无有效歌曲`);
		return false;
	}

	isPlayOperationInProgress = true;

	try {
		// 确保先暂停之前的播放
		if (!audioElement.paused) {
			audioElement.pause();
		}

		// 设置音频源
		if (audioElement.src !== playerState.currentSong.url) {
			audioElement.src = playerState.currentSong.url;
		}

		// 尝试播放
		await audioElement.play();
		playerState.isPlaying = true;
		if (import.meta.env.DEV) {
			console.log(`播放成功 (${reason}):`, playerState.currentSong.name);
		}
		return true;
	} catch (error) {
		if (import.meta.env.DEV) {
			console.log(`播放失败 (${reason}):`, error);
		} else {
			console.error(
				"播放失败:",
				error instanceof Error ? error.message : String(error),
			);
		}
		playerState.isPlaying = false;
		return false;
	} finally {
		isPlayOperationInProgress = false;
	}
}

// 自动播放功能
async function startAutoPlay() {
	if (!musicConfig.enableAutoPlay || !playerState.currentSong) return;

	// 延迟一点确保音频元素准备好
	setTimeout(async () => {
		await safePlay("自动播放");
	}, 100);
}

// 增强的移动端检测，特别针对安卓端
function detectMobile() {
	if (typeof window === "undefined")
		return { isMobile: false, isAndroid: false, isIOS: false };

	const userAgent =
		navigator.userAgent ||
		navigator.vendor ||
		(window as Window & { opera?: string }).opera ||
		"";

	// 详细的设备检测
	const isAndroidUA = /android/i.test(userAgent);
	const isIOSUA = /iphone|ipad|ipod/i.test(userAgent);
	const isOtherMobileUA = /webos|blackberry|iemobile|opera mini/i.test(
		userAgent,
	);

	const isTouchDevice =
		"ontouchstart" in window || navigator.maxTouchPoints > 0;
	const isSmallScreen = window.innerWidth <= 768;

	// 安卓特殊检测
	const isAndroidBrowser = isAndroidUA && /version\/\d+\.\d+/i.test(userAgent);
	const isAndroidChrome = isAndroidUA && /chrome/i.test(userAgent);
	const isAndroidWebView = isAndroidUA && /wv\)/i.test(userAgent);

	const detectedAndroid =
		isAndroidUA || isAndroidBrowser || isAndroidChrome || isAndroidWebView;
	const detectedIOS = isIOSUA;
	const detectedMobile =
		detectedAndroid ||
		detectedIOS ||
		isOtherMobileUA ||
		(isTouchDevice && isSmallScreen);

	if (import.meta.env.DEV) {
		console.log("设备检测结果:", {
			userAgent,
			detectedMobile,
			detectedAndroid,
			detectedIOS,
			isTouchDevice,
			isSmallScreen,
			windowSize: { width: window.innerWidth, height: window.innerHeight },
		});
	}

	return {
		isMobile: detectedMobile,
		isAndroid: detectedAndroid,
		isIOS: detectedIOS,
	};
}

// 窗口大小变化处理
function handleResize() {
	if (typeof window === "undefined") return;

	windowWidth = window.innerWidth;
	windowHeight = window.innerHeight;

	const deviceInfo = detectMobile();
	isMobile = deviceInfo.isMobile;
	isAndroid = deviceInfo.isAndroid;
	isIOS = deviceInfo.isIOS;

	// 确保播放器位置在屏幕范围内
	const playerWidth = playerState.isExpanded ? 360 : 280;
	const playerHeight = playerState.isExpanded ? 600 : 80;

	// 限制播放器位置不超出屏幕
	playerPosition.x = Math.max(
		10,
		Math.min(windowWidth - playerWidth - 10, playerPosition.x),
	);
	playerPosition.y = Math.max(
		10,
		Math.min(windowHeight - playerHeight - 10, playerPosition.y),
	);

	// 移动端特殊处理（仅在没有用户自定义位置时）
	if (
		isMobile &&
		!isDragging &&
		playerPosition.x === 20 &&
		playerPosition.y === 20
	) {
		if (isAndroid) {
			// 安卓端特殊处理，避免被系统UI遮挡
			playerPosition.x = 15;
			playerPosition.y = 100; // 安卓底部导航栏通常更高
		} else if (isIOS) {
			// iOS端处理
			playerPosition.x = 15;
			playerPosition.y = 90; // iOS底部安全区域
		} else {
			// 其他移动设备
			playerPosition.x = 15;
			playerPosition.y = 80;
		}
	}

	// 窗口大小变化时确保播放器在安全边界内
	setTimeout(() => {
		ensurePlayerInSafeBounds("窗口大小变化");
	}, 100);
}

// 启动自动收缩定时器（仅移动端）
function startAutoCollapseTimer() {
	if (!isMobile) return;

	// 清除现有定时器
	clearAutoCollapseTimer();

	// 设置新的定时器
	autoCollapseTimer = setTimeout(() => {
		if (isMobile && !playerState.isExpanded && !isDragging) {
			autoCollapseToHandle();
		}
	}, AUTO_COLLAPSE_DELAY);
}

// 清除自动收缩定时器
function clearAutoCollapseTimer() {
	if (autoCollapseTimer) {
		clearTimeout(autoCollapseTimer);
		autoCollapseTimer = undefined;
	}
}

// 自动收缩到把手模式（移动端专用）
function autoCollapseToHandle() {
	if (!isMobile) return;

	isAutoCollapsed = true;
	isMinimizedToEdge = true;
	playerState.isExpanded = false;

	// 收缩到右边缘，但保留歌曲信息可见
	playerPosition.x = -200; // 部分隐藏，保留歌曲信息区域
	playerPosition.y = Math.min(playerPosition.y, windowHeight - 120);

	console.log("移动端自动收缩到把手模式");
}

// 边距把手功能 - 收回到边缘
function minimizeToEdge() {
	if (typeof window === "undefined") return;

	isMinimizedToEdge = true;
	playerState.isExpanded = false;
	isAutoCollapsed = false; // 手动收缩时清除自动收缩状态

	// 收回到右边缘，只显示一个小把手
	playerPosition.x = -280; // 大部分隐藏在右边缘外
	playerPosition.y = Math.min(playerPosition.y, windowHeight - 100);
}

// 从边缘展开
function expandFromEdge() {
	isMinimizedToEdge = false;
	isAutoCollapsed = false;
	playerPosition.x = 20; // 恢复正常位置

	// 展开后重新启动自动收缩定时器（仅移动端）
	if (isMobile) {
		startAutoCollapseTimer();
	}
}

// 点击展开播放器
function toggleExpanded() {
	// 如果是边缘最小化状态，先展开到正常位置
	if (isMinimizedToEdge) {
		expandFromEdge();
	}

	// 如果是自动收缩状态，也要先恢复
	if (isAutoCollapsed) {
		isAutoCollapsed = false;
		// 确保播放器在可见位置
		if (playerPosition.x < -100) {
			playerPosition.x = 20;
		}
	}

	const wasExpanded = playerState.isExpanded;
	playerState.isExpanded = !playerState.isExpanded;

	// 展开时智能调整位置，确保不超出屏幕
	if (playerState.isExpanded && !wasExpanded) {
		// 强制确保播放器在可见区域内
		ensurePlayerVisible();
		adjustPositionForExpanded();
		clearAutoCollapseTimer();
	} else if (!playerState.isExpanded && isMobile) {
		startAutoCollapseTimer();
	}

	if (import.meta.env.DEV) {
		console.log("切换展开状态:", {
			wasExpanded,
			nowExpanded: playerState.isExpanded,
			isMinimizedToEdge,
			isAutoCollapsed,
			position: playerPosition,
		});
	}
}

// 展开时智能调整位置
function adjustPositionForExpanded() {
	if (typeof window === "undefined") return;

	const expandedWidth = 360;
	const expandedHeight = 600;
	const margin = 20; // 边距

	// 获取安全显示区域
	const safeAreaWidth = window.innerWidth - margin * 2;
	const safeAreaHeight = window.innerHeight - margin * 2;

	// 如果屏幕太小，优先保证播放器能完整显示
	if (safeAreaWidth < expandedWidth || safeAreaHeight < expandedHeight) {
		// 屏幕太小时，居中显示并允许滚动
		playerPosition.x = Math.max(5, (window.innerWidth - expandedWidth) / 2);
		playerPosition.y = Math.max(5, (window.innerHeight - expandedHeight) / 2);
		console.log("屏幕空间不足，居中显示播放器");
		return;
	}

	// 正常情况下的智能调整
	let newX = playerPosition.x;
	let newY = playerPosition.y;

	// 检查右侧边界
	if (window.innerWidth - newX < expandedWidth + margin) {
		newX = window.innerWidth - expandedWidth - margin;
	}

	// 检查左侧边界
	if (newX < margin) {
		newX = margin;
	}

	// 检查底部边界
	if (window.innerHeight - newY < expandedHeight + margin) {
		newY = window.innerHeight - expandedHeight - margin;
	}

	// 检查顶部边界
	if (newY < margin) {
		newY = margin;
	}

	// 更新位置
	playerPosition.x = newX;
	playerPosition.y = newY;

	if (import.meta.env.DEV) {
		console.log("展开播放器，智能调整位置:", {
			原位置: { x: playerPosition.x, y: playerPosition.y },
			新位置: { x: newX, y: newY },
			屏幕尺寸: { width: window.innerWidth, height: window.innerHeight },
		});
	}
}

// 确保播放器在可见区域内
function ensurePlayerVisible() {
	if (typeof window === "undefined") return;

	// 确保播放器不会完全隐藏在屏幕外
	const minVisibleX = -200; // 允许部分隐藏，但要保留可点击区域
	const maxX = window.innerWidth - 50; // 右侧至少保留50px可见
	const minY = 10; // 顶部边距
	const maxY = window.innerHeight - 100; // 底部至少保留100px

	let adjusted = false;

	if (playerPosition.x < minVisibleX) {
		playerPosition.x = minVisibleX;
		adjusted = true;
	} else if (playerPosition.x > maxX) {
		playerPosition.x = maxX;
		adjusted = true;
	}

	if (playerPosition.y < minY) {
		playerPosition.y = minY;
		adjusted = true;
	} else if (playerPosition.y > maxY) {
		playerPosition.y = maxY;
		adjusted = true;
	}

	if (adjusted) {
		console.log("调整播放器位置到可见区域:", playerPosition);
	}
}

// 确保播放器在安全边界内
function ensurePlayerInSafeBounds(reason = "边界检查") {
	if (typeof window === "undefined" || isDragging) return;

	const playerWidth = playerState.isExpanded ? 360 : 280;
	const playerHeight = playerState.isExpanded ? 600 : 80;

	let needsAdjustment = false;
	let newX = playerPosition.x;
	let newY = playerPosition.y;

	// 检查是否超出安全边界
	// 右侧边界检查（考虑播放器从右下角定位）
	const rightEdge = window.innerWidth - newX;
	if (rightEdge < playerWidth - SAFE_MARGIN) {
		newX = window.innerWidth - playerWidth - 20;
		needsAdjustment = true;
	}

	// 左侧边界检查
	if (newX > window.innerWidth - SAFE_MARGIN) {
		newX = window.innerWidth - playerWidth - 20;
		needsAdjustment = true;
	}

	// 底部边界检查（考虑播放器从右下角定位）
	const bottomEdge = window.innerHeight - newY;
	if (bottomEdge < playerHeight - SAFE_MARGIN) {
		newY = window.innerHeight - playerHeight - 20;
		needsAdjustment = true;
	}

	// 顶部边界检查
	if (newY > window.innerHeight - SAFE_MARGIN) {
		newY = window.innerHeight - playerHeight - 20;
		needsAdjustment = true;
	}

	// 如果需要调整，执行回弹动画
	if (needsAdjustment) {
		console.log(`播放器超出安全边界，执行回弹 (${reason}):`, {
			原位置: { x: playerPosition.x, y: playerPosition.y },
			新位置: { x: newX, y: newY },
			屏幕尺寸: { width: window.innerWidth, height: window.innerHeight },
		});

		// 平滑回弹动画
		playerPosition.x = newX;
		playerPosition.y = newY;
	}
}

// 启动边界检查定时器
function startBoundaryCheck() {
	if (boundaryCheckTimer) return;

	boundaryCheckTimer = setInterval(() => {
		if (!isDragging && playerState.isVisible) {
			ensurePlayerInSafeBounds("定时检查");
		}
	}, BOUNDARY_CHECK_INTERVAL);
}

// 停止边界检查定时器
function stopBoundaryCheck() {
	if (boundaryCheckTimer) {
		clearInterval(boundaryCheckTimer);
		boundaryCheckTimer = undefined;
	}
}

// 快速启动播放器（使用模拟数据）
function quickStart() {
	if (import.meta.env.DEV) {
		console.log("快速启动播放器...");
	}

	// 使用模拟数据快速显示播放器
	const mockSongs = [
		{
			id: 1,
			name: "加载中...",
			artist: "正在获取歌单",
			url: "",
			pic_url:
				"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjNGY0NmU1Ii8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTUwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zZW0iPkxvYWRpbmcuLi48L3RleHQ+Cjwvc3ZnPg==",
		},
	];

	playerState.playlist = mockSongs;
	playerState.fullPlaylist = mockSongs;
	playerState.currentSong = mockSongs[0];
	playerState.currentIndex = 0;
	playerState.isVisible = true; // 立即显示播放器

	// 后台异步加载真实数据
	loadFullPlaylist()
		.then(() => {
			if (import.meta.env.DEV) {
				console.log("真实歌单数据加载完成");
			}
		})
		.catch((error) => {
			console.error("歌单加载失败:", error);
		});
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

	// 安卓端特殊处理
	if (isAndroid) {
		console.log("检测到安卓设备，应用特殊优化");

		// 强制显示播放器（某些安卓浏览器可能有显示问题）
		setTimeout(() => {
			playerState.isVisible = true;
		}, 100);

		// 安卓端触摸事件优化
		document.addEventListener("touchstart", () => {}, { passive: true });
		document.addEventListener("touchmove", () => {}, { passive: true });
	}

	// 创建音频元素
	audioElement = new Audio();
	audioElement.volume = playerState.volume;
	handleAudioEvents();

	// 快速启动播放器（不等待数据加载）
	quickStart();

	// 移动端启动自动收缩定时器
	if (isMobile) {
		startAutoCollapseTimer();
	}

	// 启动边界检查定时器
	startBoundaryCheck();

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
		// 停止播放并清理
		audioElement.pause();
		audioElement.src = "";
		audioElement.load(); // 重置音频元素
		playerState.isPlaying = false;
	}

	// 清理播放操作锁
	isPlayOperationInProgress = false;

	if (animationFrame) {
		cancelAnimationFrame(animationFrame);
	}

	// 清理自动收缩定时器
	clearAutoCollapseTimer();

	// 停止边界检查定时器
	stopBoundaryCheck();

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
	class:android={isAndroid}
	class:ios={isIOS}
	class:minimized-to-edge={isMinimizedToEdge}
	class:auto-collapsed={isAutoCollapsed}
	style="bottom: {playerPosition.y}px; right: {playerPosition.x}px;"
>
	<!-- 主播放器卡片 -->
	<div class="music-player-card card-base shadow-2xl backdrop-blur-sm">
		<!-- 最小化状态 -->
		{#if !playerState.isExpanded}
		<div 
			class="mini-player flex items-center gap-3 p-4"
			transition:slide={{ duration: 400, axis: 'y' }}
		>
			<!-- 拖拽手柄区域 -->
			<div 
				class="drag-handle cursor-move flex-shrink-0 w-2 h-8 flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity"
				on:mousedown={handleDragStart}
				role="button"
				tabindex="0"
				aria-label="拖拽音乐播放器"
			>
				<div class="w-1 h-6 bg-[var(--btn-content)] rounded-full opacity-60"></div>
			</div>
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
				on:click={(e) => { e.stopPropagation(); toggleExpanded(); }}
				title="展开播放器"
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
					on:click={toggleShuffle}
					title={playerState.isShuffle ? "关闭随机播放" : "开启随机播放"}
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
					<div class="flex items-center gap-2">
						<div class="page-info text-xs text-[var(--btn-content)]">
							第 {playerState.currentPage} 页 / 共 {playerState.totalPages} 页
						</div>
						<button 
							class="refresh-btn btn-card rounded-lg px-2 py-1 text-xs hover:bg-[var(--btn-hover-bg)] transition-colors"
							on:click={reshuffleSongs}
							disabled={playerState.isLoading}
							title="重新随机排序歌曲"
							aria-label="重新随机排序歌曲"
						>
							<Icon icon="material-symbols:refresh" class="text-sm text-[var(--primary)]" />
						</button>
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
		class:auto-collapsed-handle={isAutoCollapsed}
		style="bottom: {playerPosition.y + 20}px; right: 0px;"
		on:click={expandFromEdge}
		on:keydown={(e) => e.key === 'Enter' && expandFromEdge()}
		role="button"
		tabindex="0"
		aria-label="展开音乐播放器"
	>
		{#if isAutoCollapsed && playerState.currentSong}
		<!-- 自动收缩模式：显示透明歌曲信息 -->
		<div class="auto-collapsed-info bg-black/30 backdrop-blur-sm text-white p-3 rounded-l-lg shadow-lg border-l-2 border-[var(--primary)]">
			<div class="song-info-compact">
				<div class="song-title text-sm font-medium truncate max-w-[120px]">
					{playerState.currentSong.name}
				</div>
				<div class="song-artist text-xs opacity-80 truncate max-w-[120px]">
					{playerState.currentSong.artist}
				</div>
			</div>
			<div class="play-status-indicator mt-1">
				{#if playerState.isPlaying}
				<Icon icon="material-symbols:play-arrow" class="text-[var(--primary)] text-sm" />
				{:else}
				<Icon icon="material-symbols:pause" class="text-white/60 text-sm" />
				{/if}
			</div>
		</div>
		{:else}
		<!-- 普通把手模式 -->
		<div class="handle-tab bg-[var(--primary)] text-white p-2 rounded-l-lg shadow-lg">
			<Icon icon="material-symbols:music-note" class="text-lg" />
		</div>
		{/if}
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

	// 安卓端特殊适配
	&.android
		// 安卓端特殊处理
		.mini-player
			min-height: 64px // 确保足够的触摸区域
			padding: 14px
			
		.music-player-card
			// 安卓端增强阴影效果，提高可见性
			box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.1)
			border: 1px solid rgba(255, 255, 255, 0.1)
			
		&.expanded
			// 安卓端展开时的特殊处理
			max-height: calc(100vh - 60px) // 为安卓导航栏留出更多空间
			
		// 安卓端按钮优化
		.control-btn, .play-pause-btn
			min-width: 44px // 安卓推荐的最小触摸目标
			min-height: 44px
			
	// iOS端特殊适配
	&.ios
		.mini-player
			padding: 12px
			
		&.expanded
			max-height: calc(100vh - 50px) // iOS安全区域
			
		// iOS端按钮优化
		.control-btn, .play-pause-btn
			min-width: 40px
			min-height: 40px
	
	// 边缘最小化状态
	&.minimized-to-edge
		.music-player-card
			opacity: 0.1
			pointer-events: none

		&:hover .music-player-card
			opacity: 0.3
			
	// 自动收缩状态
	&.auto-collapsed
		.music-player-card
			opacity: 0.05 // 更透明
			pointer-events: none
			
		// 自动收缩时的过渡动画
		transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1)

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
			
	// 自动收缩把手特殊样式
	&.auto-collapsed-handle
		.auto-collapsed-info
			transition: all 0.4s ease
			transform: translateX(0)
			min-width: 140px
			
			&:hover
				transform: translateX(-8px)
				background: rgba(0, 0, 0, 0.5)
				box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3)
				
			.song-info-compact
				.song-title
					animation: none // 停止可能的滚动动画
					
				.song-artist
					animation: none
					
			.play-status-indicator
				display: flex
				align-items: center
				justify-content: flex-start

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
		max-width: calc(100vw - 20px)
		
		&.expanded
			min-width: auto
			// 展开时确保不会超出屏幕
			max-height: calc(100vh - 20px)
			overflow-y: auto

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
<script lang="ts">
import { onDestroy, onMount } from "svelte";

// 音频分析相关
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let dataArray: Uint8Array | null = null;
let animationId: number | null = null;

// Canvas相关
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D | null = null;

// 粒子系统
interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	size: number;
	color: string;
	alpha: number;
	life: number;
}

let particles: Particle[] = [];
let maxParticles = 30;

// 颜色主题
let currentColors = {
	primary: "#3b82f6",
	secondary: "#8b5cf6",
	accent: "#06b6d4",
};

// 音乐播放器状态监听
let isPlaying = false;
let audioElement: HTMLAudioElement | null = null;

// 音频可视化数据
let frequencyData: number[] = [];
let averageFrequency = 0;

// 初始化音频分析
function initAudioAnalysis() {
	if (typeof window === "undefined") return;

	try {
		audioContext = new (
			window.AudioContext || (window as unknown as any).webkitAudioContext
		)();
		analyser = audioContext.createAnalyser();
		analyser.fftSize = 128;

		const bufferLength = analyser.frequencyBinCount;
		dataArray = new Uint8Array(bufferLength);

		// 连接音频元素
		if (audioElement) {
			const source = audioContext.createMediaElementSource(audioElement);
			source.connect(analyser);
			analyser.connect(audioContext.destination);
		}

		console.log("音频分析器初始化成功");
	} catch (error) {
		console.warn("音频分析器初始化失败:", error);
	}
}

// 从专辑封面提取颜色
async function extractColorsFromImage(
	imageUrl: string,
): Promise<{ primary: string; secondary: string; accent: string }> {
	return new Promise((resolve) => {
		const img = new Image();
		img.crossOrigin = "anonymous";

		img.onload = () => {
			const tempCanvas = document.createElement("canvas");
			const tempCtx = tempCanvas.getContext("2d");
			if (!tempCtx) return resolve(currentColors);

			tempCanvas.width = 100;
			tempCanvas.height = 100;
			tempCtx.drawImage(img, 0, 0, 100, 100);

			try {
				const imageData = tempCtx.getImageData(0, 0, 100, 100);
				const colors = extractDominantColors(imageData.data);
				resolve(colors);
			} catch (error) {
				console.warn("颜色提取失败:", error);
				resolve(currentColors);
			}
		};

		img.onerror = () => resolve(currentColors);
		img.src = imageUrl;
	});
}

// 提取主要颜色
function extractDominantColors(imageData: Uint8ClampedArray) {
	const colorMap = new Map<string, number>();

	// 采样像素
	for (let i = 0; i < imageData.length; i += 16) {
		const r = imageData[i];
		const g = imageData[i + 1];
		const b = imageData[i + 2];
		const a = imageData[i + 3];

		if (a > 128) {
			const color = `${Math.floor(r / 32) * 32},${Math.floor(g / 32) * 32},${Math.floor(b / 32) * 32}`;
			colorMap.set(color, (colorMap.get(color) || 0) + 1);
		}
	}

	const sortedColors = Array.from(colorMap.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, 3);

	if (sortedColors.length >= 3) {
		return {
			primary: `rgb(${sortedColors[0][0]})`,
			secondary: `rgb(${sortedColors[1][0]})`,
			accent: `rgb(${sortedColors[2][0]})`,
		};
	}

	return currentColors;
}

// 更新主题颜色
function updateThemeColors(colors: {
	primary: string;
	secondary: string;
	accent: string;
}) {
	currentColors = colors;

	// 更新CSS变量
	if (typeof document !== "undefined") {
		const root = document.documentElement;

		// 简化的颜色更新
		root.style.setProperty(
			"--primary-rgb",
			colors.primary.replace("rgb(", "").replace(")", ""),
		);
		root.style.setProperty(
			"--secondary-rgb",
			colors.secondary.replace("rgb(", "").replace(")", ""),
		);

		console.log("主题颜色已更新:", colors);
	}
}

// 创建粒子
function createParticle(x: number, y: number): Particle {
	return {
		x,
		y,
		vx: (Math.random() - 0.5) * 2,
		vy: (Math.random() - 0.5) * 2,
		size: Math.random() * 2 + 1,
		color:
			Math.random() > 0.5 ? currentColors.primary : currentColors.secondary,
		alpha: Math.random() * 0.6 + 0.2,
		life: Math.random() * 60 + 30,
	};
}

// 更新粒子
function updateParticles() {
	particles = particles.filter((particle) => {
		particle.x += particle.vx;
		particle.y += particle.vy;
		particle.life--;
		particle.alpha = Math.max(0, particle.alpha - 0.01);

		return particle.life > 0 && particle.alpha > 0;
	});

	// 根据音频强度生成新粒子
	if (isPlaying && averageFrequency > 30 && particles.length < maxParticles) {
		const intensity = averageFrequency / 255;
		const particleCount = Math.floor(intensity * 2) + 1;

		for (let i = 0; i < particleCount; i++) {
			particles.push(
				createParticle(
					Math.random() * window.innerWidth,
					Math.random() * window.innerHeight,
				),
			);
		}
	}
}

// 渲染粒子
function renderParticles() {
	if (!ctx || !canvas) return;

	ctx.clearRect(0, 0, canvas.width, canvas.height);

	particles.forEach((particle) => {
		if (ctx) {
			ctx.save();
			ctx.globalAlpha = particle.alpha;
			ctx.fillStyle = particle.color;
			ctx.beginPath();
			ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		}
	});
}

// 分析音频数据
function analyzeAudio() {
	if (!analyser || !dataArray) return;

	analyser.getByteFrequencyData(dataArray);

	// 计算平均频率
	let sum = 0;
	for (let i = 0; i < dataArray.length; i++) {
		sum += dataArray[i];
	}
	averageFrequency = sum / dataArray.length;

	// 更新频率数据用于可视化
	frequencyData = Array.from(dataArray as Uint8Array).slice(0, 16);
}

// 动画循环
function animate() {
	analyzeAudio();
	updateParticles();
	renderParticles();

	animationId = requestAnimationFrame(animate);
}

// 监听音乐播放器状态
function setupMusicPlayerListener() {
	if (typeof window === "undefined") return;

	const findAudioElement = () => {
		const audio = document.querySelector("audio");
		if (audio && audio !== audioElement) {
			audioElement = audio;
			initAudioAnalysis();

			// 监听播放状态
			audio.addEventListener("play", () => {
				isPlaying = true;
				if (audioContext?.state === "suspended") {
					audioContext.resume();
				}
			});

			audio.addEventListener("pause", () => {
				isPlaying = false;
			});

			audio.addEventListener("ended", () => {
				isPlaying = false;
			});
		}
	};

	// 定期检查音频元素
	const checkInterval = setInterval(findAudioElement, 1000);
	findAudioElement();

	// 清理函数
	return () => {
		clearInterval(checkInterval);
	};
}

// 监听当前歌曲变化
function watchCurrentSong() {
	if (typeof window === "undefined") return;

	const checkSong = () => {
		const albumCover = document.querySelector(
			".album-cover img",
		) as HTMLImageElement;

		if (albumCover?.src) {
			// 提取新歌曲的颜色
			extractColorsFromImage(albumCover.src).then((colors) => {
				updateThemeColors(colors);
			});
		}
	};

	const songCheckInterval = setInterval(checkSong, 3000);
	checkSong();

	return () => {
		clearInterval(songCheckInterval);
	};
}

function handleResize() {
	if (canvas) {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
	}
}

onMount(() => {
	if (typeof window === "undefined") return;

	// 设置Canvas
	if (canvas) {
		ctx = canvas.getContext("2d");
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		// 监听窗口大小变化
		window.addEventListener("resize", handleResize);
	}

	// 启动各种监听器
	const cleanupMusicListener = setupMusicPlayerListener();
	const cleanupSongWatcher = watchCurrentSong();

	// 启动动画循环
	animate();

	// 清理函数
	return () => {
		if (animationId) {
			cancelAnimationFrame(animationId);
		}
		if (audioContext) {
			audioContext.close();
		}
		cleanupMusicListener?.();
		cleanupSongWatcher?.();
		window.removeEventListener("resize", handleResize);
	};
});

onDestroy(() => {
	if (animationId) {
		cancelAnimationFrame(animationId);
	}
	if (audioContext) {
		audioContext.close();
	}
});
</script>

<!-- 粒子动画Canvas -->
<canvas
	bind:this={canvas}
	class="banner-music-sync"
	style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: -1; opacity: {isPlaying ? '0.4' : '0.1'}; transition: opacity 0.5s ease;"
></canvas>

<!-- 音频可视化条 -->
{#if isPlaying && frequencyData.length > 0}
<div class="audio-visualizer">
	{#each frequencyData as frequency, i}
	<div
		class="frequency-bar"
		style="height: {Math.max(2, frequency / 3)}px; background: linear-gradient(to top, {currentColors.primary}, {currentColors.secondary});"
	></div>
	{/each}
</div>
{/if}

<style>
.banner-music-sync {
	background: radial-gradient(
		ellipse at center,
		rgba(59, 130, 246, 0.05) 0%,
		rgba(139, 92, 246, 0.02) 50%,
		transparent 100%
	);
}

.audio-visualizer {
	position: fixed;
	bottom: 120px;
	right: 20px;
	display: flex;
	align-items: end;
	gap: 2px;
	pointer-events: none;
	z-index: 10;
	opacity: 0.6;
	filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.frequency-bar {
	width: 3px;
	min-height: 2px;
	border-radius: 1px;
	transition: height 0.1s ease;
	animation: pulse 0.5s ease-in-out infinite alternate;
}

@keyframes pulse {
	0% { opacity: 0.6; }
	100% { opacity: 1; }
}
</style>
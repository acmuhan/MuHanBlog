<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Icon from '@iconify/svelte';
	
	export let images: { desktop: string[]; mobile: string[] } | string[] = { desktop: [], mobile: [] };
	export let interval: number = 1500; // 毫秒
	export let autoplay: boolean = true;
	export let position: string = 'center';
	
	let currentIndex = 0;
	let timer: number | null = null;
	let isHovered = false;
	let currentImages: string[] = [];
	
	// 处理不同的图片格式
	$: {
		if (Array.isArray(images)) {
			currentImages = images;
		} else if (images && typeof images === 'object') {
			// 检测设备类型，这里简化处理，使用桌面图片
			currentImages = images.desktop || images.mobile || [];
		} else {
			currentImages = [];
		}
	}
	
	const nextSlide = () => {
		currentIndex = (currentIndex + 1) % currentImages.length;
	};
	
	const prevSlide = () => {
		currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
	};
	
	const goToSlide = (index: number) => {
		currentIndex = index;
	};
	
	const startAutoplay = () => {
		if (autoplay && currentImages.length > 1 && !isHovered) {
			timer = setInterval(nextSlide, interval);
		}
	};
	
	const stopAutoplay = () => {
		if (timer) {
			clearInterval(timer);
			timer = null;
		}
	};
	
	onMount(() => {
		startAutoplay();
	});
	
	onDestroy(() => {
		stopAutoplay();
	});
	
	// 鼠标悬停时暂停自动播放
	const handleMouseEnter = () => {
		isHovered = true;
		stopAutoplay();
	};
	
	const handleMouseLeave = () => {
		isHovered = false;
		startAutoplay();
	};
</script>

{#if currentImages.length > 0}
	<div 
		class="relative w-full h-full overflow-hidden rounded-lg group"
		role="banner"
		aria-label="图片轮播"
		on:mouseenter={handleMouseEnter}
		on:mouseleave={handleMouseLeave}
	>
		<!-- 轮播图片容器 -->
		<div class="relative w-full h-full">
			{#each currentImages as image, index}
				<div 
					class="absolute inset-0 transition-opacity duration-500 ease-in-out {index === currentIndex ? 'opacity-100' : 'opacity-0'}"
				>
					<img 
						src={image} 
						alt="Banner Image {index + 1}"
						class="w-full h-full object-cover"
						style="object-position: {position};"
					/>
				</div>
			{/each}
		</div>
		
		<!-- 导航按钮 -->
		{#if currentImages.length > 1}
			<!-- 上一张按钮 -->
			<button 
				class="absolute left-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white rounded-full p-2 transition-all duration-200 opacity-0 group-hover:opacity-100"
				aria-label="上一张图片"
				on:click={prevSlide}
			>
				<Icon name="material-symbols:chevron-left-rounded" class="w-6 h-6" />
			</button>
			
			<!-- 下一张按钮 -->
			<button 
				class="absolute right-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white rounded-full p-2 transition-all duration-200 opacity-0 group-hover:opacity-100"
				aria-label="下一张图片"
				on:click={nextSlide}
			>
				<Icon name="material-symbols:chevron-right-rounded" class="w-6 h-6" />
			</button>
			
			<!-- 指示器 -->
			<div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
				{#each currentImages as _, index}
					<button 
						class="w-2 h-2 rounded-full transition-all duration-200 {index === currentIndex ? 'bg-white' : 'bg-white/50'}"
						aria-label="跳转到第 {index + 1} 张图片"
						on:click={() => goToSlide(index)}
					></button>
				{/each}
			</div>
		{/if}
		
		<!-- 播放/暂停按钮 -->
		{#if currentImages.length > 1 && autoplay}
			<button 
				class="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white rounded-full p-2 transition-all duration-200"
				aria-label={timer ? "暂停轮播" : "开始轮播"}
				on:click={() => {
					if (timer) {
						stopAutoplay();
					} else {
						startAutoplay();
					}
				}}
			>
				{#if timer}
					<Icon name="material-symbols:pause-rounded" class="w-4 h-4" />
				{:else}
					<Icon name="material-symbols:play-arrow-rounded" class="w-4 h-4" />
				{/if}
			</button>
		{/if}
	</div>
{/if}

<style>
	.group:hover .opacity-0 {
		opacity: 1;
	}
</style>

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	
	export let images: string[] = [];
	export let interval: number = 5000;
	export let autoplay: boolean = true;
	export let position: string = 'center';
	
	let currentIndex = 0;
	let timer: number | null = null;
	let isHovered = false;
	let container: HTMLDivElement;
	
	// 处理单张图片的情况
	if (typeof images === 'string') {
		images = [images];
	}
	
	const nextSlide = () => {
		currentIndex = (currentIndex + 1) % images.length;
	};
	
	const prevSlide = () => {
		currentIndex = (currentIndex - 1 + images.length) % images.length;
	};
	
	const goToSlide = (index: number) => {
		currentIndex = index;
	};
	
	const startAutoplay = () => {
		if (autoplay && images.length > 1 && !isHovered) {
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

{#if images.length > 0}
	<div 
		bind:this={container}
		class="relative w-full h-full overflow-hidden rounded-lg group"
		on:mouseenter={handleMouseEnter}
		on:mouseleave={handleMouseLeave}
	>
		<!-- 轮播图片容器 -->
		<div class="relative w-full h-full">
			{#each images as image, index}
				<div 
					class="absolute inset-0 transition-opacity duration-500 ease-in-out"
					class:opacity-100={index === currentIndex}
					class:opacity-0={index !== currentIndex}
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
		{#if images.length > 1}
			<!-- 上一张按钮 -->
			<button 
				class="absolute left-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white rounded-full p-2 transition-all duration-200 opacity-0 group-hover:opacity-100"
				on:click={prevSlide}
			>
				<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"></path>
				</svg>
			</button>
			
			<!-- 下一张按钮 -->
			<button 
				class="absolute right-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white rounded-full p-2 transition-all duration-200 opacity-0 group-hover:opacity-100"
				on:click={nextSlide}
			>
				<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
				</svg>
			</button>
			
			<!-- 指示器 -->
			<div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
				{#each images as _, index}
					<button 
						class="w-2 h-2 rounded-full transition-all duration-200"
						class:bg-white={index === currentIndex}
						class:bg-white/50={index !== currentIndex}
						on:click={() => goToSlide(index)}
					></button>
				{/each}
			</div>
		{/if}
		
		<!-- 播放/暂停按钮 -->
		{#if images.length > 1 && autoplay}
			<button 
				class="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white rounded-full p-2 transition-all duration-200"
				on:click={() => {
					if (timer) {
						stopAutoplay();
					} else {
						startAutoplay();
					}
				}}
			>
				{#if timer}
					<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path>
					</svg>
				{:else}
					<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"></path>
					</svg>
				{/if}
			</button>
		{/if}
	</div>
{/if}
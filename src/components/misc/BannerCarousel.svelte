<script lang="ts">
import { onMount } from "svelte";

export let position = "center";

let imageUrls: string[] = [];
let activeIndex = 0;
let hasShown = false; // used by Layout.showBanner() removing classes on #banner
let intervalId: number | null = null;

const API_URL = "https://t.alcy.cc/ycy?json";

async function fetchOneImageUrl(): Promise<string | null> {
	try {
		const url = `${API_URL}${API_URL.includes("?") ? "&" : "?"}ts=${Date.now()}_${Math.random().toString(36).slice(2)}`;
		const res = await fetch(url, {
			headers: { accept: "application/json, text/plain;q=0.9,*/*;q=0.1" },
			cache: "no-store",
		});
		const text = await res.text();
		const unescaped = text.replace(/\\\//g, "/");
		const match = unescaped.match(
			/https?:\/\/[^\s"']+\.(?:png|jpe?g|webp|gif)/i,
		);
		return match ? match[0] : null;
	} catch (error) {
		if (import.meta.env.DEV) {
			console.warn("轮播图API请求失败:", error);
		}
		return null;
	}
}

async function fetchThreeDistinct(): Promise<string[]> {
	const set = new Set<string>();
	const maxTries = 10;
	let tries = 0;
	while (set.size < 3 && tries < maxTries) {
		const u = await fetchOneImageUrl();
		if (u) set.add(u);
		tries++;
	}
	return Array.from(set);
}

function buildDirectUrls(n: number): string[] {
	const arr: string[] = [];
	for (let i = 0; i < n; i++) {
		const ts = Date.now() + i;
		arr.push(
			`https://t.alcy.cc/ycy?ts=${ts}_${Math.random().toString(36).slice(2)}`,
		);
	}
	return arr;
}

onMount(async () => {
	// 尝试获取远程图片
	imageUrls = await fetchThreeDistinct();

	// 如果API失败，使用直接URL方式
	if (imageUrls.length === 0) {
		imageUrls = buildDirectUrls(3);
	}

	// start rotation only if we have at least 1
	if (imageUrls.length > 0) {
		activeIndex = 0;
		// 持续轮播，不限制切换次数
		intervalId = window.setInterval(() => {
			activeIndex = (activeIndex + 1) % imageUrls.length;
		}, 3000);
	}
});
</script>

<div id="banner" class="object-cover h-full transition duration-700 opacity-0 scale-105 relative overflow-hidden" style={`object-position: ${position}`}
     on:introstart={() => { /* placeholder to keep svelte happy */ }}
     >
    <div class="transition absolute inset-0 dark:bg-black/10 bg-opacity-50 pointer-events-none"></div>

    {#if imageUrls.length === 0}
        <!-- fallback to empty -->
    {:else}
        {#each imageUrls as src, idx}
            <img src={src}
                 alt=""
                 class="w-full h-full object-cover absolute inset-0 transition-opacity duration-700"
                 style={`object-position: ${position}; opacity: ${activeIndex === idx ? '1' : '0'}`}
                 loading="eager"
                 aria-hidden="true" role="presentation"
            />
        {/each}
    {/if}
</div>

<style>
/* no extra styles; rely on parent layout utilities */
</style>



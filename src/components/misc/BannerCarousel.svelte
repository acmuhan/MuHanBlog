<script lang="ts">
import { onMount } from "svelte";

export let position = "center";

let imageUrls: string[] = [];
let activeIndex = 0;
let hasShown = false; // used by Layout.showBanner() removing classes on #banner
let intervalId: number | null = null;

// API URLs for different device types
const PC_API_URL = "https://t.alcy.cc/ycy?json";
const MOBILE_API_URL = "https://t.alcy.cc/mp";

// Device detection
function isMobileDevice(): boolean {
	// Check screen size and user agent
	const screenWidth = window.innerWidth;
	const userAgent = navigator.userAgent.toLowerCase();

	// Screen width check (typically mobile devices are <= 768px)
	const isMobileScreen = screenWidth <= 768;

	// User agent check for mobile devices
	const isMobileUA =
		/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
			userAgent,
		);

	return isMobileScreen || isMobileUA;
}

// Get appropriate API URL based on device type
function getApiUrl(): string {
	return isMobileDevice() ? MOBILE_API_URL : PC_API_URL;
}

async function fetchOneImageUrl(): Promise<string | null> {
	try {
		const apiUrl = getApiUrl();
		const isMobile = isMobileDevice();

		// For mobile API (mp), we need different URL construction
		if (isMobile) {
			const url = `${apiUrl}?ts=${Date.now()}_${Math.random().toString(36).slice(2)}`;
			const res = await fetch(url, {
				headers: { accept: "application/json, text/plain;q=0.9,*/*;q=0.1" },
				cache: "no-store",
			});

			// Mobile API might return direct image URL or need different parsing
			const text = await res.text();
			const unescaped = text.replace(/\\\//g, "/");
			const match = unescaped.match(
				/https?:\/\/[^\s"']+\.(?:png|jpe?g|webp|gif)/i,
			);
			return match ? match[0] : null;
		}

		// PC API logic (original)
		const url = `${apiUrl}${apiUrl.includes("?") ? "&" : "?"}ts=${Date.now()}_${Math.random().toString(36).slice(2)}`;
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
	} catch {
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
	const isMobile = isMobileDevice();
	const baseUrl = isMobile ? "https://t.alcy.cc/mp" : "https://t.alcy.cc/ycy";

	for (let i = 0; i < n; i++) {
		const ts = Date.now() + i;
		arr.push(`${baseUrl}?ts=${ts}_${Math.random().toString(36).slice(2)}`);
	}
	return arr;
}

onMount(async () => {
	// Log device detection for debugging
	const isMobile = isMobileDevice();
	const apiUrl = getApiUrl();
	console.log(
		`[BannerCarousel] Device detection: ${isMobile ? "Mobile" : "Desktop"}`,
	);
	console.log(`[BannerCarousel] Using API: ${apiUrl}`);
	console.log(`[BannerCarousel] Screen width: ${window.innerWidth}px`);

	imageUrls = await fetchThreeDistinct();
	if (imageUrls.length === 0) {
		console.log("[BannerCarousel] Fallback to direct URLs");
		imageUrls = buildDirectUrls(3);
	}

	console.log(`[BannerCarousel] Loaded ${imageUrls.length} images:`, imageUrls);

	// start rotation only if we have at least 1
	if (imageUrls.length > 0) {
		activeIndex = 0;
		// rotate exactly 3 images (or the size we got), then stop
		// show each image ~3 seconds
		let switches = Math.max(1, imageUrls.length) - 1; // number of transitions
		intervalId = window.setInterval(() => {
			if (switches <= 0) {
				if (intervalId) {
					clearInterval(intervalId);
					intervalId = null;
				}
				return;
			}
			activeIndex = (activeIndex + 1) % imageUrls.length;
			switches--;
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



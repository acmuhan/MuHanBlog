import type { AUTO_MODE, DARK_MODE, LIGHT_MODE } from "@constants/constants";

export type SiteConfig = {
	title: string;
	subtitle: string;

	lang:
		| "en"
		| "zh_CN"
		| "zh_TW"
		| "ja"
		| "ko"
		| "es"
		| "th"
		| "vi"
		| "tr"
		| "id";

	themeColor: {
		hue: number;
		fixed: boolean;
	};
	banner: {
		enable: boolean;
		src: {
			desktop: string[];
			mobile: string[];
		};
		position?: "top" | "center" | "bottom";
		carousel?: {
			enable: boolean;
			interval: number;
		};
		credit: {
			enable: boolean;
			text: string;
			url?: string;
		};
	};
	toc: {
		enable: boolean;
		depth: 1 | 2 | 3;
	};

	favicon: Favicon[];

	// Optional analytics configuration
	analytics?: {
		// Google Analytics G-XXXX ID
		gaId?: string;
		// Umami analytics configuration
		umami?: {
			websiteId: string; // The Umami website UUID
			src?: string; // Optional script src, default to public Umami cloud
		};
	};

	// Optional music player configuration
	musicPlayer?: {
		enable: boolean;
		autoplay: boolean;
		showPlaylist: boolean;
		position: "bottom-left" | "bottom-right" | "top-left" | "top-right";
		playlist: Array<{
			title: string;
			artist: string;
			src?: string; // direct playable url (optional)
			neteaseId?: number; // NetEase song id (optional)
			keywords?: string; // fallback search keywords (optional)
			cover?: string;
		}>;
	};
};

export type Favicon = {
	src: string;
	theme?: "light" | "dark";
	sizes?: string;
};

export enum LinkPreset {
	Home = 0,
	Archive = 1,
	About = 2,
}

export type NavBarLink = {
	name: string;
	url: string;
	external?: boolean;
};

export type NavBarConfig = {
	links: (NavBarLink | LinkPreset)[];
};

export type ProfileConfig = {
	avatar?: string;
	name: string;
	bio?: string;
	links: {
		name: string;
		url: string;
		icon: string;
	}[];
};

export type LicenseConfig = {
	enable: boolean;
	name: string;
	url: string;
};

export type LIGHT_DARK_MODE =
	| typeof LIGHT_MODE
	| typeof DARK_MODE
	| typeof AUTO_MODE;

export type BlogPostData = {
	body: string;
	title: string;
	published: Date;
	description: string;
	tags: string[];
	draft?: boolean;
	image?: string;
	category?: string;
	prevTitle?: string;
	prevSlug?: string;
	nextTitle?: string;
	nextSlug?: string;
};

export type ExpressiveCodeConfig = {
	theme: string;
};

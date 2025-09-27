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
		src: string;
		position?: "top" | "center" | "bottom";
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

	// Optional comment system configuration
	comment?: {
		// Giscus comment system configuration
		giscus?: {
			repo: string; // GitHub repository in format "owner/repo"
			repoId: string; // GitHub repository ID
			category: string; // Discussion category name
			categoryId: string; // Discussion category ID
			mapping?: "pathname" | "url" | "title" | "og:title"; // How to map pages to discussions
			strict?: boolean; // Use strict title matching
			reactionsEnabled?: boolean; // Enable reactions
			emitMetadata?: boolean; // Emit metadata
			inputPosition?: "top" | "bottom"; // Comment input position
			theme?:
				| "light"
				| "dark"
				| "preferred_color_scheme"
				| "transparent_dark"
				| "noborder_light"
				| "noborder_dark"
				| "noborder_gray"
				| "cobalt"
				| "purple_dark"; // Theme
			lang?: string; // Language code
			loading?: "lazy" | "eager"; // Loading strategy
		};
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

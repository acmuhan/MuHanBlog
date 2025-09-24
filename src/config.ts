import type {
	ExpressiveCodeConfig,
	LicenseConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";
import { BannerImageScanner } from "./utils/banner-scanner";

// 自动扫描轮播图片
const _bannerImages = BannerImageScanner.scanAllBanners();

export const siteConfig: SiteConfig = {
	title: "MuHan's Blog",
	subtitle: "MuHan's Blog",
	lang: "zh_CN", // 语言代码，例如 'en'、'zh_CN'、'ja' 等
	themeColor: {
		hue: 250, // 主题颜色的默认色调，范围从 0 到 360。例如：红色: 0, 青绿: 200, 青色: 250, 粉色: 345
		fixed: false, // 为访客隐藏主题颜色选择器
	},
	banner: {
		enable: true,
		// 自动扫描轮播图片
		src: {
			desktop:
				_bannerImages.desktop.length > 0
					? _bannerImages.desktop
					: ["assets/images/demo-banner.png"],
			mobile:
				_bannerImages.mobile.length > 0
					? _bannerImages.mobile
					: ["assets/images/demo-banner.png"],
		},
		position: "center", // 等同于 object-position，仅支持 'top', 'center', 'bottom'。默认为 'center'
		carousel: {
			enable:
				_bannerImages.desktop.length > 1 || _bannerImages.mobile.length > 1, // 多张图片时启用轮播
			interval: 1.5, // 轮播间隔时间（秒）
		},
		credit: {
			enable: false, // 显示横幅图片来源文本
			text: "", // 要显示的来源文本
			url: "", // （可选）原始艺术品或艺术家页面的 URL 链接
		},
	},
	toc: {
		enable: true, // 在文章右侧显示目录
		depth: 2, // 目录中显示的最大标题深度，范围从 1 到 3
	},
	favicon: [
		// 保留此数组为空以使用默认的网站图标
		{
			src: "/favicon/icon.png", // 网站图标的路径，相对于 /public 目录
			//   theme: 'light',              // （可选）'light' 或 'dark'，仅在您有不同的明暗模式图标时设置
			//   sizes: '32x32',              // （可选）网站图标的尺寸，仅在您有不同尺寸的图标时设置
		},
	],
	// Analytics configuration (fill in your IDs to enable)
	analytics: {
		// Google Analytics: 填写您的 GA4 ID，格式 G-XXXX
		gaId: "G-HKXGFMG0SD",
		// Umami: 设置您的 websiteId（UUID），以及可选的脚本地址
		umami: {
			websiteId: "080b7a8a-bc05-4651-9def-9006601aae3d",
			// 如使用自建 Umami，这里可改为 https://umami.your-domain.com/script.js
			src: "https://cloud.umami.is/script.js",
		},
	},

	// Music player configuration
	musicPlayer: {
		enable: true,
		autoplay: false,
		showPlaylist: true,
		position: "bottom-right" as
			| "bottom-left"
			| "bottom-right"
			| "top-left"
			| "top-right",
		playlist: [
			{
				title: "示例歌曲 1",
				artist: "示例艺术家",
				src: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
				cover: "assets/images/demo-avatar.png",
			},
			{
				title: "示例歌曲 2",
				artist: "示例艺术家",
				src: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
				cover: "assets/images/demo-avatar.png",
			},
		],
	},
};

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		LinkPreset.Archive,
		LinkPreset.About,
		{
			name: "GitHub",
			url: "https://github.com/acmuhan", // 内部链接不应包含基础路径，因为会自动添加
			external: true, // 显示外部链接图标并在新标签页中打开
		},
	],
};

export const profileConfig: ProfileConfig = {
	avatar: "assets/images/demo-avatar.png", // 相对于 /src 目录的路径。如果以 '/' 开头，则相对于 /public 目录
	name: "MuHan",
	bio: "A developer who loves technology, enjoys sharing and learning new knowledge.",
	links: [
		{
			name: "Twitter",
			icon: "fa6-brands:twitter", // 访问 https://icones.js.org/ 查看图标代码
			// 如果尚未包含相应的图标集，您需要安装它
			// `pnpm add @iconify-json/<icon-set-name>`
			url: "https://x.com/ac_muhan",
		},
		{
			name: "Steam",
			icon: "fa6-brands:steam",
			url: "https://steamcommunity.com/id/acmuhan/",
		},
		{
			name: "GitHub",
			icon: "fa6-brands:github",
			url: "https://github.com/acmuhan",
		},
		{
			name: "QQ",
			icon: "fa6-brands:qq",
			url: "tencent://AddContact/?fromId=45&fromSubId=1&subcmd=all&uin=2066047450",
		},
		{
			name: "Discord",
			icon: "fa6-brands:discord",
			url: "https://discordapp.com/users/1135078401565278342",
		},
	],
};

export const licenseConfig: LicenseConfig = {
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	// 注意：某些样式（如背景颜色）被覆盖，请查看 astro.config.mjs 文件。
	// 请选择深色主题，因为此博客主题目前仅支持深色背景
	theme: "github-light",
};

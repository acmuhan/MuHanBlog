import fs from "node:fs";
import path from "node:path";

/**
 * 自动扫描并识别轮播图片
 * 支持格式：PNG, JPG, JPEG, WEBP, GIF, SVG
 */
export class BannerImageScanner {
	private static readonly SUPPORTED_EXTENSIONS = [
		".png",
		".jpg",
		".jpeg",
		".webp",
		".gif",
		".svg",
	];
	private static readonly BANNER_DIRS = {
		desktop: "src/assets/images/banners/desktop",
		mobile: "src/assets/images/banners/mobile",
	};

	/**
	 * 检查文件是否为支持的图片格式
	 */
	private static isImageFile(filename: string): boolean {
		const ext = path.extname(filename).toLowerCase();
		return BannerImageScanner.SUPPORTED_EXTENSIONS.includes(ext);
	}

	/**
	 * 扫描指定目录中的图片文件
	 */
	private static scanDirectory(dirPath: string): string[] {
		if (!fs.existsSync(dirPath)) {
			console.warn(`目录不存在: ${dirPath}`);
			return [];
		}

		try {
			const files = fs.readdirSync(dirPath);
			return files
				.filter((file) => BannerImageScanner.isImageFile(file))
				.map((file) => path.join(dirPath, file).replace(/\\/g, "/"))
				.sort(); // 按文件名排序
		} catch (error) {
			console.error(`扫描目录失败 ${dirPath}:`, error);
			return [];
		}
	}

	/**
	 * 扫描所有轮播图片
	 */
	public static scanAllBanners(): { desktop: string[]; mobile: string[] } {
		const desktopImages = BannerImageScanner.scanDirectory(
			BannerImageScanner.BANNER_DIRS.desktop,
		);
		const mobileImages = BannerImageScanner.scanDirectory(
			BannerImageScanner.BANNER_DIRS.mobile,
		);

		// console logs removed to keep build output clean

		return {
			desktop: desktopImages,
			mobile: mobileImages,
		};
	}

	/**
	 * 生成配置文件格式的轮播图配置
	 */
	public static generateBannerConfig(): any {
		const banners = BannerImageScanner.scanAllBanners();

		return {
			enable: true,
			src: {
				desktop:
					banners.desktop.length > 0
						? banners.desktop
						: ["assets/images/demo-banner.png"],
				mobile:
					banners.mobile.length > 0
						? banners.mobile
						: ["assets/images/demo-banner.png"],
			},
			position: "center",
			carousel: {
				enable: banners.desktop.length > 1 || banners.mobile.length > 1,
				interval: 1.5,
			},
			credit: {
				enable: false,
				text: "",
				url: "",
			},
		};
	}

	/**
	 * 监听文件变化并自动更新配置
	 */
	public static watchBannerChanges(callback: (config: any) => void): void {
		const watchPaths = [
			BannerImageScanner.BANNER_DIRS.desktop,
			BannerImageScanner.BANNER_DIRS.mobile,
		];

		watchPaths.forEach((watchPath) => {
			if (fs.existsSync(watchPath)) {
				fs.watch(watchPath, (_eventType, filename) => {
					if (filename && BannerImageScanner.isImageFile(filename)) {
						console.log(`检测到轮播图变化: ${filename}`);
						const newConfig = BannerImageScanner.generateBannerConfig();
						callback(newConfig);
					}
				});
			}
		});
	}

	/**
	 * 验证图片文件是否存在且可读
	 */
	public static validateImages(imagePaths: string[]): {
		valid: string[];
		invalid: string[];
	} {
		const valid: string[] = [];
		const invalid: string[] = [];

		imagePaths.forEach((imagePath) => {
			try {
				if (fs.existsSync(imagePath) && fs.statSync(imagePath).isFile()) {
					valid.push(imagePath);
				} else {
					invalid.push(imagePath);
				}
			} catch (_error) {
				invalid.push(imagePath);
			}
		});

		return { valid, invalid };
	}

	/**
	 * 获取图片信息
	 */
	public static getImageInfo(imagePath: string): {
		size: number;
		ext: string;
		exists: boolean;
	} {
		try {
			if (fs.existsSync(imagePath)) {
				const stats = fs.statSync(imagePath);
				return {
					size: stats.size,
					ext: path.extname(imagePath).toLowerCase(),
					exists: true,
				};
			}
		} catch (error) {
			console.error(`获取图片信息失败 ${imagePath}:`, error);
		}

		return { size: 0, ext: "", exists: false };
	}
}

// 注意：该工具模块仅供服务端/脚本使用，请勿在客户端直接调用带有 fs 的方法

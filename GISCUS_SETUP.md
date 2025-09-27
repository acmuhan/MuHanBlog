# Giscus 评论系统配置指南

本文档将指导您如何为 MuHan's Blog 配置和使用 Giscus 评论系统。

## 📋 目录

1. [什么是 Giscus](#什么是-giscus)
2. [前置要求](#前置要求)
3. [创建评论仓库](#创建评论仓库)
4. [配置 Giscus](#配置-giscus)
5. [获取配置参数](#获取配置参数)
6. [更新博客配置](#更新博客配置)
7. [测试评论功能](#测试评论功能)
8. [自定义选项](#自定义选项)
9. [常见问题](#常见问题)
10. [进阶配置](#进阶配置)

## 🎯 什么是 Giscus

Giscus 是一个基于 GitHub Discussions 的评论系统，具有以下优势：

- **🔒 隐私友好**：基于 GitHub，无需第三方数据收集
- **💰 完全免费**：利用 GitHub 的免费服务
- **🎨 主题适配**：自动适应明暗主题
- **📱 响应式设计**：完美支持移动设备
- **🌍 多语言支持**：支持多种语言界面
- **⚡ 零维护**：无需服务器和数据库维护

## ✅ 前置要求

在开始配置之前，请确保：

1. **GitHub 账号**：您需要一个 GitHub 账号
2. **公开仓库**：评论数据将存储在 GitHub 公开仓库中
3. **Discussions 功能**：需要在仓库中启用 Discussions 功能

## 🏗️ 创建评论仓库

### 步骤 1：创建新仓库

1. 访问 [GitHub](https://github.com) 并登录
2. 点击右上角的 `+` 按钮，选择 `New repository`
3. 填写仓库信息：
   - **Repository name**: `muhanblog-comments`（推荐名称）
   - **Description**: `Comments for MuHan's Blog`
   - **Visibility**: 选择 `Public`（必须是公开仓库）
4. 点击 `Create repository`

### 步骤 2：启用 Discussions

1. 进入刚创建的仓库
2. 点击 `Settings` 选项卡
3. 向下滚动找到 `Features` 部分
4. 勾选 `Discussions` 复选框
5. 点击 `Set up discussions`

### 步骤 3：创建讨论分类

1. 进入仓库的 `Discussions` 选项卡
2. 点击右侧的 `Categories` 按钮
3. 建议创建以下分类：
   - **Announcements**（公告）- 用于重要通知
   - **General**（一般讨论）- 用于文章评论
   - **Q&A**（问答）- 用于问题讨论

## ⚙️ 配置 Giscus

### 步骤 1：访问 Giscus 配置页面

1. 访问 [giscus.app](https://giscus.app/zh-CN)
2. 按照页面指引填写配置信息

### 步骤 2：填写仓库信息

在 "仓库" 部分：
```
用户名/仓库名: acmuhan/muhanblog-comments
```

### 步骤 3：选择页面 ↔️ discussion 映射关系

推荐选择：
- **Discussion 标题含有页面的 pathname**

### 步骤 4：选择 Discussion 分类

推荐选择：
- **Announcements** 或 **General**

### 步骤 5：选择特性

建议配置：
- ✅ 启用反应
- ❌ 仅搜索标题含有页面 URL 的 discussion
- ❌ 发送 discussion 元数据
- 评论框位置：**评论区下方**

### 步骤 6：选择主题

推荐选择：
- **preferred_color_scheme**（自动适应系统主题）

## 🔑 获取配置参数

完成上述配置后，Giscus 会生成一段脚本代码，从中提取以下参数：

```html
<script src="https://giscus.app/client.js"
        data-repo="acmuhan/muhanblog-comments"
        data-repo-id="R_kgDOxxxxxxx"
        data-category="Announcements"
        data-category-id="DIC_kwDOxxxxxxx"
        ...>
</script>
```

您需要记录：
- `data-repo`: 仓库名称
- `data-repo-id`: 仓库 ID
- `data-category`: 分类名称
- `data-category-id`: 分类 ID

## 📝 更新博客配置

打开 `src/config.ts` 文件，更新 `comment` 配置：

```typescript
export const siteConfig: SiteConfig = {
	// ... 其他配置
	comment: {
		giscus: {
			repo: "acmuhan/muhanblog-comments", // 替换为您的仓库
			repoId: "R_kgDOxxxxxxx", // 替换为您的仓库ID
			category: "Announcements", // 替换为您选择的分类
			categoryId: "DIC_kwDOxxxxxxx", // 替换为您的分类ID
			mapping: "pathname",
			strict: false,
			reactionsEnabled: true,
			emitMetadata: false,
			inputPosition: "bottom",
			theme: "preferred_color_scheme",
			lang: "zh-CN",
			loading: "lazy",
		},
	},
};
```

## 🧪 测试评论功能

### 步骤 1：构建并启动博客

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

### 步骤 2：访问文章页面

1. 打开浏览器访问 `http://localhost:4321`
2. 点击任意文章进入详情页
3. 滚动到页面底部查看评论区

### 步骤 3：测试评论功能

1. 使用 GitHub 账号登录
2. 发表测试评论
3. 检查评论是否正常显示
4. 测试表情反应功能

## 🎨 自定义选项

### 主题配置

您可以选择以下主题：

```typescript
theme: "light" | "dark" | "preferred_color_scheme" | "transparent_dark" | 
       "noborder_light" | "noborder_dark" | "noborder_gray" | "cobalt" | "purple_dark"
```

### 映射方式

```typescript
mapping: "pathname" | "url" | "title" | "og:title"
```

- **pathname**: 根据页面路径映射（推荐）
- **url**: 根据完整 URL 映射
- **title**: 根据页面标题映射
- **og:title**: 根据 Open Graph 标题映射

### 语言设置

支持的语言代码：
```typescript
lang: "zh-CN" | "zh-TW" | "en" | "ja" | "ko" | "es" | "fr" | "de" | "ru" | ...
```

## ❓ 常见问题

### Q1: 评论区不显示怎么办？

**A1**: 检查以下项目：
1. 确认仓库是公开的
2. 确认已启用 Discussions 功能
3. 检查配置参数是否正确
4. 查看浏览器控制台是否有错误

### Q2: 评论区显示"未找到讨论"

**A2**: 这是正常现象，当页面首次访问时会自动创建对应的讨论。

### Q3: 如何修改评论区样式？

**A3**: 可以通过修改 `src/components/Comment.astro` 中的 CSS 样式来自定义外观。

### Q4: 评论数据会丢失吗？

**A4**: 不会，所有评论数据都存储在 GitHub Discussions 中，非常安全可靠。

### Q5: 可以迁移现有评论吗？

**A5**: 可以，GitHub 提供了 API 来导入现有评论数据。

## 🚀 进阶配置

### 自定义 CSS 样式

在 `src/components/Comment.astro` 中添加自定义样式：

```css
<style>
	/* 自定义评论区背景 */
	.giscus-wrapper {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		border-radius: 16px;
		padding: 1rem;
	}

	/* 自定义边框 */
	:global(.giscus-frame) {
		border-radius: 12px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}
</style>
```

### 条件显示评论

您可以为特定文章禁用评论：

```typescript
// 在文章的 frontmatter 中添加
---
title: "文章标题"
comments: false  # 禁用评论
---
```

然后修改 `Comment.astro` 组件：

```astro
---
const { comments = true } = Astro.props.entry?.data || {};
const showComments = comments && isGiscusEnabled;
---

{showComments && (
	<!-- 评论组件内容 -->
)}
```

### 评论统计

您可以获取评论数量并显示在文章卡片上：

```javascript
// 获取评论数量的示例代码
async function getCommentCount(pathname) {
	// 通过 GitHub API 获取讨论数量
	// 实现细节请参考 GitHub Discussions API 文档
}
```

## 📞 技术支持

如果您在配置过程中遇到问题：

1. **查看官方文档**: [giscus.app](https://giscus.app/zh-CN)
2. **GitHub Issues**: [giscus/giscus](https://github.com/giscus/giscus/issues)
3. **博客作者**: 通过博客联系方式获取帮助

## 📄 许可证

Giscus 是开源软件，遵循 MIT 许可证。本配置指南同样采用 MIT 许可证。

---

**配置完成后，您的博客就拥有了一个现代化、功能丰富的评论系统！** 🎉

> 💡 **提示**: 建议定期备份您的评论仓库，虽然 GitHub 很可靠，但备份总是好习惯。

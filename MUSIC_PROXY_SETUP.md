# 音乐API代理部署指南

## 概述

为了解决生产环境中音乐播放器的CORS跨域问题，我们创建了一个EdgeOne Functions代理服务。这个代理服务将帮助您的博客在生产环境中正常加载音乐数据。

## 问题背景

在生产环境（HTTPS）中，直接调用第三方音乐API会遇到以下问题：

1. **CORS策略阻止**：大多数公共API不允许从您的域名直接访问
2. **HTTPS混合内容**：HTTPS网站无法请求HTTP API
3. **API限制**：某些API只允许特定域名访问

## 解决方案

我们创建了一个本地代理API (`/api/music-proxy`)，它将：

1. 在您的服务器上运行，避免CORS问题
2. 支持多个备用API端点
3. 自动重试和错误处理
4. 缓存响应以提高性能

## 部署步骤

### 1. 上传代理文件

将 `functions/api/music-proxy.js` 文件上传到您的EdgeOne Functions目录：

```
your-project/
├── functions/
│   └── api/
│       └── music-proxy.js
```

### 2. 配置EdgeOne Functions

在EdgeOne控制台中：

1. 进入 **Functions** 页面
2. 确认 `music-proxy.js` 已正确部署
3. 检查函数状态为"运行中"

### 3. 测试代理API

部署完成后，您可以通过以下URL测试代理是否工作：

```
https://your-domain.com/api/music-proxy?id=12291029891&limit=20&offset=0
```

成功响应应该包含歌曲数据：

```json
{
  "code": 200,
  "songs": [
    {
      "id": 123456,
      "name": "歌曲名称",
      "ar": [{"name": "艺术家"}],
      "al": {"picUrl": "封面URL"}
    }
  ]
}
```

### 4. 验证音乐播放器

部署后，您的音乐播放器将：

1. 首先尝试本地代理API (`/api/music-proxy`)
2. 如果失败，自动切换到备用API端点
3. 显示加载状态和错误处理

## API端点优先级

代理系统按以下顺序尝试API端点：

1. **本地代理** (`/api/music-proxy`) - 首选，解决CORS问题
2. **Vercel API 1** (`https://netease-cloud-music-api-lovat-ten.vercel.app`)
3. **Vercel API 2** (`https://music-api-steel-nine.vercel.app`)
4. **Vercel API 3** (`https://netease-music-api-xi.vercel.app`)
5. **Vercel API 4** (`https://music-api-kappa-six.vercel.app`)

## 性能优化

代理API包含以下优化：

- **缓存控制**：响应缓存5分钟
- **超时处理**：10秒请求超时
- **自动重试**：多个备用端点
- **错误处理**：优雅降级

## 故障排除

### 1. 代理API返回错误

检查EdgeOne Functions日志：

```bash
# 在EdgeOne控制台查看Functions日志
```

### 2. 音乐播放器显示"加载中"

1. 检查浏览器控制台是否有错误
2. 确认代理API响应正常
3. 检查网络连接

### 3. 歌曲无法播放

这通常是音频URL的问题，不是代理问题。音频URL可能：

- 已过期
- 需要特殊权限
- 被地区限制

## 监控和维护

### 日志监控

在EdgeOne控制台中监控：

- API请求频率
- 错误率
- 响应时间

### 定期检查

建议每月检查：

- 备用API端点是否仍然可用
- 是否有新的可用API端点
- 性能是否需要优化

## 安全考虑

1. **速率限制**：考虑添加请求频率限制
2. **域名验证**：可以添加Referer检查
3. **缓存策略**：避免过度请求上游API

## 支持

如果遇到问题，请检查：

1. EdgeOne Functions是否正常运行
2. 网络连接是否正常
3. 上游API是否可用

---

部署完成后，您的音乐播放器应该能在生产环境中正常工作，不再受CORS限制影响。

---
title: 参考文章-2-宝塔部署Golang应用指南
published: 2025-09-23
description: '总结在宝塔面板上部署 Go 应用的要点，包括环境、进程与反向代理。'
image: ''
tags: ['宝塔', 'Golang', '部署']
category: '参考'
draft: false 
lang: 'zh_CN'
---

要在宝塔面板上部署 Golang 应用，核心步骤如下：

1. 安装 Go 环境或在 CI/CD 中构建二进制，并上传到服务器。
2. 为二进制配置 systemd（或使用宝塔守护进程/PM2 等）保证守护与开机自启。
3. 用 Nginx 反向代理至应用监听端口，开启 HTTPS，配置 gzip 与 HTTP/2。
4. 接入日志轮转、环境变量文件、健康检查与拉起策略。

参考与延伸阅读：
- 宝塔面板部署Golang应用指南（外部链接）：https://www.oryoy.com/news/bao-ta-mian-ban-bu-shu-golang-ying-yong-zhi-nan-jian-hua-go-yu-yan-xiang-mu-shang-xian-liu-cheng.html


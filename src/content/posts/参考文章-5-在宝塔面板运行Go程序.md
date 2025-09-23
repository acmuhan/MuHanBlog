---
title: 参考文章-5-在宝塔面板运行Go程序
published: 2025-09-23
description: '概述在宝塔面板上运行 Go 程序的流程与排错要点。'
image: ''
tags: ['宝塔', 'Go', '运维']
category: '参考'
draft: false 
lang: 'zh_CN'
---

运行流程：
1. 构建并上传二进制，或在服务器上编译（go build）。
2. 为进程配置 systemd 服务文件，设置 Restart 策略与环境变量。
3. Nginx 反代到应用端口，开启 HTTPS 与 HTTP/2。
4. 观察日志与监控（如 node_exporter + Prometheus + Grafana）。

常见排错：
- 端口被占用、防火墙未放行；
- SELinux/权限导致无法读取配置或证书；
- 反代后真实 IP 丢失需设置 `X-Forwarded-For`；
- 证书续期失败需检查定时任务与 ACME 权限。

参考与延伸阅读：
- 在宝塔面板上如何运行Go语言程序？（外部链接）：https://m.php.cn/zh/faq/720290.html


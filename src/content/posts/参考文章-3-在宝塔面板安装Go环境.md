---
title: 参考文章-3-在宝塔面板安装Go环境
published: 2025-09-23
description: '汇总在宝塔面板安装 Go 环境的几种方式与注意事项。'
image: ''
tags: ['宝塔', 'Go', '环境安装']
category: '参考'
draft: false 
lang: 'zh_CN'
---

在宝塔面板安装 Go 环境的常见方式：

- 直接下载官方 tar.gz，解压至 `/usr/local/go` 并配置 PATH。
- 使用系统包管理器（注意版本更新节奏可能滞后）。
- 使用 asdf 或 gvm 管理多版本。

注意事项：
- 确认 `GOPATH` 与 `GOMODCACHE` 的磁盘配额；
- 生产环境建议关闭 CGO 或静态编译以减少依赖；
- 使用非 root 用户运行服务。

参考与延伸阅读：
- 宝塔面板安装Go语言环境（外部链接）：https://cms.douhao.com/jiaocheng/aff8c991269fabda.html
- 宝塔支持go语言吗（外部链接）：https://www.php.cn/zh/faq/574310.html


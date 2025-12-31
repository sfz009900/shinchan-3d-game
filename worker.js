/**
 * Cloudflare Worker - 游戏静态文件服务
 *
 * 只处理 /shinchan-3d-game/* 路径，代理到 Cloudflare Pages
 *
 * Cloudflare Dashboard 配置：
 * Workers Routes → 添加路由：ppt250.shop/shinchan-3d-game/*
 */

const PAGES_URL = 'https://shinchan-3d-game.pages.dev';
const BASE_PATH = '/shinchan-3d-game';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    let targetPath = url.pathname;

    // 移除 /shinchan-3d-game 前缀（如果有）
    if (targetPath.startsWith(BASE_PATH)) {
      targetPath = targetPath.slice(BASE_PATH.length) || '/';
    }

    // 根路径和目录请求默认返回 index.html
    if (targetPath === '/' || targetPath === '') {
      targetPath = '/index.html';
    }

    // favicon.ico 请求
    if (targetPath === '/favicon.ico') {
      targetPath = '/favicon.ico';
    }

    // 代理到 Cloudflare Pages
    const targetUrl = new URL(targetPath, PAGES_URL);
    targetUrl.search = url.search;

    const response = await fetch(targetUrl.toString());

    // 添加缓存头
    const headers = new Headers(response.headers);
    if (!targetPath.endsWith('.html')) {
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    }

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  },
};

// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLinksValidator from 'starlight-links-validator';

// https://astro.build/config
export default defineConfig({
	// 內容中的相對連結以「網址結尾有 /」為前提，所以固定要求結尾斜線。
	trailingSlash: 'always',
	integrations: [
		starlight({
			title: '個人技術知識庫',
			defaultLocale: 'root',
			locales: {
				root: { label: '繁體中文', lang: 'zh-TW' },
			},
			// 這個外掛只檢查 / 開頭的連結；相對連結由 scripts/check-links.mjs 在建置後檢查。
			plugins: [starlightLinksValidator({ errorOnRelativeLinks: false })],
			sidebar: [
				{ label: '根目錄', link: '/' },
				{ label: '新增規範', link: '/rules/' },
				// 新增技術概念目錄時，照下面任一組複製一份：改 label 與 directory 即可。
				{ label: 'Python 專案工程', items: [{ autogenerate: { directory: 'python-engineering' } }] },
				{ label: '機器學習實驗', items: [{ autogenerate: { directory: 'ml-experiments' } }] },
				{ label: 'Android', items: [{ autogenerate: { directory: 'android' } }] },
				{ label: '資料庫', items: [{ autogenerate: { directory: 'database' } }] },
				{ label: '網頁前端', items: [{ autogenerate: { directory: 'web-frontend' } }] },
				{ label: '開發流程', items: [{ autogenerate: { directory: 'dev-workflow' } }] },
				{ label: '數位設計', items: [{ autogenerate: { directory: 'digital-design' } }] },
				{ label: '嵌入式系統', items: [{ autogenerate: { directory: 'embedded' } }] },
				{ label: '作品分析', items: [{ autogenerate: { directory: 'repos' } }] },
			],
		}),
	],
});

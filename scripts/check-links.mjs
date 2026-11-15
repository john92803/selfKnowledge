// 建置後檢查 dist/ 內所有頁面的「相對連結」是否指向存在的頁面。
// starlight-links-validator 只檢查 / 開頭的連結；知識庫內容一律用相對連結，由這支腳本把關。
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));

if (!existsSync(dist)) {
	console.error('找不到 dist/，請先執行 astro build。');
	process.exit(1);
}

/** 列出 dist/ 內所有 .html 檔（略過搜尋索引目錄）。 */
function htmlFiles(dir) {
	const found = [];
	for (const name of readdirSync(dir)) {
		if (name === 'pagefind' || name === '_astro') continue;
		const full = join(dir, name);
		if (statSync(full).isDirectory()) found.push(...htmlFiles(full));
		else if (name.endsWith('.html')) found.push(full);
	}
	return found;
}

/** dist 內的檔案路徑 → 該頁的網址路徑（不含 base）。 */
function pagePath(file) {
	const rel = relative(dist, file).split(sep).join('/');
	return '/' + rel.replace(/index\.html$/, '');
}

const isFile = (path) => existsSync(path) && statSync(path).isFile();

const skip = /^(#|\/|[a-z][a-z0-9+.-]*:)/i; // 頁內錨點、絕對路徑、http: mailto: 等
const errors = [];

for (const file of htmlFiles(dist)) {
	const page = pagePath(file);
	const html = readFileSync(file, 'utf8');
	for (const match of html.matchAll(/<a\s[^>]*?href="([^"]*)"/g)) {
		const href = match[1].replaceAll('&amp;', '&');
		if (href === '' || skip.test(href)) continue;

		const target = decodeURIComponent(new URL(href, 'http://local' + page).pathname);
		const onDisk = join(dist, target);
		const ok = target.endsWith('/') ? isFile(join(onDisk, 'index.html')) : isFile(onDisk);
		if (ok) continue;

		let hint = '找不到目標頁面';
		if (/\.mdx?$/.test(target)) hint = '連結不能帶 .md，請改成以 / 結尾的網址';
		else if (!target.endsWith('/') && isFile(join(onDisk, 'index.html'))) hint = '連結結尾要加上 /';
		errors.push(`  頁面 ${page} 的連結「${href}」：${hint}`);
	}
}

if (errors.length > 0) {
	console.error(`相對連結檢查失敗，共 ${errors.length} 個問題：`);
	console.error(errors.join('\n'));
	console.error('連結寫法請見 src/content/docs/rules.md 的「連結寫法」一節。');
	process.exit(1);
}

console.log('相對連結檢查通過。');

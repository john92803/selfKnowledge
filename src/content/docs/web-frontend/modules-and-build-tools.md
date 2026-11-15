---
title: 前端模組化與建置工具
description: 把單一檔案的網頁拆成模組，並用建置工具打包。
status: todo
priority: medium
repos:
  - ptway-profile
tags:
  - javascript
  - vite
  - es-modules
updated: 2026-11-15
---

## 這是什麼

模組化是把程式拆成多個檔案，每個檔案只公開（`export`）需要被別人用的部分，其他檔案再用 `import` 取用。現在的瀏覽器原生支援 ES modules，只要在 `<script>` 加上 `type="module"`，不需要任何工具就能用。

建置工具（如 Vite）是另一層東西：它在開發時提供本機伺服器與熱更新，在發布時把許多模組打包、壓縮成較少、較小的檔案，也能處理 TypeScript、CSS 前處理、第三方套件等。拆模組解決的是程式碼好不好維護，建置工具解決的是開發體驗與發布品質，兩件事可以分開決定。

## 我的現況

[ptway_profile](../../repos/ptway-profile/) 只有一個 `index.html`，共 1,140 行，沒有框架也沒有建置工具。內容分三塊：

- `<style>`：第 10 行起，約 460 行 CSS，含深色模式（`:root[data-theme="dark"]`）與 `prefers-color-scheme` 的處理。
- `<body>`：標記與無障礙屬性（`aria-label`、`aria-expanded`、`aria-pressed`、`<dialog>` 等）。
- `<script>`：第 700 行起的一段經典 script，包含 `RESUME` 資料物件（約 140 行）、`esc()` 跳脫函式、主題切換、各區塊的渲染與 `IntersectionObserver`。

這個網頁的結構本來就不差：資料集中在 `RESUME` 一個物件，畫面由程式依資料產生，不是把內容散在標記裡；輸出到 `innerHTML` 前都先過 `esc()` 跳脫；主題選擇記在 `localStorage`，而且存取包了 `try/catch`；互動元件有對應的 ARIA 屬性。這些都是好習慣。

要處理的是檔案太長。渲染方式是用樣板字串組 HTML 再寫入 `innerHTML`，例如：

```js
// ptway_profile/index.html，約第 971 行
container.innerHTML = all.map((l, i) =>
  `<button class="chip" type="button" aria-pressed="${i === 0}" data-value="${esc(l)}">${esc(l)}</button>`
).join("");
```

這在小網頁沒問題。程式碼變多後，所有東西共用同一個全域範圍，改資料與改畫面都得在同一個檔案裡找位置。

## 與主流的落差

ES modules 的語法與行為，以 MDN 的模組指南為準（見參考資源）。重點是：只拆成 ES modules，不用任何建置工具也能運作；瀏覽器直接載入每個模組檔。

建置工具帶來三件事：

- **開發伺服器**：存檔後瀏覽器自動更新。
- **打包**：把多個模組合成較少的檔案，減少請求數。
- **壓縮與最佳化**：縮小檔案、移除沒用到的程式碼、替檔名加雜湊以利快取。

主流的選擇是 Vite。官方公告指出，Vite 8 於 2026 年 3 月 12 日發布穩定版，改用以 Rust 撰寫的 Rolldown 作為單一打包工具。

判斷這個網頁需不需要：只有三五個模組、沒用到第三方套件時，不加建置工具也完全可以，用 GitHub Pages 直接放靜態檔即可。需要的時機是想用 npm 套件、TypeScript，或想要自動更新的開發環境。所以建議先拆模組，再把 Vite 當成選配。

## 學習路線

1. 讀 MDN 模組指南，搞懂 `export`／`import`、`type="module"`，以及模組有自己的作用域、預設延後執行。
2. 理解模組載入的限制：瀏覽器直接開 `file://` 常遇到限制，開發時用本機靜態伺服器（細節見 MDN）。
3. 把一個全域變數塞滿的 script 拆成模組，決定哪些該 `export`。
4. 讀 Vite 官方入門文件，用 `npm create vite@latest` 建一個 vanilla 專案，認識 `dev`、`build`、`preview` 三個指令。
5. 了解 `base` 設定與 `dist/` 輸出，知道部署到 GitHub Pages 的子路徑時要改什麼。

## 動手練習

在 `ptway_profile` 做兩階段，每一階段都要確認頁面行為與拆分前相同（深色模式切換、技能篩選、專案彈窗都正常）。

**階段一，不用建置工具。** 把 `<script>` 內容拆成三個檔案，並把 `index.html` 的 `<script>` 改成 `<script type="module" src="main.js"></script>`：

- `resume-data.js`：只有 `export const RESUME = {...}`。
- `render.js`：各區塊的渲染函式，`import { RESUME }`，匯出一個 `renderAll()`。
- `theme.js`：`applyTheme`、`storageGet`／`storageSet` 與按鈕事件。

`esc()` 與 `icon()` 兩個輔助函式兩邊都用到，可另放 `utils.js`。用 `python3 -m http.server` 之類的靜態伺服器開啟，確認可以運作。

**階段二，加上 Vite。** 用 Vite 的 vanilla 範本當參考，把 `index.html` 與四個模組搬進去，執行 `npm run dev`、`npm run build`、`npm run preview`。如果要部署到 GitHub Pages 的專案網址（`https://<使用者>.github.io/<存放庫>/`），Vite 文件說 `base` 要設為 `'/<存放庫>/'`。自動部署的寫法放在 [持續整合](../../dev-workflow/continuous-integration/)。

## 參考資源

- [JavaScript modules（MDN）](https://developer.mozilla.org/docs/Web/JavaScript/Guide/Modules)：`export`／`import`、`type="module"` 與模組行為的完整說明。
- [Getting Started（Vite 官方）](https://vite.dev/guide/)：建立專案、dev／build／preview 指令與 Node.js 版本需求。
- [Deploying a Static Site（Vite 官方）](https://vite.dev/guide/static-deploy)：`base` 設定與 GitHub Pages 的部署範例。
- [Announcing Vite 8](https://vite.dev/blog/announcing-vite8)：Vite 8 的發布與改用 Rolldown 的說明。

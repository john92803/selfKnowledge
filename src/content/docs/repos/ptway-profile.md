---
title: ptway_profile
description: 單一 HTML 檔的互動式個人簡歷網頁，包含技能、經歷與專案作品。
kind: repo
---

- 存放庫：https://github.com/john92803/ptway_profile
- 分析日期：2026-11-15
- 分析時的 commit：b503fe0

## 技術棧

- **語言**：HTML、CSS、JavaScript，全部寫在同一個 `index.html`（約 1,140 行）
- **框架與建置**：沒有使用任何框架、套件或建置工具，也沒有載入外部資源
- **樣式**：CSS 自訂屬性做主題色、Grid 與 Flexbox 排版、media query 做響應式
- **互動**：原生 DOM API、`IntersectionObserver`、`localStorage`、`matchMedia`、`<dialog>` 元素

## 觀察

做得好的地方：

- **資料與畫面分離**。簡歷內容集中在一個 `RESUME` 物件，技能、時間軸、專案、聯絡方式都由程式依資料產生，更新內容不必改 HTML 結構。
- **深色模式做得完整**。主題色全部定義成 CSS 自訂屬性，依系統偏好決定預設值，並把使用者的選擇記在 `localStorage`。
- **有顧及無障礙**。使用 `header`、`nav`、`main`、`section`、`footer` 等語意標籤，加上多處 `aria-` 屬性，並偵測 `prefers-reduced-motion` 來關閉動畫。
- **事件處理採用委派**。清單類的點擊事件掛在容器上，而不是每個項目各掛一個。
- **讀寫 `localStorage` 有包錯誤處理**，在無痕模式下不會中斷。

可以改進的地方：

- **所有程式都在同一個檔案**。HTML、CSS、JavaScript 與資料共一千多行放在一起，沒有拆成模組。
- **畫面以字串拼接後寫入 `innerHTML`**。目前資料是自己寫死的所以安全，但資料一旦改成從外部取得，就會有注入風險。
- **沒有型別檢查、lint 與格式化工具**，也沒有測試。
- **沒有自動部署設定**。存放庫沒有 `.github/workflows/`。
- **README 只有兩行**。

## 引出的知識條目

- [前端模組化與建置工具](../../web-frontend/modules-and-build-tools/)：所有程式都在同一個 `index.html`
- [持續整合](../../dev-workflow/continuous-integration/)：沒有自動部署設定

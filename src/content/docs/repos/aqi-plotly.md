---
title: AQI_plotly
description: 透過開放資料 API 取得台灣各測站的空氣品質指標，用 Plotly 畫成互動地圖。
kind: repo
---

- 存放庫：https://github.com/john92803/AQI_plotly
- 分析日期：2026-11-15
- 分析時的 commit：1386806

## 技術棧

- **語言**：Python
- **資料取得**：`requests` 呼叫環境部開放資料 API
- **資料處理**：pandas
- **視覺化**：Plotly Express 的 `scatter_mapbox`，輸出成 HTML 後以瀏覽器開啟

## 觀察

做得好的地方：

- 五十行內完成取得資料、清理、繪圖、輸出的完整流程。
- 繪圖前先過濾掉不是數字的 AQI 值，並轉換欄位型別。
- 自訂色階對應 AQI 的嚴重程度，滑鼠移到測站上會顯示狀態與主要污染物。

可以改進的地方：

- **程式無法直接執行**。`API_URL` 那一行被註解掉，後面卻直接使用這個變數。
- **API 設定寫在程式碼裡**，不是從環境變數讀取。
- **沒有錯誤處理**。`requests.get` 沒有設定逾時，也沒有檢查回應狀態，API 失敗時會在解析 JSON 時才出錯。
- **沒有相依套件清單與 `.gitignore`**。
- **README 只有一行**，沒有說明如何取得 API 金鑰與執行方式。

## 引出的知識條目

- [相依套件與環境管理](../../python-engineering/dependency-management/)：沒有相依套件清單
- [設定與機密管理](../../python-engineering/config-and-secrets/)：API 設定寫在程式碼裡
- [README 撰寫](../../dev-workflow/readme-writing/)：README 只有一行

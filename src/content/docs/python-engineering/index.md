---
title: Python 專案工程
description: Python 專案的套件、版控、設定、測試與程式碼檢查。
kind: index
sidebar:
  label: 總覽
  order: 0
---

這個目錄收 Python 專案在「寫完程式之後」該有的工程習慣：環境怎麼重建、哪些檔案進版控、設定放哪裡、怎麼自動檢查正確性。模型與實驗本身的問題放在 `ml-experiments`，不放這裡。

| 條目 | 摘要 | 狀態 | 優先度 |
|---|---|---|---|
| [設定與機密管理](config-and-secrets/) | 把連線資訊、金鑰、路徑從程式碼移到環境變數，並集中在一處讀取。 | 待學習 | 高 |
| [相依套件與環境管理](dependency-management/) | 用 pyproject.toml 與 lockfile 記錄套件版本，讓專案在別台機器上裝得出一樣的環境。 | 待學習 | 高 |
| [版控該排除的檔案與大型檔案](gitignore-and-large-files/) | 分辨哪些檔案不該進 git，以及訓練資料與模型權重該放哪裡。 | 待學習 | 高 |
| [程式碼檢查與格式化工具](lint-and-format/) | 用 Ruff 自動檢查常見錯誤並統一格式。 | 待學習 | 中 |
| [測試](testing/) | 用 pytest 為容易出錯的邏輯寫自動化測試。 | 待學習 | 中 |

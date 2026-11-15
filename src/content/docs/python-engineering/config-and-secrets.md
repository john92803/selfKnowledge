---
title: 設定與機密管理
description: 把連線資訊、金鑰、路徑從程式碼移到環境變數，並集中在一處讀取。
status: todo
priority: high
repos:
  - har-database-project
  - aqi-plotly
  - ai-cup-result
tags:
  - python
  - configuration
  - security
updated: 2026-11-15
---

## 這是什麼

設定是會因環境而不同的值：資料庫位址與帳密、API 金鑰、資料夾路徑。寫死在程式碼裡有兩個問題：換環境就得改程式，而且程式碼會進版控，機密也跟著進去，之後即使刪掉也還留在歷史紀錄。常見做法是把這些值放在環境變數（本機開發用不進版控的 `.env` 檔），程式啟動時在單一模組讀取並驗證，其他檔案都從那裡取用。

## 我的現況

- [har-database-project](../../repos/har-database-project/) 的 `DB_CONFIG` 字典在四個檔案各寫一次：`readData.py`、`har_compressed.py`、`train.py`、`decomp_train.py`。內容是 host、port、database、user、password，每個檔案都用 `psycopg2.connect(**DB_CONFIG)` 連線。改一個設定要改四處，漏改就會連到不同的資料庫。
- [aqi-plotly](../../repos/aqi-plotly/) 的 API 設定寫在程式碼裡，不是從環境變數讀取。
- [ai-cup-result](../../repos/ai-cup-result/) 的 `copy_result.py` 把路徑寫死：

```python
# copy_result.py
source_dir = "/runs/detect"
dest_dir = "/runs/yolov9_res"
```

  README 的評估步驟也依賴同樣的 `/runs/...` 路徑，換一台機器就得改程式。

## 與主流的落差

主流做法分三層：

1. `.env` 不進版控，另附一份只有變數名稱、沒有真實值的 `.env.example` 進版控，讓別人知道要填什麼。
2. python-dotenv 的 `load_dotenv()` 讀取 `.env` 並寫入環境變數，程式用 `os.environ` 或 `os.getenv` 取值。預設不會覆蓋已存在的環境變數。
3. pydantic-settings：繼承 `BaseSettings` 定義有型別的設定類別，欄位自動從環境變數讀取，可用 `model_config` 的 `env_file` 同時讀 `.env`；欄位型別用 `SecretStr` 時，印出設定物件會被遮蔽，取值要明確呼叫 `get_secret_value()`，避免機密意外進入 log。

GitHub 的 push protection 會在推送時阻擋含有金鑰的 commit，但它只認得已知的格式（合作夥伴的格式、通用格式、自訂規則等），不符合這些格式的機密仍可能通過，所以不能當成唯一防線。

差距在於設定分散、沒有型別、沒有範本檔。若某個值已經進過 git，就要當它外洩：到服務端撤銷並重新產生，再從程式移除；舊的值仍在 git 歷史裡，所以「刪掉那一行」不等於安全（見 [版控該排除的檔案與大型檔案](../gitignore-and-large-files/) 對歷史紀錄的說明）。

## 學習路線

1. 環境變數：用 `os.environ`、`os.getenv` 讀值，理解 shell 設的變數與程式讀到的關係。
2. python-dotenv：`.env` 與 `load_dotenv()`，並把 `.env` 加進 `.gitignore`、另寫 `.env.example`。
3. 集中設定模組：把所有設定放在一個 `config.py`，其他檔案只 import 它。
4. pydantic-settings：用 `BaseSettings` 定義型別、預設值與必填欄位，用 `SecretStr` 保護機密。
5. 金鑰外洩的處理順序：撤銷並重新產生、從程式移除、知道 git 歷史中仍然看得到、必要時才改寫歷史。
6. 預防：了解 push protection 的範圍與限制，不依賴它當唯一防線。

## 動手練習

1. 在 [har-database-project](../../repos/har-database-project/) 新增 `config.py`，用 pydantic-settings 定義 `host`、`port`、`database`、`user`、`password`（`password` 用 `SecretStr`），從環境變數與 `.env` 讀取。
2. 把 `readData.py`、`har_compressed.py`、`train.py`、`decomp_train.py` 四個檔案裡的 `DB_CONFIG = {...}` 刪掉，改成從 `config` import；連線處在呼叫 `psycopg2.connect` 時傳入設定值。用 `grep -rn "DB_CONFIG ="` 確認專案裡只剩一處定義。
3. 加入 `.env.example`（只有變數名稱）與 `.gitignore` 的 `.env`，並在 README 說明怎麼設定。
4. [aqi-plotly](../../repos/aqi-plotly/) 改成從環境變數讀取 API 設定，沒設定時給出清楚的錯誤訊息。
5. [ai-cup-result](../../repos/ai-cup-result/) 的 `copy_result.py` 改用 `argparse` 或環境變數接收來源與目的資料夾，預設值保留原路徑。

## 參考資源

- [pydantic-settings：Settings management](https://pydantic.dev/docs/validation/latest/concepts/pydantic_settings/)：`BaseSettings`、`env_file` 與 `SecretStr` 的官方說明。
- [python-dotenv 文件](https://saurabh-kumar.com/python-dotenv/)：`load_dotenv()` 用法，並提醒 `.env` 不要進版控。
- [About push protection](https://docs.github.com/en/code-security/secret-scanning/introduction/about-push-protection)：GitHub 在推送時阻擋金鑰的機制與支援的格式範圍。

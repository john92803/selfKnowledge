---
title: HAR_databaseProject
description: 以 TimescaleDB 儲存加速度時序資料，比較原始儲存與自訂壓縮儲存在空間、讀寫時間與模型準確率上的差異。
kind: repo
---

- 存放庫：https://github.com/john92803/HAR_databaseProject
- 分析日期：2026-11-15
- 分析時的 commit：19532c2

## 技術棧

- **語言**：Python
- **資料庫**：PostgreSQL 加 TimescaleDB（hypertable），以 `psycopg2` 連線，`execute_values` 批次寫入
- **壓縮**：自行實作的三階段級聯壓縮（量化 → 差分編碼 → zlib），結果存成 `BYTEA` 欄位
- **模型**：Keras `Sequential` 的 1D CNN（三層 `Conv1D`），scikit-learn 切分資料與計算混淆矩陣
- **資料與繪圖**：pandas、NumPy、matplotlib、seaborn
- **資料集**：UCI HAR（三軸加速度，50 Hz，六類活動）

## 觀察

做得好的地方：

- 實驗設計完整：同一份資料以兩種方式儲存，並用相同模型架構比較準確率，結論有對照組。
- 資料表建立了 hypertable 與複合索引（`subject_id, activity_id, time DESC`），寫入採批次處理。
- 壓縮流程拆成量化、差分、二進位壓縮三個獨立步驟，並記錄每個視窗的原始大小與壓縮率。
- README 清楚說明資料來源、做法與檔案用途。

可以改進的地方：

- **資料庫連線設定重複且寫在程式碼裡**。`DB_CONFIG` 在 `readData.py`、`har_compressed.py`、`train.py`、`decomp_train.py` 四個檔案各寫一次，不是從環境變數或設定檔讀取。
- **沒有與 TimescaleDB 內建壓縮比較**。壓縮是在應用程式端自行實作，程式中沒有啟用 TimescaleDB 原生的欄式壓縮，因此缺少「自訂方案 vs 資料庫內建方案」這組對照。
- **訓練與測試資料可能來自同一位受測者**。`train.py` 以 `train_test_split(X, y, stratify=y)` 隨機切分視窗，沒有依 `subject` 分組，同一人的資料會同時出現在訓練集與測試集，準確率可能偏高。
- **沒有相依套件清單**。存放庫沒有 `requirements.txt` 或 `pyproject.toml`，無法得知各套件的版本。
- **沒有 `.gitignore`**，也沒有測試。
- **原始資料直接進版控**。三個訓練用 CSV 檔放在存放庫根目錄，佔了存放庫大部分的容量。
- **訓練程式重複**。`train.py` 與 `decomp_train.py` 的模型建立、繪圖、評估函式內容相近，各自維護一份。

## 引出的知識條目

- [相依套件與環境管理](../../python-engineering/dependency-management/)：沒有相依套件清單
- [版控該排除的檔案與大型檔案](../../python-engineering/gitignore-and-large-files/)：三個訓練用 CSV 直接進版控
- [設定與機密管理](../../python-engineering/config-and-secrets/)：`DB_CONFIG` 在四個檔案各寫一次
- [資料切分與資料洩漏](../../ml-experiments/data-leakage-and-splitting/)：切分資料時沒有依受測者分組
- [時序資料庫的內建壓縮](../../database/timescaledb-columnstore/)：沒有與資料庫內建的壓縮比較

---
title: 時序資料庫的內建壓縮
description: TimescaleDB 把舊資料轉成欄式儲存來壓縮，壓縮後仍可用 SQL 查詢。
status: todo
priority: medium
repos:
  - har-database-project
tags:
  - database
  - timescaledb
  - postgresql
  - compression
updated: 2026-11-15
---

## 這是什麼

一般 PostgreSQL 以「列」為單位儲存，同一筆資料的所有欄位放在一起。欄式儲存（columnar）則把同一欄的值放在一起，相鄰的值通常很像（例如時間戳遞增、感測值變化小），因此容易用差分編碼、字典編碼等方式壓縮，掃描單一欄位的聚合查詢也更快。

TimescaleDB 是 PostgreSQL 的時序資料擴充。它把資料依時間切成 chunk，可以把較舊的 chunk 轉成欄式格式。官方文件目前把這個功能稱為 hypercore 或 columnstore，舊版文件稱為 compression。轉換後資料仍是資料表，照樣用 SQL 查詢。

## 我的現況

[HAR_databaseProject](../../repos/har-database-project/) 比較「原始儲存」與「自訂壓縮」兩組，沒有用到 TimescaleDB 自己的壓縮功能。

- `readData.py` 建立 `activity_data`，每個取樣點一列（`time`、`subject_id`、`activity_id`、`window_id`、`sample_index`、`acc_x`、`acc_y`、`acc_z` 等欄位），再呼叫 `create_hypertable('activity_data', 'time', ...)`。
- `har_compressed.py` 在應用程式端壓縮：每個視窗的 128×3 個值先乘 1000 轉成整數（量化），再做差分編碼，打包後用 `zlib` 壓縮，存進 `activity_data_compressed` 的 `BYTEA` 欄位。這張表是普通資料表，沒有轉成 hypertable。
- 兩支程式都沒有出現 `enable_columnstore`、`segmentby` 或壓縮 policy。

資料量從 CSV 算得出來：7,352 個視窗、每窗 128 點，共約 94 萬列；21 位受試者。時間戳由 `readData.py` 以 `2025-01-01` 起、每窗 2.56 秒排出，全部落在約 5 小時內。

兩組做法的取捨在於查詢能力。`BYTEA` 裡是壓縮過的位元組，資料庫看不到內容，`decomp_train.py` 必須把整個視窗取出、在 Python 解壓才能用。這是課程專題要探討的做法，沒有問題。缺的是第三組對照。

## 與主流的落差

官方文件現在把這個功能稱為 hypercore／columnstore，文件位於 tigerdata.com。設定的重點是兩個選項：

- `orderby`：建議用時間欄位，讓隨時間變化的資料排在一起。
- `segmentby`：建議選最常拿來篩選的欄位。基數（不同值的數量）太高會讓每個分段太小，壓縮率變差。

既有的 hypertable 以 `ALTER TABLE ... SET (timescaledb.enable_columnstore, ...)` 啟用，舊的 `ALTER TABLE` 壓縮語法自 2.18.0 起棄用。若網路上的教學寫的是舊語法，以官方現行文件為準。

和目前的做法比較：自訂壓縮可以針對資料特性調整（例如現有的量化會損失三位小數以後的精度），但壓縮後無法用 SQL 篩選或聚合。原生 columnstore 由資料庫維護，壓縮後仍可 `WHERE`、`GROUP BY`，差別是壓縮率與精度取捨由資料庫決定。兩者的壓縮率誰高，要實測，這裡不預設。

## 學習路線

1. 理解列式與欄式儲存的差別，以及為什麼時序資料適合欄式壓縮。
2. 理解 hypertable 與 chunk：資料依時間切塊，columnstore 是逐個 chunk 轉換。
3. 學會 `ALTER TABLE ... SET (timescaledb.enable_columnstore, ...)` 設定 `segmentby` 與 `orderby`。
4. 學會手動轉換（`convert_to_columnstore`）與用 policy 自動轉換（`add_columnstore_policy`）。
5. 學會查看壓縮前後的大小（`hypertable_columnstore_stats`）。
6. 理解壓縮資料如何查詢，以及它對寫入與更新有什麼限制（讀官方文件的相關章節）。

## 動手練習

對 `activity_data` 啟用 columnstore，作為第三組對照。語法照官方文件，以下是依這張資料表套用的寫法（執行前先對照官方現行頁面）：

```sql
ALTER TABLE activity_data SET (
  timescaledb.enable_columnstore,
  timescaledb.segmentby = 'subject_id',
  timescaledb.orderby = 'time DESC'
);

-- 用 show_chunks('activity_data') 查出 chunk 名稱後逐個轉換
CALL convert_to_columnstore('<chunk 名稱>');

SELECT pg_size_pretty(before_compression_total_bytes) AS before,
       pg_size_pretty(after_compression_total_bytes) AS after
FROM hypertable_columnstore_stats('activity_data');
```

資料的時間範圍只有約 5 小時，預設的 chunk 時間間隔很可能遠大於此，所以大概只有一個 chunk。先用 `show_chunks` 確認，不要假設 policy 的 `after` 間隔會剛好轉到。

`segmentby` 可以這樣討論：

- `subject_id` 只有 21 個值，基數低，每個分段有數萬列，是合理的候選。
- `activity_id` 只有 6 個值，同樣低，但要看查詢是否常依活動篩選。
- `window_id` 有 7,352 個值，每段只有 128 列，分段太小，官方說基數高會讓壓縮變差，不適合。
- `train.py` 目前是整張表 `ORDER BY window_id, sample_index` 全部讀出，沒有用任何欄位篩選。選哪個欄位取決於你之後想怎麼查，可以兩種設定各跑一次。

比較三組（原始、自訂 `BYTEA`、columnstore）時，記錄三件事：佔用空間、同一個查詢的耗時、能不能直接用 SQL 篩選內容（例如 `WHERE activity_name = 'WALKING'` 而不先解壓）。做對的標準是三組都有可重複的數字，而且「能否直接篩選」那一項有實際跑過查詢驗證。

## 參考資源

- [Setup hypercore（TigerData 文件）](https://www.tigerdata.com/docs/build/columnar-storage/setup-hypercore)：啟用 columnstore、`segmentby`／`orderby`、policy、手動轉換與查看大小的 SQL 範例。

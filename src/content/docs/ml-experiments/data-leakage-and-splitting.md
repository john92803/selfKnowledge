---
title: 資料切分與資料洩漏
description: 切分訓練與測試資料時，避免同一來源的樣本落在兩邊而高估模型表現。
status: todo
priority: high
repos:
  - har-database-project
tags:
  - machine-learning
  - evaluation
  - scikit-learn
updated: 2026-11-15
---

## 這是什麼

資料洩漏（data leakage）指測試集的資訊在訓練階段就被模型看到，導致測得的表現比真實部署時高。常見型態有三種：同一來源的樣本分散在訓練與測試兩邊（例如同一個人、同一段錄影的相鄰片段）、時序資料用未來預測過去、以及在切分之前就用全部資料做前處理（標準化、特徵選取）。

感測器資料特別容易出問題：同一位受測者的相鄰視窗高度相似，隨機切分時，測試視窗幾乎都能在訓練集找到「近親」，模型只要記住個人特徵就能拿高分。這樣量到的是「認得這個人」，不是「能辨識沒見過的人的活動」。

## 我的現況

[HAR_databaseProject](../../repos/har-database-project/) 的 `train.py` 從資料庫讀出視窗後，用隨機切分取得測試集：

```python
# train.py（main 內）
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
```

- 資料表有 `subject_id` 欄位（`readData.py` 建表、`har_compressed.py` 的壓縮表也有），但 `load_data_from_database()` 的查詢沒有選這個欄位，`prepare_training_data()` 只回傳 `X` 與 `y`，切分時完全沒有用到受測者資訊。所以同一位受測者的視窗會同時出現在訓練集與測試集。
- `decomp_train.py` 的 `main_standard()` 是完全相同的切法（同樣的參數）；它讀壓縮表時也只取 `window_id`、`activity_id`、`compressed_data`，沒取 `subject_id`。檔案後半被註解掉的 `main_memory_efficient()` 也是同一種切法。
- 兩個檔案的 `model.fit` 都把 `(X_test, y_test)` 當 `validation_data`，而 `EarlyStopping`（監看 `val_loss`）與 `ModelCheckpoint`（監看 `val_accuracy`）依它挑選模型。也就是測試集同時參與了「何時停、存哪一版」的決定，最後報告的測試準確率不再是完全沒被用過的資料上的結果。
- README 說資料是 UCI HAR 的訓練集整理成三個 CSV。依下面查到的資料集說明，原始資料集本來就依受測者分成訓練與測試兩份；這個專案只用了其中的訓練那份，因此受測者人數要用資料實際確認（例如查詢 `SELECT COUNT(DISTINCT subject_id)`），不要假設是 30 人。

## 與主流的落差

scikit-learn 提供依分組切分的工具：`GroupShuffleSplit` 與 `GroupKFold` 在 `split(X, y, groups)` 接收 `groups` 參數，保證同一組的樣本不會被拆到訓練與測試兩邊。`GroupShuffleSplit` 的 `test_size` 以「組數」而不是樣本數計算，並可用 `random_state` 固定結果；`GroupKFold` 要求組數不少於折數。這兩者沒有 stratify 功能，各類別的比例可能與整體略有出入，要自己檢查。

UCI 資料集頁面說明，資料是以受測者為單位，約 70% 的受測者用來產生訓練資料、30% 產生測試資料，也就是官方的切法依受測者，而不是依視窗隨機切。這個專案的做法與資料集設計的評估方式不同，所以它報告的準確率與文獻中依受測者切分的結果不能直接比較。

scikit-learn 官方文件的 Common pitfalls 一章專談資料洩漏，其中「前處理造成的洩漏」一節指出：在切分前對全部資料做特徵選取，會讓測試標籤影響訓練，建議用 `Pipeline` 讓前處理只在訓練資料上 fit；文中也說這類風險適用於 `StandardScaler` 等大多數轉換器。

## 學習路線

1. 認識洩漏的三種型態：同來源樣本跨集合、時間順序錯亂、前處理看到測試資料。
2. 學會 `GroupShuffleSplit` 與 `GroupKFold`，知道 `groups` 要放什麼（這裡是 `subject_id`）以及它們不做 stratify 的限制。
3. 區分訓練、驗證、測試三份資料的用途：用來挑模型的資料不能同時拿來報告最終成績。
4. 了解時序資料的切分：依時間先後切，scikit-learn 有 `TimeSeriesSplit`，細節見交叉驗證一章。
5. 前處理的洩漏：標準化、特徵選取一律只用訓練資料 fit，用 `Pipeline` 包起來。

## 動手練習

在 HAR_databaseProject 把切分改成依受測者分組，重跑原始與壓縮兩種方案，比較準確率與原本的差距，並更新 README 的結論。不要事先預測差距多大，以實際跑出來的數字為準。

1. `train.py` 的查詢加上 `subject_id`；`decomp_train.py` 的查詢也加上 `subject_id`，解壓時一併收集。
2. `prepare_training_data()` 多回傳一個 `groups` 陣列（每個視窗取第一列的 `subject_id`），再改寫切分：

```python
from sklearn.model_selection import GroupShuffleSplit

# groups：與 X、y 等長，每個視窗所屬的 subject_id
gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
train_idx, test_idx = next(gss.split(X, y, groups=groups))
X_train, X_test = X[train_idx], X[test_idx]
y_train, y_test = y[train_idx], y[test_idx]

# 確認沒有受測者同時出現在兩邊
assert set(groups[train_idx]).isdisjoint(groups[test_idx])
```

3. 另外從訓練集再依受測者切出一份驗證集給 `EarlyStopping` 與 `ModelCheckpoint` 使用，`X_test` 只在最後評估一次。
4. 兩種方案用同一組 `random_state`，確認兩邊切出的受測者相同，比較才公平。
5. 把新舊準確率、混淆矩陣一起寫進 README，並說明切分方式改了。

## 參考資源

- [scikit-learn GroupShuffleSplit](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.GroupShuffleSplit.html)：依組別隨機切分，`test_size` 以組數計。
- [scikit-learn GroupKFold](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.GroupKFold.html)：不讓同一組出現在兩邊的 K 折交叉驗證。
- [scikit-learn 使用者指南：Cross-validation iterators for grouped data](https://scikit-learn.org/stable/modules/cross_validation.html#cross-validation-iterators-for-grouped-data)：各種分組切分器的說明與範例。
- [scikit-learn Common pitfalls：Data leakage](https://scikit-learn.org/stable/common_pitfalls.html#data-leakage)：切分前做前處理造成洩漏的示範與 Pipeline 解法。
- [UCI HAR 資料集頁面](https://archive.ics.uci.edu/dataset/240/human+activity+recognition+using+smartphones)：資料集說明，包含依受測者切分訓練與測試的描述。
- 相關條目：[實驗可重現性](../reproducibility/)（固定切分用的 random_state）。

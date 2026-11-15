---
title: 程式碼檢查與格式化工具
description: 用 Ruff 自動檢查常見錯誤並統一格式。
status: todo
priority: medium
repos:
  - final-project
  - lab2
tags:
  - python
  - ruff
  - code-quality
updated: 2026-11-15
---

## 這是什麼

linter 在不執行程式的情況下掃描原始碼，找出未使用的 import、未定義的名稱、可疑的寫法；formatter 則把縮排、引號、換行統一成固定風格，讓差異只剩下真正的修改。兩者都能自動化，不必靠人眼 review。Ruff 把這些工作放進一個工具：`ruff check` 是 linter，`ruff format` 是 formatter。

## 我的現況

final_project 與 lab2 都沒有 lint 或格式化設定（沒有 `pyproject.toml`、`ruff.toml`、`setup.cfg`、`.flake8` 等）。

- [final-project](../../repos/final-project/) 的 `test.py` 在函式裡用 `global`：

```python
# test.py
def text(text):
    global img
    global img1
    img1 = img.copy()
```

  函式參數名稱 `text` 與函式本身同名，`img`、`img1` 靠全域變數傳遞，讀程式的人很難知道誰改了它們。
- 同一個檔案的主迴圈裡，`player` 只在 `a`、`b`、`c` 其中一個信心值大於 0.8 時才會被指定；三個都不超過 0.8 時，`judge_game(player, cp[index])` 會用到沒有指定過的 `player`（第一次按下 `p` 時會直接 `NameError`，之後則沿用上一輪的值）。
- [lab2](../../repos/lab2/) 沒有任何設定；`src/utils.py` 等檔案的縮排、空行風格靠作者習慣維持。

## 與主流的落差

Ruff 一個工具可以取代過去分開使用的 flake8、Black、isort：`ruff check` 負責 lint，可加 `--fix` 自動修正安全的項目；`ruff format` 是設計成 Black 替代品的 formatter；import 排序由 lint 規則 `I` 處理，formatter 本身不排 import，所以要執行 `ruff check --select I --fix` 再 `ruff format`。設定寫在 `pyproject.toml` 的 `[tool.ruff]` 與 `[tool.ruff.lint]`，例如 `select = ["E", "F", "I"]`；沒有設定 `select` 時使用預設規則集，設了 `select` 會取代預設，想在預設之外追加要用 `extend-select`。

Ruff 不做完整的型別檢查，那要另外用 mypy 或 pyright。

落差是完全沒有自動檢查。哪些問題會被抓到取決於啟用的規則：例如 `global` 對應的是 pylint 系列的規則 `PLW0603`（`global-statement`），要把 `PL` 相關規則選進來才會檢查。`player` 可能未指定的問題，沒有查到對應的 Ruff 規則代碼，所以不能保證 Ruff 會報，這類邏輯錯誤應該靠 [測試](../testing/) 抓。

## 學習路線

1. 安裝與執行：用 uv 把 ruff 加進開發相依（見 [相依套件與環境管理](../dependency-management/)），跑 `ruff check` 與 `ruff format --check`。
2. 讀懂報告：每個問題有規則代碼，學會查規則頁面理解為什麼是問題。
3. 在 `pyproject.toml` 設定：用 `select` 或 `extend-select` 選規則、`ignore` 排除，並決定行寬。
4. 自動修正：`ruff check --fix` 只套用安全的修正，了解 unsafe fix 為什麼要明確加旗標。
5. 編輯器整合：讓存檔時自動格式化，錯誤直接顯示在編輯器裡。
6. 接到持續整合：在 CI 跑 `ruff check` 與 `ruff format --check`，見 [持續整合](../../dev-workflow/continuous-integration/)。

## 動手練習

在 [lab2](../../repos/lab2/) 加上 Ruff：

1. 與 [相依套件與環境管理](../dependency-management/) 的練習銜接，先有 `pyproject.toml`，再加入 `[tool.ruff.lint]`，`select = ["E", "F", "I"]`。
2. 執行 `ruff check`，記錄回報了幾個問題、各屬於哪個規則代碼。先用 `ruff check --fix` 處理可自動修的，其餘手動修。
3. 執行 `ruff format`，用 `git diff` 看它改了什麼，確認程式行為沒變（例如重新跑一次 `python src/inference.py --model unet` 或你的測試）。
4. 之後在 [final-project](../../repos/final-project/) 做同樣的事。這次把 `PL` 規則選進來，觀察 `global` 是否被回報；`player` 的問題則手動修正，並用 [測試](../testing/) 確認。

## 參考資源

- [Ruff 官方文件](https://docs.astral.sh/ruff/)：功能總覽與設定入口。
- [Ruff：The Linter](https://docs.astral.sh/ruff/linter/)：`ruff check`、`--fix`、`select` 規則選擇。
- [Ruff：The Formatter](https://docs.astral.sh/ruff/formatter/)：`ruff format` 與 Black 的關係，說明 formatter 不排 import。
- [Ruff：global-statement (PLW0603)](https://docs.astral.sh/ruff/rules/global-statement/)：`global` 對應的規則。
- [Ruff - Python Dev Tools Handbook](https://pydevtools.com/handbook/reference/ruff/)：Ruff 取代哪些工具，以及需要另外搭配型別檢查器。

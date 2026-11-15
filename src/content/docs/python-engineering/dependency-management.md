---
title: 相依套件與環境管理
description: 用 pyproject.toml 與 lockfile 記錄套件版本，讓專案在別台機器上裝得出一樣的環境。
status: todo
priority: high
repos:
  - har-database-project
  - aqi-plotly
  - lab6
  - final-project
  - lab5
  - lab2
  - ai-cup-result
tags:
  - python
  - uv
  - packaging
updated: 2026-11-15
---

## 這是什麼

Python 專案的相依套件，是程式跑起來所需要的第三方套件及其版本。只寫套件名稱，別人（或半年後的自己）安裝時會拿到當下最新的版本，行為可能已經不同。解法是把「我要哪些套件」與「實際解析出哪些確切版本」分開記錄：前者寫在 `pyproject.toml`，後者寫在 lockfile。lockfile 進版控後，任何機器都能還原出同一組環境。這也是 [實驗可重現性](../../ml-experiments/reproducibility/) 的基礎。

## 我的現況

- [har-database-project](../../repos/har-database-project/)、[aqi-plotly](../../repos/aqi-plotly/)、[lab6](../../repos/lab6/)、[final-project](../../repos/final-project/) 的根目錄都沒有 `requirements.txt`、`pyproject.toml` 或任何套件清單。例如 HAR 專案的 `.py` 檔 import `psycopg2` 等套件，但沒有地方記錄需要它們。
- [lab5](../../repos/lab5/) 的 `requirements.txt` 中，`torch`、`numpy`、`opencv-python`、`imageio`、`wandb` 沒有版本號，只有 `gymnasium==1.1.1` 固定了版本，`ale-py>=0.10.0` 是下限。
- [lab2](../../repos/lab2/) 的 `requirements.txt` 只有下限，例如：

```text
torch>=2.0.0
torchvision>=0.15.0
numpy>=1.24.0
```

  下限只保證「不低於」，沒有上限，也不是實際跑出結果的版本。
- [ai-cup-result](../../repos/ai-cup-result/) 的安裝步驟散在 `README.md` 的 8 個步驟：先 `conda create` 建 Python 3.7 環境，再 `pip install torch==1.13.1+cu117 ... --extra-index-url ...`，再 `pip install -r requirements.txt`、`pip install -r yolov9/requirements.txt`，最後還有 `pip install cython`、`cython_bbox`、`faiss-cpu`、`faiss-gpu` 等單獨指令。順序錯了就可能裝不起來，沒有一個指令能還原環境。

## 與主流的落差

現在主流的做法是用 uv 這類專案工具：`pyproject.toml` 記錄相依範圍，`uv.lock` 是跨平台的 lockfile，記錄確切版本與雜湊。`uv add` 會同時更新這兩個檔案；`uv sync --locked` 依 lockfile 還原環境，lockfile 與 `pyproject.toml` 不一致時會報錯而不是默默更新。uv 官方文件建議把 `uv.lock` 進版控（來源見參考資源）。

落差在於：這些存放庫有的完全沒有記錄，有的記錄了名稱卻沒有確切版本，所以「在乾淨環境能不能跑起來」無法驗證。對深度學習作業這影響特別大，PyTorch 與 numpy 的版本差異可能改變結果或直接報錯。

PyTorch 的 CUDA 版本不在 PyPI 預設來源，需要另外在 `pyproject.toml` 設定套件來源。uv 官方的 PyTorch 整合頁面用 `[[tool.uv.index]]` 宣告 PyTorch 的 index（`explicit = true`，只有指名的套件才從這個 index 取），再用 `[tool.uv.sources]` 把 `torch`、`torchvision` 指到該 index，並可用 `marker` 限定平台。CUDA 版本與網址請照該頁面當下的內容寫。`ai-cup-result` 那種 `+cu117` 的舊版組合，就是這個需要另外處理的點。

## 學習路線

1. 虛擬環境：知道為什麼每個專案要有自己的環境，用 `python -m venv` 建一個並看 `pip list` 與 `pip freeze` 的差別。
2. `pyproject.toml`：學會 `[project]` 的 `name`、`requires-python`、`dependencies` 與版本限定符（`>=`、`~=`、`==`）的意義。
3. `uv init`、`uv add`、`uv sync`：用 uv 建專案、加套件、還原環境。
4. lockfile：理解 `uv.lock` 與 `pyproject.toml` 的分工，把 `uv.lock` 進版控，並用 `uv sync --locked` 驗證。
5. 開發用套件：把 pytest、ruff 這類只在開發時用的套件放進獨立群組，與 [測試](../testing/)、[程式碼檢查與格式化工具](../lint-and-format/) 銜接。
6. PyTorch CUDA 來源：照 uv 官方文件設定 `[[tool.uv.index]]` 與 `[tool.uv.sources]`，讓 GPU 版本也能被鎖定。

## 動手練習

替 [lab5](../../repos/lab5/) 建立 `pyproject.toml` 與 `uv.lock`：

1. 在 Lab5 目錄執行 `uv init`，用 `uv add -r requirements.txt` 把現有清單匯入，並決定 `requires-python`。
2. 用 `uv lock` 產生 `uv.lock`，確認它出現各套件的確切版本，並把 `pyproject.toml` 與 `uv.lock` 都加入版控。
3. 把存放庫複製到另一個資料夾（乾淨環境），只執行 `uv sync --locked`，接著跑 `uv run python test_model_task1.py`，能跑通就算完成。`gymnasium[atari]` 等額外套件若裝不起來，把原因記下來，這就是下一輪要解決的問題。

做完後依序處理 [lab2](../../repos/lab2/)（把 `>=` 下限改成鎖定）與 [har-database-project](../../repos/har-database-project/)（補上從無到有的清單）。

## 參考資源

- [uv：Working on projects](https://docs.astral.sh/uv/guides/projects/)：`uv init`、`uv add`、`uv sync`、`uv.lock` 的官方說明，並建議把 lockfile 進版控。
- [uv：Locking and syncing](https://docs.astral.sh/uv/concepts/projects/sync/)：說明 `--locked` 與 `--frozen` 的差別。
- [uv：Using uv with PyTorch](https://docs.astral.sh/uv/guides/integration/pytorch/)：設定 PyTorch CUDA 套件來源的 `[[tool.uv.index]]` 與 `[tool.uv.sources]` 寫法。

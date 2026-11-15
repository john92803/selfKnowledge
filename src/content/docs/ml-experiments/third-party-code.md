---
title: 引用第三方程式碼的方式
description: 在自己的專案中使用並修改別人的程式碼時，保持來源可追溯、可更新。
status: todo
priority: medium
repos:
  - ai-cup-result
tags:
  - git
  - dependencies
  - open-source
updated: 2026-11-15
---

## 這是什麼

做研究與競賽專案時，常需要在別人的開源專案上修改。處理方式的差別在於：之後還能不能回答「這份程式碼來自上游的哪個版本、我改了哪些地方、上游有更新時能不能跟上」。把上游原始碼整份複製進自己的存放庫，是最快的做法，代價是這三個問題都變得難答。

這個條目講的是引用外部程式碼的幾種做法與取捨。與 Python 套件的版本管理有關的部分見[相依套件與環境管理](../../python-engineering/dependency-management/)。

## 我的現況

[AI_CUP_Result](../../repos/ai-cup-result/) 把 `fast_reid/`、`yolov7/`、`yolov9/`、`yolox/` 的原始碼整份放在存放庫裡，沒有 `.gitmodules`，也沒有任何檔案記錄這些目錄對應上游的哪個版本。自己的修改與上游混在一起，目前的 README 沒有列出哪些檔案被改過。

從檔案能確認與不能確認的部分：

- README 的 Acknowledgement 列出八個上游專案：BoT-SORT、AI_CUP（ricky-696 的 AICUP_Baseline_BoT-SORT）、ByteTrack、StrongSORT、FastReID、YOLOX、YOLOv7、YOLOv9。README 的安裝說明（環境名稱 `botsort`）看起來沿用 BoT-SORT，根目錄 `LICENSE`（MIT）的版權人是 BoT-SORT 的作者，不是這個存放庫的擁有者；根目錄的 `tracker/` 等是否為上游原樣，要比對才知道。
- 檔名帶 AICUP 的檔案，例如 `tools/datasets/AICUP_to_MOT15.py`、`yolov7/tools/AICUP_to_YOLOv7.py`、`yolov7/data/AICUP.yaml`、`fast_reid/datasets/generate_AICUP_patches.py`，名稱看起來是為這場競賽新增的，但可能來自 AI_CUP 基準專案，也可能是自己寫的，光看檔案無法斷定。`tools/mc_yolov9.py`、`tools/track_all_timestamps_v9.sh` 與 `copy_result.py` 同理，要與上游比對才知道。
- 授權檔：`fast_reid/LICENSE` 是 Apache License 2.0，`yolov7/LICENSE.md` 與 `yolov9/LICENSE.md` 是 GNU GPL v3，三者都有保留。`yolox/` 目錄內沒有 LICENSE 檔（YOLOX 的授權說明不在這份複製裡，授權內容要回上游確認）。這幾個授權的條件不同，混在同一個存放庫、又以 MIT 的根授權發布是否相容，這裡不做判斷，需要另外查授權條款。

## 與主流的落差

這一段沒有權威來源。找到的是部落格與討論串整理出的常見做法，不是定論。它們對應不同情境：

| 情況 | 常見做法 | 缺點 |
|---|---|---|
| 完全沒改上游 | 用套件管理器安裝（`pip install`、或 pip 直接指向 git 網址與 commit） | 上游沒有發布成套件時用不了；網址要固定到特定 commit，否則上游改了就變 |
| 需要固定在上游某個版本 | git submodule | clone 預設不會下載 submodule 內容；要多記幾個指令；容易忘記推送 submodule 的 commit |
| 有修改 | 先 fork，再用 submodule 或 git 網址引用自己的 fork | 要維護 fork，上游更新要自己合併；工具鏈（環境、CI）要處理多個存放庫 |
| 整份複製（現況） | 最簡單，clone 一次就齊全 | 來源與修改都無法追溯，上游更新很難合併 |

Pro Git 的 Submodules 章節是 submodule 的官方說明：submodule 讓一個 Git 存放庫成為另一個存放庫的子目錄，母專案只記錄子專案的某個 commit。書中說明 clone 含 submodule 的專案時，預設只建立空的子目錄，需用 `git clone --recurse-submodules`，或事後 `git submodule update --init --recursive`；也列出常見的陷阱，例如 `git pull` 不會自動更新 submodule、子專案可能落在 detached HEAD、母專案推送前要確認 submodule 的 commit 已推送。

授權方面，複製他人程式碼時要保留原本的授權檔與版權聲明，這是多數開源授權的共同要求。

## 學習路線

1. 理解整份複製的代價：來源、修改與上游更新三件事都無法追溯。
2. 學會 git submodule 的基本操作：新增、clone、更新、推送，以及 `.gitmodules` 的內容。
3. 了解 fork 流程：fork 上游、在分支修改、保留 upstream remote 以便合併更新。
4. 若修改很多，學會用 diff 與 patch 檔記錄對上游的改動，並放進 `patches/` 目錄。
5. 閱讀授權條款，知道 MIT、Apache 2.0、GPL 在散布與修改時各要求什麼，並保留授權檔。
6. 在 README 寫明每個上游的專案、版本（commit）與授權。

## 動手練習

把 AI_CUP_Result 中「自己實際改過的檔案」整理出來。

1. 把 README 列的上游專案各自 clone 到暫存資料夾，切到與當初最接近的版本。複製進 AI_CUP_Result 的版本不明，可以由發布日期與程式內容推測，並記錄你選了哪個版本。
2. 對每個目錄做 diff，例如：

```shell
git clone https://github.com/WongKinYiu/yolov9 /tmp/upstream/yolov9
diff -rq /tmp/upstream/yolov9 ./yolov9 | grep -v "Only in /tmp"
```

3. 依 diff 結果列出：只存在於 AI_CUP_Result 的檔案（可能是自己新增）、內容不同的檔案（可能是修改）、只在上游的檔案（可能被刪除）。`__pycache__` 與 `.pyc` 排除。
4. 把這份清單寫進 README，註明每個上游專案、使用的 commit 與授權。
5. 確認 `yolox/` 的授權：到上游取得 LICENSE，補回該目錄。
6. 之後新增修改時，改走 fork 加 submodule，讓差異可由 git 紀錄直接看出。

## 參考資源

- [Pro Git：Submodules](https://git-scm.com/book/en/v2/Git-Tools-Submodules)：Git 官方書籍的 submodule 章節，說明新增、clone、更新與常見問題。
- 相關條目：[相依套件與環境管理](../../python-engineering/dependency-management/)、[版控該排除的檔案與大型檔案](../../python-engineering/gitignore-and-large-files/)、[README 撰寫](../../dev-workflow/readme-writing/)。

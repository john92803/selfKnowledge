---
title: AI_CUP_Result
description: AI CUP 競賽的跨相機多目標車輛追蹤，以 BoT-SORT 為基礎，搭配 YOLOv9 偵測與 FastReID 重識別。
kind: repo
---

- 存放庫：https://github.com/john92803/AI_CUP_Result
- 分析日期：2026-11-15
- 分析時的 commit：eb78822

## 技術棧

- **語言與框架**：Python 3.7、PyTorch 1.13.1（CUDA 11.7）
- **偵測**：YOLOv9（另含 YOLOv7 與 YOLOX 的程式）
- **追蹤**：BoT-SORT（卡爾曼濾波、相機運動補償、外觀特徵比對）
- **重識別**：FastReID（`bagtricks_R50-ibn` 設定）
- **評估**：py-motmetrics
- **環境**：Conda、Ubuntu 22.04

## 觀察

做得好的地方：

- 把偵測、重識別、追蹤三個模組串成完整流程，並把偵測器從基準版本換成 YOLOv9。
- README 依序寫出環境安裝、資料準備、訓練、追蹤、評估的指令，可以照著重現。
- 「Acknowledgement」列出了所有引用的上游專案。

可以改進的地方：

- **上游專案的程式碼整份複製進來**。`fast_reid/`、`yolov7/`、`yolov9/`、`yolox/` 是把其他專案的原始碼直接放進存放庫。整個存放庫九百多個檔案中絕大多數來自上游，自己修改的部分與上游程式碼混在一起，無法分辨也難以跟上游更新。
- **Python 與 PyTorch 版本已經過時**。README 指定 Python 3.7 與 PyTorch 1.13.1，Python 3.7 官方已停止支援。
- **相依套件大多沒有鎖定版本**。`requirements.txt` 中多數套件沒有版本號，安裝步驟分散在 README 的八個步驟裡。
- **路徑寫死在程式裡**。`copy_result.py` 的來源與目的資料夾直接寫在程式碼中，README 也要求手動修改設定檔裡的絕對路徑。
- **編譯產物進了版控**。存放庫中有 47 個 `.pyc` 檔。
- **沒有記錄自己的貢獻與成績**。README 幾乎都是安裝與執行步驟，沒有說明相對於基準版本改了什麼、最後的競賽分數是多少。

## 引出的知識條目

- [相依套件與環境管理](../../python-engineering/dependency-management/)：安裝分散在 README 的八個步驟，套件大多沒有鎖定版本
- [版控該排除的檔案與大型檔案](../../python-engineering/gitignore-and-large-files/)：47 個 `.pyc` 進了版控
- [設定與機密管理](../../python-engineering/config-and-secrets/)：`copy_result.py` 把來源與目的資料夾寫死
- [引用第三方程式碼的方式](../../ml-experiments/third-party-code/)：上游專案的原始碼整份複製進存放庫
- [README 撰寫](../../dev-workflow/readme-writing/)：README 沒有說明自己的修改與競賽成績

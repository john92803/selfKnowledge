---
title: 實驗追蹤
description: 有系統地記錄每次訓練的設定、指標與產出，方便比較不同實驗。
status: todo
priority: medium
repos:
  - lab2
  - lab6
  - lab5
tags:
  - machine-learning
  - wandb
  - mlflow
updated: 2026-11-15
---

## 這是什麼

實驗追蹤是把每次訓練的超參數、指標曲線、程式版本、環境與產出（模型檔、圖表）記錄下來，之後可以搜尋、比較與重現。沒有它，常見情況是：改了十次參數之後，只剩終端機捲動的輸出與幾個名稱含糊的 checkpoint，說不清哪次設定產生哪個結果。

工具大致分三種定位：Weights & Biases 是以託管服務為主的追蹤平台；MLflow 是開源、可自行架設的追蹤伺服器，並含模型註冊（Model Registry）；TensorBoard 偏向基本的訓練曲線視覺化。這裡只描述定位差異，不比較優劣。

## 我的現況

- [lab5](../../repos/lab5/)：`dqn_task3.py` 已使用 Weights & Biases。`main` 內 `wandb.init(project="DLP-Lab5-DQN-Pong", name=args.wandb_run_name, save_code=True)`，訓練中用 `wandb.log` 記錄 Episode、Env Step Count、Update Count、Epsilon、Loss、Q Mean、Q Std、Best Reward、Total Reward、Episode Length、Eval Reward。這是課程規定（README：訓練曲線以 environment step 為 x 軸，並用 W&B 追蹤）。目前 `wandb.init` 沒有傳 `config`，所以批次大小、學習率、n-step 等超參數沒有隨 run 一起存進 W&B，只有 run 名稱能分辨。
- [lab2](../../repos/lab2/)：`src/train.py` 只用 `print` 把每個 epoch 的 train/val loss 與 Dice 輸出到終端機，最佳模型存成 `saved_models/*.pth`。UNet 與 ResNet34-UNet 的比較結果寫在 `summary.txt` 與 README，沒有可回溯的曲線。
- [lab6](../../repos/lab6/)：`train.py` 同樣只 `print` 平均 loss 並存 checkpoint，程式內沒有使用任何追蹤工具。
- [HAR_databaseProject](../../repos/har-database-project/) 把訓練曲線畫成圖片（`training_history.png`）存起來，這是手動追蹤的做法，每次重跑會覆蓋舊檔。

## 與主流的落差

用工具記錄實驗已是常見做法，三種工具各有定位（以下依官方文件頁面）：

- Weights & Biases：`wandb.init(config=...)` 以字典記錄超參數，`wandb.log` 記錄指標；Artifacts 用來為資料集與模型做版本管理。官方文件的網址目前由 docs.wandb.ai 轉向 docs.coreweave.com。「託管服務」這個定位來自比較文章，本條目未在官方頁面逐項核對，採用前請自己看其方案與資料保存條件。
- MLflow Tracking：記錄參數、程式版本、指標與輸出檔，以 run 與 experiment 組織，預設記到本機 `mlruns` 目錄；可另外架設 Tracking Server，Model Registry 需要資料庫作為後端儲存。
- TensorBoard：`torch.utils.tensorboard` 把指標寫進目錄，在 TensorBoard 介面看標量、圖像、直方圖等。

lab5 的差距在於「已經會記指標，但沒記設定」；lab2 與 lab6 則是完全沒有結構化記錄。兩個專案都做了架構或參數比較，沒有記錄就很難補做可信的比較。

## 學習路線

1. 決定要記什麼：超參數、指標、程式版本（commit）、環境版本、隨機 seed（見[實驗可重現性](../reproducibility/)）。
2. 熟悉已會的 `wandb.log`，補上 `wandb.init(config=...)`，並了解 `wandb.config` 的用法。
3. 用 Artifacts 為資料集與模型 checkpoint 做版本管理。
4. 在 W&B 介面比較多組 run：同圖疊合、依 config 篩選與分組。
5. 試用 MLflow：`mlflow.log_param`、`mlflow.log_metric`，並在本機啟動 Tracking Server，理解自架方案要自己維護什麼。
6. 與設定管理搭配：把整份設定物件一次存進追蹤工具（見[實驗設定管理](../experiment-config/)）。

## 動手練習

把 lab2 接上 Weights & Biases，在同一張圖比較 UNet 與 ResNet34-UNet。

1. 在 `src/train.py` 的 `main` 內、模型建好之後呼叫 `wandb.init(project=..., name=args.model, config=vars(args))`，讓兩種架構各是一個 run，超參數記在 config。
2. 在每個 epoch 結尾加：

```python
wandb.log({"train_loss": train_loss, "val_dice": val_dice, "lr": current_lr}, step=epoch)
```

3. 兩個架構用相同的 `--epochs`、`--batch_size`、`--img_size` 各跑一次，在 W&B 專案頁把兩個 run 的 `train_loss` 與 `val_dice` 疊在同一張圖。
4. 確認方式：圖上能分辨兩條曲線，點進 run 能看到完整 config；之後可再把 `saved_models/*.pth` 以 Artifact 上傳。
5. 順手在 lab5 的 `wandb.init` 補 `config=vars(args)`。

## 參考資源

- [W&B：Configure experiments](https://docs.coreweave.com/guides/track/config)：以 `wandb.init(config=...)` 記錄超參數（舊網址 docs.wandb.ai 會轉到此處）。
- [W&B：Artifacts overview](https://docs.coreweave.com/guides/artifacts)：為資料集與模型做版本管理。
- [MLflow Tracking](https://mlflow.org/docs/latest/ml/tracking/)：記錄參數、指標與輸出，並說明 Tracking Server 與 Model Registry。
- [PyTorch：torch.utils.tensorboard](https://docs.pytorch.org/docs/stable/tensorboard.html)：把 PyTorch 指標寫進 TensorBoard。

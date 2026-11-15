---
title: Lab6
description: 以 diffusers 實作條件式擴散模型，在 iCLEVR 資料集上依物件標籤生成影像。
kind: repo
---

- 存放庫：https://github.com/john92803/Lab6
- 分析日期：2026-11-15
- 分析時的 commit：5de4d5d

## 技術棧

- **語言與框架**：Python、PyTorch、Hugging Face diffusers
- **模型**：`UNet2DModel`（含注意力區塊），把類別嵌入層換成線性層以接受 24 維的多標籤條件
- **訓練**：`DDPMScheduler`、Adam、EMA（decay 0.9999）、以機率丟棄條件的方式做 classifier-free guidance
- **取樣**：`DDPMScheduler` 與 `DDIMScheduler` 兩種
- **評估**：課程提供的 ResNet18 分類器計算生成影像的準確率
- **指令列**：`argparse`

## 觀察

做得好的地方：

- 直接使用 diffusers 的模型與排程器，沒有重新造輪子，並了解如何替換其中的嵌入層以支援多標籤條件。
- 訓練加入 EMA 與 classifier-free guidance 兩項擴散模型常用的技巧。
- 取樣同時支援 DDPM 與 DDIM，並可傳入 seed 讓結果可重現。
- 程式依職責分檔：資料、模型、訓練、取樣、評估各一個檔案。

可以改進的地方：

- **README 的內容是另一份作業的**。`README.MD` 寫的是 DQN 強化學習，也就是 Lab5 的作業，與存放庫中的擴散模型程式無關，檔案結構一節列出的檔案也不存在。
- **沒有相依套件清單**。存放庫沒有 `requirements.txt`，無法得知 `torch` 與 `diffusers` 的版本。
- **沒有實驗追蹤**。訓練只依 `--log_every` 輸出到終端機。
- **沒有混合精度訓練**。訓練程式沒有使用 `torch.autocast`。
- **訓練沒有固定隨機種子**。只有取樣支援 seed。
- **沒有 `.gitignore`**，也沒有測試。

## 引出的知識條目

- [相依套件與環境管理](../../python-engineering/dependency-management/)：沒有相依套件清單
- [實驗可重現性](../../ml-experiments/reproducibility/)：訓練沒有固定隨機種子
- [實驗追蹤](../../ml-experiments/experiment-tracking/)：訓練過程只輸出到終端機
- [混合精度訓練](../../ml-experiments/mixed-precision/)：訓練沒有使用混合精度
- [README 撰寫](../../dev-workflow/readme-writing/)：README 的內容是另一份作業的

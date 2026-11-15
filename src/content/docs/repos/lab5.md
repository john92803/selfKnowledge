---
title: Lab5
description: 以 PyTorch 與 Gymnasium 實作 DQN，從 CartPole 推進到 Atari Pong，並整合三項改良技術。
kind: repo
---

- 存放庫：https://github.com/john92803/Lab5
- 分析日期：2026-11-15
- 分析時的 commit：3ef7215

## 技術棧

- **語言與框架**：Python、PyTorch
- **環境**：Gymnasium 1.1.1（classic-control 與 atari）、ale-py
- **演算法**：DQN、Double DQN、Prioritized Experience Replay、Multi-Step Return（n = 3）、Dueling 架構
- **前處理**：OpenCV 灰階化與縮放、frame stacking
- **實驗追蹤**：Weights & Biases
- **指令列**：`argparse`

## 觀察

做得好的地方：

- 使用 Weights & Biases 追蹤訓練，x 軸為 environment step。
- 做了 ablation study，分別驗證三項改良技術的效果。
- 發現乘法衰減的 epsilon 在 500k step 仍偏高，改成兩階段線性排程，並在 README 說明原因。
- 超參數都透過 `argparse` 提供，評估固定使用 seed 0–19。
- README 記錄了實作重點、結果與執行方式。

可以改進的地方：

- **各任務的程式大量重複**。`dqn_task1.py`、`dqn_task2.py`、`dqn_task3.py` 各自包含完整的網路、replay buffer 與 agent，與 `dqn.py` 的內容多數相同；三個 `test_model_task*.py` 也是如此。課程規定既有模組結構不可更動，這是部分原因。
- **Prioritized Replay 以線性方式取樣**。`dqn_task3.py` 的 `PrioritizedReplayBuffer` 用 `np.random.choice` 依機率陣列取樣，每次取樣都要掃過整個 buffer，沒有使用 sum tree。
- **相依套件沒有鎖定版本**。`requirements.txt` 中 `torch`、`numpy`、`opencv-python`、`wandb` 都沒有指定版本。
- **README 與存放庫內容不一致**。README 列出 `train_task1.sh` 等三個腳本，存放庫中沒有這些檔案。
- **訓練沒有固定隨機種子**。`dqn_task3.py` 只在評估時使用 seed，訓練流程沒有設定。
- **沒有 `.gitignore`**，也沒有測試。

## 引出的知識條目

- [相依套件與環境管理](../../python-engineering/dependency-management/)：`requirements.txt` 大多沒有版本號
- [實驗可重現性](../../ml-experiments/reproducibility/)：訓練流程沒有固定隨機種子
- [實驗追蹤](../../ml-experiments/experiment-tracking/)：已使用 Weights & Biases，可作為其他作品的範例
- [實驗設定管理](../../ml-experiments/experiment-config/)：三個任務各自複製一份完整的訓練程式

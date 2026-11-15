---
title: 實驗可重現性
description: 固定隨機來源，讓同一份程式與設定跑出相同結果。
status: todo
priority: high
repos:
  - lab2
  - lab5
  - lab6
tags:
  - pytorch
  - reproducibility
updated: 2026-11-15
---

## 這是什麼

可重現性指同一份程式、同一組設定與同一份資料，重跑能得到相同（或在可解釋範圍內相同）的結果。訓練過程有許多隨機來源：權重初始化、資料打亂、資料增強、dropout、強化學習的探索與環境本身。沒有固定這些來源，兩次訓練的差距就分不出是改動造成的，還是運氣。

可重現性也有上限：固定 seed 只是其中一環，還要記錄使用的版本與硬體，並知道有些運算本身就不具確定性。

## 我的現況

- [lab2](../../repos/lab2/)：`src/` 沒有任何 `seed` 設定。隨機來源至少有 `oxford_pet.py` 的資料增強（用 Python `random` 做翻轉、旋轉等）、`get_dataloaders` 內訓練集的 `shuffle=True`，以及模型的權重初始化。`train.py` 的參數只有學習率、epoch 等，沒有 `--seed`。
- [lab5](../../repos/lab5/)：`dqn_task3.py` 訓練流程沒有 seed；訓練中用到 Python `random`（epsilon-greedy）、`np.random.choice`（優先權取樣）、PyTorch 的初始化，以及 `self.env.reset()`（沒有傳 seed）。seed 只出現在 `test_model*.py` 的評估：

```python
# Lab5/test_model_task3.py
random.seed(args.seed)
np.random.seed(args.seed)
torch.manual_seed(args.seed)
env.action_space.seed(args.seed)
env.observation_space.seed(args.seed)
...
obs, _ = env.reset(seed=args.seed + ep)
```

  這是課程要求的評估方式（README：seed 0 到 19 共 20 個 episode 取平均），評估端寫得完整，訓練端沒有。
- [lab6](../../repos/lab6/)：`train.py` 沒有設定 seed，訓練中的雜訊（`torch.randn_like`）、時間步（`torch.randint`）、classifier-free guidance 的條件丟棄（`torch.rand`）與 DataLoader 打亂都沒固定。seed 只在取樣端：`sample.py` 的 `seed` 參數（`None` 表示不固定）會建立帶 seed 的 `torch.Generator`，`evaluate.py` 與 `denoising_grid.py` 各有 `--seed`。

## 與主流的落差

PyTorch 官方的 Reproducibility 文件列出需要處理的地方：

- `torch.manual_seed(0)`，同時作用於 CPU 與 CUDA。
- Python 的 `random.seed(0)` 與 NumPy 的 `np.random.seed(0)`。
- `torch.use_deterministic_algorithms(True)`：沒有確定性實作的運算會丟出錯誤，且官方說確定性運算通常較慢，單次執行的效能可能下降。文件另提到 `torch.backends.cudnn.benchmark = False` 與 `torch.backends.cudnn.deterministic = True`。
- DataLoader：傳入 `worker_init_fn` 與帶 seed 的 `torch.Generator`，讓各 worker 的隨機來源固定。

官方也明說：不保證在不同 PyTorch 版本、不同 commit、不同平台之間得到完全相同的結果，CPU 與 GPU 之間即使 seed 相同也可能不同。所以目標是「同一環境下可重現」，並且把 seed 與環境版本記下來。

強化學習還要處理環境。Gymnasium 官方文件說明，`reset(seed=...)` 以整數 seed 重設環境的亂數產生器，並建議通常只在初始化後呼叫一次；`seed=None` 不會重設已有的產生器。動作空間的取樣另用 `env.action_space.seed(123)` 固定。lab5 的評估端已經照這種寫法，訓練端缺的是同樣的設定。

## 學習路線

1. 列出一份訓練程式裡所有的隨機來源：初始化、打亂、增強、dropout、環境。
2. 學會統一設定 seed 的函式：Python、NumPy、PyTorch。
3. DataLoader 的 `worker_init_fn` 與 `generator`，理解多 worker 時為什麼要另外處理。
4. `torch.use_deterministic_algorithms` 的代價：哪些運算會報錯、速度會變慢，以及何時值得開。
5. Gymnasium 環境的 seed：`reset(seed=...)` 與 `action_space.seed`。
6. 記錄 seed、PyTorch 與 CUDA 版本、硬體，並理解「跨版本、跨平台不保證相同」，必要時用多個 seed 報告平均與變異（做法見[實驗追蹤](../experiment-tracking/)）。

## 動手練習

在 lab2 加上統一的 seed 設定，並驗證同一 seed 跑兩次的 Dice 一致。

1. 在 `src/utils.py` 加函式：

```python
import os, random
import numpy as np
import torch

def set_seed(seed: int, deterministic: bool = False):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if deterministic:
        torch.use_deterministic_algorithms(True)
        torch.backends.cudnn.benchmark = False

def seed_worker(worker_id):
    worker_seed = torch.initial_seed() % 2**32
    np.random.seed(worker_seed)
    random.seed(worker_seed)
```

2. `train.py` 加 `parser.add_argument("--seed", type=int, default=0)`，在 `main` 開頭呼叫 `set_seed(args.seed)`；`get_dataloaders` 需要接受並傳入 `worker_init_fn=seed_worker` 與 `generator=torch.Generator().manual_seed(seed)`。
3. 同一 seed、同一設定跑兩次（可先用很少的 epoch），比對每個 epoch 的 val Dice。再換一個 seed 跑，確認結果會不同。
4. 若兩次仍不同，開 `deterministic=True`，看有哪些運算報錯，記下哪些因素無法固定。
5. 把 seed 寫進 README 的執行指令。lab5 與 lab6 可用同樣方式補上訓練端的 seed。

## 參考資源

- [PyTorch Reproducibility](https://docs.pytorch.org/docs/stable/notes/randomness.html)：官方說明隨機來源、確定性演算法、DataLoader 的做法與保證範圍。
- [Gymnasium Env API](https://gymnasium.farama.org/api/env/)：`reset(seed=...)`、`action_space.seed` 與 `np_random` 的說明。
- 相關條目：[實驗追蹤](../experiment-tracking/)、[資料切分與資料洩漏](../data-leakage-and-splitting/)。

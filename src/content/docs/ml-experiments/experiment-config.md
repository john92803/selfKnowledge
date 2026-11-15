---
title: 實驗設定管理
description: 用設定檔切換實驗，而不是複製整份訓練程式。
status: todo
priority: medium
repos:
  - lab5
tags:
  - machine-learning
  - configuration
  - hydra
updated: 2026-11-15
---

## 這是什麼

實驗設定管理是把「每次實驗不一樣的地方」（環境名稱、網路種類、超參數、各項技巧的開關）從程式碼抽出來，放進設定檔或設定物件。程式只有一份，換實驗時換設定。

不這樣做的常見結果是複製整份訓練程式、各改幾行，之後修一個 bug 要改好幾處，也很難回答「兩個實驗到底差在哪裡」。集中設定後，這個答案就是兩份設定檔的差異，也可以整份存進[實驗追蹤](../experiment-tracking/)工具。

## 我的現況

[lab5](../../repos/lab5/) 的結構如下：

- `dqn.py`（397 行）、`dqn_task1.py`（324 行）、`dqn_task2.py`（305 行）、`dqn_task3.py`（428 行）各自包含完整的 `DQN` 網路、`PrioritizedReplayBuffer`、`AtariPreprocessor` 與 `DQNAgent`，大量內容重複。`test_model.py` 與三個 `test_model_task*.py` 也各自重新定義 `DQN` 與評估流程。
- 三個任務之間實際的差異不大：Task 1 是 CartPole 與全連接網路（`nn.Linear(4, 128)` 的 MLP）、Task 2 是 Pong 與 CNN、Task 3 是 Pong 加上 Dueling 網路（value 與 advantage 兩條分支）、Double DQN、PER 與 n-step（`--n-steps` 預設 3）。
- 超參數以 `argparse` 的預設值散在各檔，同一個參數在不同檔案預設值不同，例如 `--lr` 在 `dqn_task1.py` 是 `1e-3`，在 `dqn_task2.py` 是 `0.0001`；`--replay-start-size` 在 task1 是 1000，task2 與 task3 是 50000；epsilon 在 task1、task2 是乘法衰減（`--epsilon-decay`），task3 改成兩階段線性（`--epsilon-decay-steps-1/2`）。
- 這種重複有一部分是課程造成的：README 寫明「既有模組結構（`DQN`、`PrioritizedReplayBuffer`、`AtariPreprocessor`、`DQNAgent`）不可更動」，每個任務要能獨立交件與評估，所以不能直接把它們抽成共用模組。因此這不單純是寫法疏失，是在規定下的結果。
- 這些設定也沒被存起來：`wandb.init` 沒有傳 `config`，所以事後只能靠 run 名稱與程式碼對照差異。

## 與主流的落差

設定管理的做法有兩類。

**框架：Hydra。** 官方網站（hydra.cc）把它描述為設定複雜應用程式的框架，以 MIT 授權開源、建在 OmegaConf 上，主要功能是每次執行時動態組合設定，並可從指令列覆寫任何值。官方也有 config groups 的概念（把可替換的設定片段分組後選用），但本次沒有開啟到說明該功能的頁面，要用時請讀官方教學。

維護狀況：網站版本選單把 1.3 標為 Legacy、1.4 標為 Release candidate；GitHub 存放庫頁面顯示最新為 1.4.0rc3，並有公告說專案從 `facebookresearch` 組織移到 `hydra-ecosystem`，歷史與 issue 都保留，使用者不需動作，且沒有封存標示。最近一次發布的日期沒有查到，所以「是否仍積極維護」未能確認。

**輕量做法：不需要框架。** 用 `dataclass` 定義所有可調的欄位與預設值，每個實驗一份 YAML，單一進入點讀 YAML 再用指令列覆寫少數欄位，最後整個物件傳給程式。這個做法不是由哪個標準規定的，只是常見的最小解；缺點是組合、多組掃描等功能要自己寫。

```python
from dataclasses import dataclass

@dataclass
class Config:
    env_name: str = "ALE/Pong-v5"
    network: str = "dueling_cnn"     # mlp | cnn | dueling_cnn
    double_dqn: bool = False
    per: bool = False
    n_steps: int = 1
    lr: float = 1e-4
    replay_start_size: int = 50000
```

## 學習路線

1. 把散在 `argparse` 的超參數集中成一個 `dataclass`，每個欄位有型別與預設值。
2. 用 YAML 存每個任務的值，進入點用 `yaml.safe_load` 讀入並轉成 dataclass。
3. 允許指令列覆寫少數欄位，並在每次訓練開始時把完整設定印出、存檔。
4. 把「會變的」與「不變的」分開：環境與網路結構、技巧開關、數值超參數、路徑與紀錄名稱。
5. 試用 Hydra 的設定檔組合與指令列覆寫，比較它和自己寫的差別。
6. 把設定物件一併傳給追蹤工具，讓每個 run 都帶著完整設定。

## 動手練習

在 lab5 另開一個分支（課程規定不能改既有結構，所以不要動主線的 `dqn_task*.py`），合併成單一訓練程式加三份設定檔。

1. 新增 `train.py`，只保留一份 `DQN`、`PrioritizedReplayBuffer`、`AtariPreprocessor`、`DQNAgent`，由設定決定行為。
2. 該進設定檔的差異：環境名稱（`CartPole-v1` 或 `ALE/Pong-v5`）、網路種類（MLP、CNN、Dueling CNN）、是否啟用 Double DQN、PER、n-step 與 n 的大小，以及 epsilon 排程、`lr`、`replay_start_size` 等數值。
3. 新增 `configs/task1.yaml`、`task2.yaml`、`task3.yaml`，各寫出原本三個檔案的值，用 `python train.py --config configs/task3.yaml` 執行。
4. 驗證：用同一組 seed（見[實驗可重現性](../reproducibility/)）各跑少量步數，比對新程式與原 `dqn_task*.py` 的前幾個 episode 輸出與 W&B 曲線是否一致。
5. `test_model_task*.py` 也改成讀同一份設定，不再各自複製網路定義。

## 參考資源

- [Hydra 官方網站](https://hydra.cc/)：Hydra 的簡介、功能與版本選單。
- [Hydra 的 GitHub 存放庫](https://github.com/facebookresearch/hydra)：README 上有搬遷到 hydra-ecosystem 組織的公告，以及版本資訊。
- 相關條目：[實驗追蹤](../experiment-tracking/)、[設定與機密管理](../../python-engineering/config-and-secrets/)。

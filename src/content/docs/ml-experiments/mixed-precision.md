---
title: 混合精度訓練
description: 讓部分運算使用半精度浮點數，以加快訓練並減少記憶體用量。
status: todo
priority: medium
repos:
  - lab2
  - lab6
tags:
  - pytorch
  - performance
  - amp
updated: 2026-11-15
---

## 這是什麼

混合精度訓練（automatic mixed precision, AMP）讓模型中適合的運算改用 16 位元浮點數（float16 或 bfloat16），其餘仍用 float32。目標是降低記憶體用量並提高在支援硬體上的吞吐量。PyTorch 用 `torch.autocast` 自動決定每個運算使用哪種精度。

float16 的數值範圍小，梯度可能下溢成 0，所以 float16 訓練要搭配 `GradScaler`：先把 loss 放大再反向傳播，更新前再縮回。是否需要縮放與使用哪種型別，取決於裝置與 dtype。

## 我的現況

- [lab2](../../repos/lab2/)：README 與 `summary.txt` 都說明 UNet 訓練較慢，原因是 reflect padding 使每次 forward 的輸入從 256×256 放大到 444×444；ResNet34-UNet 則較快。`src/train.py` 全程使用預設的 float32，沒有 `autocast`。裝置以 `torch.accelerator.current_accelerator()` 選擇，不是寫死 `cuda`。訓練迴圈中 forward 與 loss 的位置：

```python
# lab2/src/train.py
images = F.pad(images, (border_pad,)*4, mode='reflect')
outputs = model(images)
...
loss = bce(outputs, masks) + dice_loss(outputs, masks)
loss.backward()
optimizer.step()
```

- [lab6](../../repos/lab6/)：`train.py` 同樣沒有 `autocast`，裝置寫成 `"cuda" if torch.cuda.is_available() else "cpu"`，沒有走 accelerator 介面。

## 與主流的落差

依 PyTorch 官方 AMP 文件，現行寫法是 `torch.autocast(device_type=...)` 搭配 `torch.amp.GradScaler`。`torch.cuda.amp.autocast`、`torch.cuda.amp.GradScaler` 等舊寫法已被官方標為棄用（官方指引改用 `torch.amp.GradScaler("cuda", ...)`），呼叫時會出現 `FutureWarning`，網路上許多舊教學仍是舊寫法。

官方範例的典型迴圈如下，重點在三步：`scaler.scale(loss).backward()`、`scaler.step(optimizer)`、`scaler.update()`；backward 不放在 autocast 區塊內。

```python
scaler = GradScaler()
for input, target in data:
    optimizer.zero_grad()
    with autocast(device_type='cuda', dtype=torch.float16):
        output = model(input)
        loss = loss_fn(output, target)
    scaler.scale(loss).backward()
    scaler.step(optimizer)
    scaler.update()
```

支援的裝置：官方文件列出的 autocast 裝置型別包含 `cuda`、`cpu`、`xpu` 等，預設 dtype 在 CUDA 是 float16、在 CPU 是 bfloat16，XPU 標示為實驗性。每種裝置上哪些運算被支援、能否加速，以及 GradScaler 對 bfloat16 是否需要，文件沒有一概而論，要查該版本的官方文件並實測。Apple 的 MPS 是否支援，本條目沒有查證，使用前先查文件。

## 學習路線

1. 理解 float32、float16、bfloat16 的數值範圍與精度差異。
2. 用 `torch.autocast` 包住 forward 與 loss，認識哪些運算會被自動轉型。
3. 為什麼 float16 需要 `GradScaler`，以及三步驟的順序。
4. 與梯度裁剪搭配：要先呼叫 `scaler.unscale_(optimizer)`，再做 `clip_grad_norm_`。
5. 確認自己的裝置支援哪種 dtype，查官方文件而不是憑經驗。
6. 實測：用每個 epoch 的時間與最終指標比較，不要只看理論。

## 動手練習

在 lab2 的 `train.py` 加入 autocast 與 GradScaler，比較每個 epoch 的時間與最終 Dice，不預設會快多少。

1. `device = torch.accelerator.current_accelerator()` 已有，沿用它；`device.type` 作為 `autocast` 的 `device_type`。
2. 建立 scaler，把訓練迴圈改成：

```python
scaler = torch.amp.GradScaler(device.type, enabled=(device.type == "cuda"))

for images, masks in train_tqdm:
    images, masks = images.to(device), masks.to(device)
    optimizer.zero_grad()
    with torch.autocast(device_type=device.type):
        if border_pad > 0:
            images = F.pad(images, (border_pad,)*4, mode='reflect')
        outputs = model(images)
        # ...crop...
    outputs = outputs.float()          # loss 在 float32 計算
    loss = bce(outputs, masks) + dice_loss(outputs, masks)
    scaler.scale(loss).backward()
    scaler.step(optimizer)
    scaler.update()
```

3. 自訂的 `dice_loss` 與 `focal_loss` 內有 epsilon 與 `log`，轉成 float32 再算是保守做法；改成其他寫法前先實測 loss 是否出現 `nan`。
4. 加 `--amp` 參數開關，同一個 seed（見[實驗可重現性](../reproducibility/)）、同樣 epoch 數，分別跑 float32 與 AMP，記下每個 epoch 的時間與最終 val Dice。
5. UNet 與 ResNet34-UNet 都跑，看 UNet 因 444×444 輸入而慢的情況有沒有改變。
6. `validation` 迴圈也要決定是否用 autocast，兩邊保持一致。

## 參考資源

- [PyTorch：Automatic Mixed Precision package](https://docs.pytorch.org/docs/stable/amp.html)：autocast 支援的裝置、預設 dtype，以及舊寫法的棄用說明。
- [PyTorch：Automatic Mixed Precision examples](https://docs.pytorch.org/docs/stable/notes/amp_examples.html)：典型訓練迴圈、梯度裁剪與 `unscale_` 的用法。
- 相關條目：[實驗追蹤](../experiment-tracking/)（記錄每次 epoch 時間與 Dice）。

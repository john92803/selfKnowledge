---
title: lab2
description: 在 Oxford-IIIT Pet 資料集上自行實作 UNet 與 ResNet34-UNet，進行二元語意分割。
kind: repo
---

- 存放庫：https://github.com/john92803/lab2
- 分析日期：2026-11-15
- 分析時的 commit：d6bd6dd

## 技術棧

- **語言與框架**：Python、PyTorch（`requirements.txt` 要求 `torch>=2.0.0`、`torchvision>=0.15.0`）
- **模型**：自行實作的 UNet 與 ResNet34-UNet（decoder 加入 CBAM 注意力），從零訓練
- **訓練**：BCE 加 Dice 與 Focal 加 Dice 兩種損失、AdamW 與 SGD、`ReduceLROnPlateau`、early stopping
- **資料**：自訂 `Dataset`，影像與遮罩同步做空間增強
- **裝置選擇**：`torch.accelerator.current_accelerator()`
- **指令列**：`argparse`

## 觀察

做得好的地方：

- 程式依職責分檔：`models/`、`oxford_pet.py`（資料）、`utils.py`（指標）、`train.py`、`evaluate.py`、`inference.py`。
- 發現並解決了實際問題：零填補在邊界產生人工痕跡，使驗證與測試的 Dice 相差 0.10；改用 reflect padding 的 Overlap-tile 策略並在三個階段一致套用後，落差降到接近零。
- 兩種架構都自行實作並做了比較，README 說明了訓練速度差異的原因。
- 附有 `requirements.txt`，並設定了版本下限。

可以改進的地方：

- **編譯產物與系統檔進了版控**。`src/__pycache__/`、`src/models/__pycache__/` 內的 `.pyc` 檔與 `src/.DS_Store` 都被提交，存放庫沒有 `.gitignore`。
- **沒有固定隨機種子**。`src/` 內找不到設定 seed 的程式，而作業要求結果可重現。
- **沒有實驗追蹤**。訓練過程只輸出到終端機，沒有使用 TensorBoard 或 Weights & Biases 記錄曲線。
- **沒有混合精度訓練**。UNet 因 reflect padding 使輸入放大到 444×444 而訓練較慢，程式中沒有使用 `torch.autocast`。
- **相依套件只有下限**。`requirements.txt` 使用 `>=`，沒有鎖定實際安裝的版本。
- **沒有測試**。模型輸出尺寸、Dice 計算這類容易出錯的地方沒有單元測試。

## 引出的知識條目

- [相依套件與環境管理](../../python-engineering/dependency-management/)：`requirements.txt` 只有版本下限
- [版控該排除的檔案與大型檔案](../../python-engineering/gitignore-and-large-files/)：`.pyc` 與 `.DS_Store` 進了版控
- [測試](../../python-engineering/testing/)：Dice 計算與模型輸出尺寸沒有測試
- [程式碼檢查與格式化工具](../../python-engineering/lint-and-format/)：沒有程式碼檢查與格式化設定
- [實驗可重現性](../../ml-experiments/reproducibility/)：訓練沒有固定隨機種子
- [實驗追蹤](../../ml-experiments/experiment-tracking/)：訓練過程只輸出到終端機
- [混合精度訓練](../../ml-experiments/mixed-precision/)：UNet 訓練偏慢，沒有使用混合精度
- [持續整合](../../dev-workflow/continuous-integration/)：沒有自動檢查

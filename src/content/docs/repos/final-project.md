---
title: final_project
description: 影像處理期末專案，用攝影機辨識手勢，和電腦玩剪刀石頭布。
kind: repo
---

- 存放庫：https://github.com/john92803/final_project
- 分析日期：2026-11-15
- 分析時的 commit：448eaad

## 技術棧

- **語言**：Python
- **模型**：TensorFlow Keras，載入預先訓練好的 `keras_model.h5`，輸入為 224×224 影像
- **影像**：OpenCV 讀取攝影機畫面、裁切、顯示文字
- **資料**：`train/` 下三個類別各 840 張 JPG

## 觀察

做得好的地方：

- 完成了從攝影機擷取、前處理、推論到遊戲判定的完整互動流程。
- 只在信心值超過 0.8 時才採用辨識結果，避免不確定的手勢被誤判。

可以改進的地方：

- **訓練資料與模型權重直接進版控**。2,520 張訓練影像與 `keras_model.h5` 都提交到 git，佔了存放庫幾乎全部的容量。
- **模型路徑只適用於 Windows**。`test.py` 以 `'image final\keras_model.h5'` 載入模型，路徑用反斜線，而且指向的資料夾名稱與存放庫結構不符。
- **沒有訓練程式**。存放庫只有推論用的 `test.py`，看不出模型是怎麼訓練出來的。
- **前處理與推論的程式重複**。`clip()` 函式與主迴圈各有一份相同的縮放、裁切、正規化、推論程式碼。
- **使用全域變數傳遞狀態**。`text()` 以 `global img`、`global img1` 存取畫面。
- **勝負判定有錯**。`judge_game` 中玩家出布時，對上布顯示 win、對上石頭顯示 deuce，兩者應該分別是平手與獲勝。九種組合以巢狀條件逐一列舉，這類錯誤不容易看出來。
- **可能使用未指定的變數**。三個信心值都沒超過 0.8 時，`player` 不會被指定：第一局會直接出錯，之後則會沿用上一局的手勢。
- **沒有相依套件清單與 `.gitignore`**，README 只有兩行。

## 引出的知識條目

- [相依套件與環境管理](../../python-engineering/dependency-management/)：沒有相依套件清單
- [版控該排除的檔案與大型檔案](../../python-engineering/gitignore-and-large-files/)：訓練影像與模型權重直接進版控
- [測試](../../python-engineering/testing/)：`judge_game` 的勝負判定有錯，而且無法單獨測試
- [程式碼檢查與格式化工具](../../python-engineering/lint-and-format/)：使用全域變數，且有可能未指定就使用的變數
- [README 撰寫](../../dev-workflow/readme-writing/)：README 只有兩行

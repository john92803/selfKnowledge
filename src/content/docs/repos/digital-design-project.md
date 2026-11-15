---
title: Digital_Design_Project
description: 數位電路實習專題，在 FPGA 上以 VHDL 與原理圖實作雙人快艇骰子遊戲。
kind: repo
---

- 存放庫：https://github.com/john92803/Digital_Design_Project
- 分析日期：2026-11-15
- 分析時的 commit：e93c645

## 技術棧

- **硬體描述語言**：VHDL
- **設計方式**：VHDL 模組搭配 Quartus 的原理圖檔（`.bdf`），頂層為原理圖
- **工具**：Quartus II
- **目標硬體**：Cyclone V（5CEFA2F23C8），LP-2900 實驗板
- **周邊**：七段顯示器分時多工、指撥開關、按鍵（含消除彈跳）、LED

## 觀察

做得好的地方：

- 功能拆成獨立模組：骰子計數、重擲控制、計分、顯示多工、七段解碼各一個檔案。
- 處理了實體硬體的問題：按鍵消除彈跳、由主時脈分頻出多種頻率、七段顯示器分時多工。
- README 完整說明遊戲規則、硬體配置與每個模組的用途。

可以改進的地方：

- **沒有 testbench**。存放庫中沒有任何模擬用的測試檔，設計只能燒到板子上驗證。
- **使用非標準的運算套件**。`score.vhd` 引用 `STD_LOGIC_ARITH` 與 `STD_LOGIC_UNSIGNED`，這兩個不是 IEEE 標準套件，標準做法是使用 `numeric_std`。
- **組合邏輯的敏感度列表不完整**。`score.vhd` 的 process 只列了 `x1, x2, x3`，但內部還讀取了 `flag`，模擬結果可能與合成後的電路不一致。
- **輸出沒有在所有情況下指定**。`score.vhd` 中 `player1`、`player2`、`outFlag`、`endFlag` 只在部分分支被指定，合成時會產生鎖存器。
- **頂層與部分模組是原理圖檔**。`.bdf` 是二進位格式的圖形檔，無法用 git 比較差異，也綁定在 Quartus 上。
- **命名沒有反映用途**。例如 `project_test.vhd` 是骰子計數器、`test.bdf` 是頂層設計，名稱中的 test 都不是指測試。

## 引出的知識條目

- [VHDL 模擬與 testbench](../../digital-design/vhdl-testbench/)：沒有 testbench，`score.vhd` 使用非標準套件且會合成出鎖存器

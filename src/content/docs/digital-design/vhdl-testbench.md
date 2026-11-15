---
title: VHDL 模擬與 testbench
description: 在燒錄到硬體前，先用模擬驗證設計的行為。
status: todo
priority: low
repos:
  - digital-design-project
tags:
  - vhdl
  - fpga
  - verification
updated: 2026-11-15
---

## 這是什麼

testbench 是一個沒有 port 的 VHDL entity，它例化（instantiate）要測的設計，產生輸入激勵，並用 `assert` 檢查輸出是否符合預期。在模擬器裡執行 testbench，可以在燒錄到 FPGA 前找出邏輯錯誤，也能把測試保留下來，改程式後重跑。

只靠燒錄後觀察七段顯示器，錯誤很難定位；模擬可以看到每個訊號隨時間的變化，也能窮舉所有輸入組合。

## 我的現況

[Digital_Design_Project](../../repos/digital-design-project/) 沒有任何 testbench。頂層 `test.bdf` 與部分模組（`clk_gen.bdf`、`debounce_g.bdf` 等）是 Quartus 的原理圖檔，其餘是 `.vhd`。以 `score.vhd` 為例，目前的行為是：

- 輸入 `x1`、`x2`、`x3`（各 3 位元）與 `flag`。`flag = '1'` 時計算 `player1` 並把 `outFlag` 設為 `'1'`；`flag = '0'` 時計算 `player2` 並把 `endFlag` 設為 `'1'`。
- 三顆點數相同時輸出 `"10100"`（十進位 20），不論是哪個點數；否則輸出三者總和。
- 引用 `STD_LOGIC_ARITH` 與 `STD_LOGIC_UNSIGNED`，用 `CONV_INTEGER`、`CONV_STD_LOGIC_VECTOR` 轉換。

有三個問題：

```vhdl
-- score.vhd
process (x1, x2, x3)        -- 內部讀了 flag，但敏感度列表沒有
  ...
  if flag = '1' then
    ... player1 <= ...      -- flag = '0' 時沒有指定
```

1. 敏感度列表只有 `x1, x2, x3`，但 process 內讀取 `flag`。
2. `player1`、`player2`、`outFlag`、`endFlag` 只在部分分支被指定，其他情況保持舊值。
3. `outFlag` 與 `endFlag` 只會被設成 `'1'`，沒有任何路徑把它們設回 `'0'`。

## 與主流的落差

**運算套件。** `numeric_std` 是 IEEE 標準的運算套件；`std_logic_arith` 與 `std_logic_unsigned` 是廠商提供的非標準套件，兩者不應混用（來源：nandland 的說明）。`numeric_std` 要求明確使用 `unsigned` 或 `signed` 型別，工具能幫忙檢查有號與無號的誤用。

**敏感度列表與鎖存器。** 這兩點的依據來自教學網站與工具廠商文件，不是 IEEE 標準原文：

- 組合邏輯的 process 應對所有讀到的訊號敏感。合成工具通常忽略敏感度列表，只看 process 的內容；模擬器卻依列表決定何時執行。列表不完整時，模擬看到的行為與合成出的硬體不同（Sigasi 手冊直接警告這會造成合成與模擬不一致）。VHDL-2008 可寫 `process (all)`，但各合成工具的支援程度要查自己用的版本。
- 在組合邏輯中，輸出沒有在每個分支都被指定，會推論出鎖存器（latch），因為訊號必須記住舊值（All About Circuits 的說明）。修法是在 process 開頭先給輸出預設值，或每個分支都指定。

**驗證工具。** 開源工具（以下的維護狀態是查 GitHub 發布與提交紀錄的結果，2026-11-15）：

- GHDL：開源 VHDL 模擬器，最新發布版本為 v6.0.0（2026 年 3 月），存放庫近期仍有提交。
- cocotb：用 Python 寫 testbench，搭配 GHDL 等模擬器；最新發布為 v2.1.0（2026 年 8 月），近期仍有提交。
- VUnit：VHDL／SystemVerilog 的單元測試框架，最新的正式發布是 v4.7.0（2023 年 4 月），但存放庫近期仍有提交。

Quartus 方面，Intel 提供的是 Questa Intel FPGA Edition 模擬使用指南。這個專案用的 Quartus II 版本較舊，搭配的模擬器世代可能不同，以安裝版本的文件為準。

## 學習路線

1. 學會 testbench 的基本結構：沒有 port 的 entity、例化被測設計、用 signal 接線。
2. 學會產生激勵：process 內以 `wait for` 改變輸入，以及時脈產生。
3. 學會 `assert ... report ... severity`，讓錯誤自動顯示而不是看波形。
4. 用迴圈窮舉輸入組合，並對照一個簡單的參考計算。
5. 在 Quartus 或 GHDL 跑模擬、看波形，理解模擬與合成的差異（敏感度列表、鎖存器）。
6. 了解 cocotb 或 VUnit 能改善什麼，再決定要不要引入。

## 動手練習

**一、為 `score.vhd` 寫 testbench。** 三顆骰子各取 1 到 6，共 216 種組合，全部測過；對 `flag = '1'` 與 `'0'` 各測。預期：三顆相同時輸出 `"10100"`，其餘輸出總和。骨架：

```vhdl
library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity score_tb is end;

architecture sim of score_tb is
  signal x1, x2, x3 : std_logic_vector(2 downto 0);
  signal flag, outFlag, endFlag : std_logic;
  signal player1, player2 : std_logic_vector(4 downto 0);
begin
  dut : entity work.score
    port map (x1 => x1, x2 => x2, x3 => x3, flag => flag,
              player1 => player1, player2 => player2,
              outFlag => outFlag, endFlag => endFlag);

  stim : process
    variable expected : integer;
  begin
    flag <= '1';
    for a in 1 to 6 loop for b in 1 to 6 loop for c in 1 to 6 loop
      x1 <= std_logic_vector(to_unsigned(a, 3));
      x2 <= std_logic_vector(to_unsigned(b, 3));
      x3 <= std_logic_vector(to_unsigned(c, 3));
      wait for 10 ns;
      if a = b and b = c then expected := 20; else expected := a + b + c; end if;
      assert to_integer(unsigned(player1)) = expected
        report "player1 錯誤: " & integer'image(a) & integer'image(b) & integer'image(c)
        severity error;
    end loop; end loop; end loop;
    -- 再把 flag 設為 '0'，重複一次檢查 player2
    wait;
  end process;
end;
```

**二、修改 `score.vhd`。** 改用 `numeric_std`（`unsigned`、`to_integer`、`to_unsigned`），敏感度列表補上 `flag`，並在 process 開頭給所有輸出預設值。

改的時候要先處理一個行為差異：原本的鎖存行為讓 `player1` 在 `flag = '0'` 時仍保持舊值，頂層 `test.bdf` 可能依賴這個「記住分數」的效果。加預設值後，`flag` 切換時另一位玩家的分數會被清掉。先在 `test.bdf` 確認 `player1`、`player2`、`outFlag`、`endFlag` 的接線與用途；如果需要記住分數，改成以時脈控制的暫存器，這是刻意的設計，而不是靠鎖存器。

確認做對：第一題的 testbench 在改寫前能通過（行為與現況相同），改寫後仍通過；故意把 `"10100"` 改成別的值，`assert` 要報錯。

## 參考資源

- [VHDL Math: std_logic_arith vs numeric_std（nandland）](https://nandland.com/vhdl-math-std_logic_arith-vs-numeric_std/)：兩個套件的差異與為何不要混用。
- [Incomplete If Statements and Latch Inference（All About Circuits）](https://www.allaboutcircuits.com/technical-articles/vhdl-incomplete-if-statements-and-latch-inference/)：不完整的 if 如何推論出鎖存器，以及預設值的修法。
- [Sensitivity list（Sigasi 手冊）](https://www.sigasi.com/manual/creating-editing-exploring-code/linting/vhdl/sensitivity-list/)：敏感度列表不完整造成合成與模擬不一致，以及 `process (all)`。
- [GHDL](https://github.com/ghdl/ghdl)：開源 VHDL 模擬器。
- [cocotb](https://github.com/cocotb/cocotb)：以 Python 撰寫晶片驗證的 testbench。
- [VUnit](https://github.com/VUnit/vunit)：VHDL／SystemVerilog 的單元測試框架。
- [Questa Intel FPGA Edition Simulation User Guide](https://docs.altera.com/r/docs/730191/23.2/questa-intel-fpga-edition-simulation-user-guide)：Intel 官方的模擬使用指南。

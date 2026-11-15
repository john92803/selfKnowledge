---
title: 測試
description: 用 pytest 為容易出錯的邏輯寫自動化測試。
status: todo
priority: medium
repos:
  - final-project
  - lab2
tags:
  - python
  - pytest
  - testing
updated: 2026-11-15
---

## 這是什麼

自動化測試是把「這段程式在這個輸入下應該給這個輸出」寫成可重複執行的程式。它解決的問題是：改了程式之後，不用靠手動跑一遍、用眼睛看結果，就能知道舊功能有沒有壞掉，也能抓到從一開始就寫錯的邏輯。pytest 是 Python 最常用的測試框架，用普通函式加 `assert` 就能寫測試。

## 我的現況

這些 Python 存放庫都沒有測試檔。

- [final-project](../../repos/final-project/) 的 `test.py` 雖然叫 test，其實是猜拳遊戲的主程式（開攝影機、載入 `keras_model.h5` 辨識手勢），不是測試。其中 `judge_game(p1, p2)` 的判斷有兩個結果是錯的，而且因為函式直接呼叫 `text()` 顯示結果，沒辦法在不開攝影機與模型的情況下檢查：

```python
# test.py（節錄）
elif p1 == 'paper':
    if p2 == 'paper':
        text("win")      # 平手卻顯示 win
    ...
    elif p2 == 'rock':
        text("deuce")    # 布贏石頭卻顯示 deuce
```

  其餘 7 種組合（石頭、剪刀的各種對局，以及布對剪刀）是正確的。
- [lab2](../../repos/lab2/) 的 `src/utils.py` 有 `dice_score`、`dice_loss`、`focal_loss`。`dice_score` 先對輸入做 `sigmoid`，所以 `pred` 是 logits；完全重合與完全不重合的行為沒有測試保護，模型輸出的尺寸也沒有測試。

## 與主流的落差

pytest 官方文件的基本做法：

- 命名慣例：預設只會收集 `test_*.py` 或 `*_test.py` 檔案裡、以 `test` 開頭的函式（以及以 `Test` 開頭、沒有 `__init__` 的類別）。final_project 的 `test.py` 不符合 `test_*.py`，所以 pytest 預設不會收集它，這也印證了它是主程式。
- 斷言：直接用 Python 的 `assert`，失敗時 pytest 會顯示兩邊的值。
- 參數化：`@pytest.mark.parametrize("a, b, total", [...])` 讓同一個測試函式用多組資料各跑一次，失敗時會標出是哪一組。
- fixture：用 `@pytest.fixture` 準備測試需要的物件，測試函式把 fixture 名稱寫成參數就會拿到它的回傳值。

主流做法的重點是「把邏輯寫成純函式」：輸入進去、結果出來，不碰攝影機、畫面、檔案。`judge_game` 與 `dice_score` 是最容易開始的對象。這份條目沒有查到「什麼程度的覆蓋率才夠」的權威標準，所以不訂數字目標。

## 學習路線

1. 第一個測試：建立 `tests/test_xxx.py`，寫一個函式與一個 `assert`，用 `pytest` 執行並看懂輸出。
2. 讓程式可測試：把運算邏輯從 I/O（顯示、讀檔、攝影機）抽成純函式。
3. 參數化：用 `parametrize` 一次涵蓋所有輸入組合與邊界值。
4. fixture：把重複的準備工作（建立張量、模型）抽成 fixture。
5. 測浮點數：用 `pytest.approx` 或容許誤差比較。
6. 接到持續整合：每次 push 自動跑 `pytest`，見 [持續整合](../../dev-workflow/continuous-integration/)。

## 動手練習

1. 在 [final-project](../../repos/final-project/) 把 `judge_game` 改成回傳字串的純函式（`'win'`、`'lose'`、`'deuce'`），由呼叫端再傳給 `text()`。
2. 新增 `tests/test_judge.py`，用 `parametrize` 寫 9 組測試涵蓋 3×3 所有組合：

```python
@pytest.mark.parametrize("p1, p2, expected", [
    ("paper", "paper", "deuce"),
    ("paper", "rock", "win"),
    # ... 其餘 7 組
])
def test_judge_game(p1, p2, expected):
    assert judge_game(p1, p2) == expected
```

   修正前，上面這兩組會失敗，這就是測試抓到的錯；修正後 9 組全過。注意 `test.py` 一 import 就會開攝影機，要把純函式放到可獨立 import 的模組。
3. 在 [lab2](../../repos/lab2/) 為 `dice_score` 寫測試：`pred` 全為很大的正 logits、`target` 全為 1 時應為 1（或非常接近）；`pred` 全為很大的負 logits、`target` 全為 1 時應接近 0。用 `pytest.approx` 比較。再對 UNet 輸入一個假的批次，斷言輸出的空間尺寸等於輸入。
4. 依 [相依套件與環境管理](../dependency-management/) 把 pytest 放進開發相依，確認 `pytest` 在乾淨環境能執行。

## 參考資源

- [pytest：Good Integration Practices](https://docs.pytest.org/en/stable/explanation/goodpractices.html)：測試檔與函式的命名慣例與探索規則。
- [pytest：How to parametrize fixtures and test functions](https://docs.pytest.org/en/stable/how-to/parametrize.html)：`pytest.mark.parametrize` 的用法。
- [pytest：How to use fixtures](https://docs.pytest.org/en/stable/how-to/fixtures.html)：fixture 的定義與如何在測試中使用。

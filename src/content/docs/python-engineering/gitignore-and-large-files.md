---
title: 版控該排除的檔案與大型檔案
description: 分辨哪些檔案不該進 git，以及訓練資料與模型權重該放哪裡。
status: todo
priority: high
repos:
  - lab2
  - ai-cup-result
  - final-project
  - har-database-project
  - todolist
tags:
  - git
  - gitignore
  - large-files
updated: 2026-11-15
---

## 這是什麼

git 追蹤的是原始碼的歷史。可以由原始碼重新產生的檔案（`.pyc`、編譯輸出）、各人電腦或編輯器專屬的檔案（`.DS_Store`、`.idea/`）、以及很大的二進位檔（訓練資料、模型權重），都不適合放進去：前兩類只會製造無意義的差異，後一類會讓每次 clone 都得下載所有歷史版本。`.gitignore` 負責宣告哪些檔案不要被追蹤；大型檔案則要放到別處，再用腳本或指令取得。

## 我的現況

以 `ls -a` 與 `git ls-files` 逐一確認的結果：lab2、AI_CUP_Result、final_project、HAR_databaseProject、Lab5、Lab6 與 AQI_plotly 的根目錄都沒有 `.gitignore`（AI_CUP_Result 只有第三方子目錄如 `fast_reid/` 自帶的 `.gitignore`）。

- [lab2](../../repos/lab2/) 追蹤了 5 個 `.pyc`，例如 `src/__pycache__/utils.cpython-310.pyc`、`src/models/__pycache__/unet.cpython-310.pyc`，以及 `src/.DS_Store`。
- [ai-cup-result](../../repos/ai-cup-result/) 追蹤了 47 個 `.pyc`。
- [final-project](../../repos/final-project/) 追蹤了 `train/` 下 2,520 張訓練圖片（資料夾約 20 MB），以及模型權重 `keras_model.h5`（約 2.3 MB）。
- [har-database-project](../../repos/har-database-project/) 追蹤了三個訓練用 CSV：`body_acc_x_train.csv`、`body_acc_y_train.csv`、`body_acc_z_train.csv`，各約 10 到 11 MB。
- [todolist](../../repos/todolist/) 是 Android 專案，有 `.gitignore`，但 `.idea/` 底下仍有 8 個檔案被追蹤（`compiler.xml`、`gradle.xml`、`misc.xml` 等）。

目前這些檔案都沒有超過 GitHub 的單檔限制，所以沒出問題；風險是之後換一組更大的資料或權重時才發現，那時歷史裡已經有了。

## 與主流的落差

主流做法是把「程式」與「資料、權重」分開存放：

- 模型權重放 Hugging Face Hub 或 GitHub Release，程式用下載指令取得。Hugging Face 的說明指出，Hub 上的模型與資料集檔案動輒 GB 以上，直接放進純 git 倉庫不切實際，所以 Hub 以指標檔加遠端儲存的方式管理這些檔案。
- 資料集用下載腳本，或用 DVC 這類資料版本工具追蹤。
- 少量、不常變動的大檔可以用 Git LFS，倉庫內只存指標檔。

GitHub 的單檔限制：官方說明指出，新增或更新超過 50 MiB 的檔案時 git 會警告，超過 100 MiB 的檔案會被封鎖；超過限制時 GitHub 建議使用 Git LFS，LFS 的單檔上限依方案而異（見參考資源）。

`.gitignore` 對已經被追蹤的檔案沒有作用，要先用 `git rm --cached` 把它們從索引移除（檔案本身留在磁碟上），再把規則加進 `.gitignore`。已經進入歷史的檔案，即使之後移除，仍然在舊的 commit 裡；要真正清掉必須改寫歷史，這會改變所有後續 commit 的雜湊，已經被別人 clone 的倉庫都要重新處理。所以越早排除越便宜。

## 學習路線

1. `.gitignore` 語法：`*` 與 `**`、結尾 `/` 只比對資料夾、`!` 反向規則、規則的作用範圍是該檔案所在目錄。
2. 該排除什麼：Python 的 `__pycache__/`、`*.pyc`、虛擬環境、編輯器與作業系統檔案（`.idea/`、`.DS_Store`）。
3. `git rm --cached`：把已追蹤的檔案移出版控但保留在磁碟上，並確認 `git status` 的結果。
4. 大型檔案的放法：權重放 Hugging Face Hub 或 GitHub Release，資料集用下載腳本或 DVC，小量大檔用 Git LFS，並了解各自的取捨。
5. 清理歷史的代價：知道改寫歷史會影響所有 clone，什麼情況值得做、什麼情況只要之後不再加入就好。
6. 在 README 寫明資料與權重怎麼取得（見 [README 撰寫](../../dev-workflow/readme-writing/)）。

## 動手練習

1. 替 [lab2](../../repos/lab2/) 在根目錄新增 `.gitignore`，至少包含 `__pycache__/`、`*.pyc`、`.DS_Store`。
2. 執行 `git rm -r --cached src/__pycache__ src/models/__pycache__` 與 `git rm --cached src/.DS_Store`，用 `git status` 確認這些檔案顯示為刪除、而磁碟上的檔案還在，再 commit。之後重新執行程式，`git status` 不該再出現新的 `.pyc`。
3. 把 [final-project](../../repos/final-project/) 的 `keras_model.h5` 上傳到 GitHub Release 或 Hugging Face Hub，從版控移除並加進 `.gitignore`，在 `README.md` 補上下載方式。`test.py` 的載入路徑（目前是寫死的 `'image final\keras_model.h5'`）可以順便改成可設定，做法見 [設定與機密管理](../config-and-secrets/)。
4. 對 [har-database-project](../../repos/har-database-project/) 重複同樣的流程處理三個 CSV：移出版控，README 註明資料來源。

## 參考資源

- [About large files on GitHub](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github)：GitHub 對單檔 50 MiB 警告、100 MiB 封鎖的官方說明。
- [About Git Large File Storage](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage)：LFS 的運作方式與依方案而異的單檔上限。
- [Hugging Face Hub：Xet storage backend](https://huggingface.co/docs/hub/xet)：說明為何大型模型與資料檔不適合直接放進 git，以及 Hub 怎麼存放。
- [gitignore 文件](https://git-scm.com/docs/gitignore)：規則語法，並說明已追蹤的檔案不受影響。
- [git rm 文件](https://git-scm.com/docs/git-rm)：`--cached` 只移出索引、保留工作目錄檔案。

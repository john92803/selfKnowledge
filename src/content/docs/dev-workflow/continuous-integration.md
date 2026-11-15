---
title: 持續整合
description: 每次推送程式碼時自動執行檢查與測試。
status: todo
priority: medium
repos:
  - lab2
  - todolist
  - ptway-profile
tags:
  - ci
  - github-actions
  - automation
updated: 2026-11-15
---

## 這是什麼

持續整合（CI）是每次推送程式碼或開 pull request 時，由伺服器自動跑一組檢查：安裝相依套件、檢查程式碼風格、執行測試，失敗就標示出來。目的是讓「在我的電腦上能跑」變成「在乾淨環境也能跑」，並且不靠記憶力去執行檢查。

GitHub Actions 是 GitHub 內建的 CI 服務，設定寫在存放庫的 `.github/workflows/*.yml`。基本概念有三層：workflow 是一個 YAML 檔，由事件（如 `push`）觸發；一個 workflow 有一或多個 job，各自在一台乾淨的 runner 上執行；job 由依序執行的 step 組成，step 可以是一行指令，也可以是別人寫好的 action。

## 我的現況

已分析的 11 個存放庫，沒有任何一個自己的 `.github/workflows/`。AI_CUP_Result 底下有 `fast_reid/.github/` 與 `tools/py_motmetrics/.github/`（後者也有 `workflows`），這兩個是上游專案帶進來的，不是他設定的。

- [lab2](../../repos/lab2/) 有 `requirements.txt` 與 `src/`，沒有測試檔，也沒有 lockfile 或 lint 設定。
- [TodoList](../../repos/todolist/) 是 Gradle 專案，`app/src/test/` 與 `app/src/androidTest/` 各有一個範本產生的 `Example*Test.kt`。
- [ptway_profile](../../repos/ptway-profile/) 是單一 `index.html`，目前沒有建置步驟，部署方式存放庫內看不出來。

沒有 CI 的後果是檢查全靠手動：換電腦或別人 clone 下來時，沒有任何東西證明專案還能安裝、還能通過測試。

## 與主流的落差

Python 專案在 GitHub Actions 的常見流程（來源是 pydevtools 的 uv 教學）：用 `astral-sh/setup-uv` 安裝 uv，`uv sync --locked` 依 lockfile 安裝相依，再執行 `ruff check`、`ruff format --check` 與 `pytest`。

這條流程預設專案已經有 lockfile、lint 設定與測試。lab2 這三樣都還沒有，所以先完成這三個條目，CI 才有東西可跑：

- [相依套件與環境管理](../../python-engineering/dependency-management/)：產生 lockfile，`--locked` 才有意義。
- [測試](../../python-engineering/testing/)：有 `pytest` 可以跑。
- [程式碼檢查與格式化工具](../../python-engineering/lint-and-format/)：有 ruff 設定可以檢查。

各教學使用的 action 版本不一，版本以該 action 的發布頁為準。

## 學習路線

1. 理解 workflow、job、step 與 runner 的關係，讀官方的 Understanding GitHub Actions。
2. 手寫一個最小的 workflow：`on: push`、checkout、印出 `ls`，在 Actions 分頁看日誌。
3. 加上語言環境與相依安裝（Python 用 `setup-uv`，Java 用 `setup-java`，前端用 `setup-node`）。
4. 加上 lint 與測試步驟，故意弄壞一個測試，確認 CI 會失敗。
5. 學會快取（`enable-cache`）與 matrix（多個 Python 版本）。
6. 學會需要權限與部署的 workflow（`permissions`、GitHub Pages）。

## 動手練習

**lab2：加上 `.github/workflows/ci.yml`。** 以下假設已完成上述三個前置條目，並且有 `pyproject.toml` 與 `uv.lock`：

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      # 版本以各 action 發布頁為準；以下是 2026-11-15 查到的最新主版本
      - uses: actions/checkout@v7
      - uses: astral-sh/setup-uv@v10.3.3   # 此 action 使用完整版本標籤，請到發布頁確認
        with:
          python-version: "3.12"           # 改成你實際使用的版本
          enable-cache: true
      - run: uv sync --locked
      - run: uv run ruff check .
      - run: uv run ruff format --check .
      - run: uv run pytest
```

lab2 的相依包含 `torch` 與 `torchvision`，安裝很大，會拖慢每次 CI。可把 ruff 檢查獨立成一個不安裝相依的 job，測試另開一個 job，並讓測試只依賴小的假資料。確認做對的方式：推一個故意違反 ruff 規則的 commit，Actions 分頁要顯示失敗，改回去後變綠。

**TodoList（Gradle 測試）。** 同樣的骨架，改為 `actions/checkout`、`actions/setup-java`（JDK 版本依 `libs.versions.toml` 中的 Android Gradle Plugin 要求，請查它的發布說明）、再執行 `./gradlew test`。注意現有的 `androidTest` 需要模擬器或實機，不要放進一般的 CI job。

**ptway_profile（建置後部署到 GitHub Pages）。** 完成 [前端模組化與建置工具](../../web-frontend/modules-and-build-tools/) 的 Vite 階段後，Vite 官方的靜態部署文件有一份完整的 GitHub Pages workflow：checkout、setup-node、`npm ci`、`npm run build`，再用 Pages 相關 action 上傳 `dist/` 並部署。照該頁複製，其中的 action 版本以頁面上寫的為準。

## 參考資源

- [Understanding GitHub Actions](https://docs.github.com/en/actions/get-started/understand-github-actions)：workflow、job、step、runner 的概念。
- [Quickstart for GitHub Actions](https://docs.github.com/en/actions/get-started/quickstart)：第一個 workflow 與在 Actions 分頁看日誌。
- [Workflow syntax for GitHub Actions](https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions)：每個 YAML 欄位的說明。
- [Setting up GitHub Actions with uv（pydevtools）](https://pydevtools.com/handbook/tutorial/setting-up-github-actions-with-uv/)：Python 專案用 uv、ruff、pytest 的完整 workflow。
- [Deploying a Static Site（Vite 官方）](https://vite.dev/guide/static-deploy)：GitHub Pages 部署 workflow。

---
title: TodoList
description: 以 Kotlin 撰寫的 Android 待辦事項 App，可依日期新增、檢視、編輯與刪除事項。
kind: repo
---

- 存放庫：https://github.com/john92803/TodoList
- 分析日期：2026-11-15
- 分析時的 commit：b2f7e56

## 技術棧

- **語言與建置**：Kotlin 1.9.0、Android Gradle Plugin 8.3.0、Gradle Kotlin DSL、version catalog（`gradle/libs.versions.toml`）
- **SDK**：compileSdk 34、targetSdk 34、minSdk 24，Java 相容性設為 1.8
- **畫面**：Fragment 搭配 XML layout 與 ViewBinding，RecyclerView 列表，Navigation 2.5.1 加 Safe Args
- **狀態**：ViewModel 加 LiveData，DAO 回傳的 `Flow` 以 `asLiveData()` 轉換
- **資料**：Room 2.5.0，以 KSP 產生程式碼
- **其他**：`coreLibraryDesugaring` 支援 `java.time`

## 觀察

做得好的地方：

- 資料層分成 entity、DAO、database 三個檔案，寫入用 `suspend` 函式、查詢回傳 `Flow`，資料變動時畫面會自動更新。
- 兩個分頁以 `activityViewModels` 共用同一個 ViewModel，新增或刪除後首頁計數不需手動刷新。
- 已使用 version catalog 與 Kotlin DSL 管理建置設定。

可以改進的地方：

- **畫面仍是 XML 加 Fragment**。`app/build.gradle.kts` 已宣告 Compose 相關相依套件（Compose BOM 2022.10.00、Material 3），但程式中沒有任何 `@Composable`，這些套件沒有被用到。
- **相依套件版本重複宣告**。Lifecycle 與 Navigation 在 `app/build.gradle.kts` 寫死為 2.5.1，同時又透過 version catalog 引入 2.8.0 與 2.7.7，兩種寫法並存。
- **沒有測試**。`app/src/test` 與 `app/src/androidTest` 只有專案範本附的範例測試。
- **資料庫沒有遷移策略**。`NoteRoomDatabase.kt` 使用 `fallbackToDestructiveMigration()` 且 `exportSchema = false`，改動資料表結構時使用者的資料會被清空。
- **日期以字串儲存**。`Note.kt` 的 `date` 欄位是 `String`，`DashboardFragment.kt` 的 `datePick` 以四個分支手動補零組出日期字串。
- **相依物件手動組裝**。ViewModel 透過自訂的 `InventoryViewModelFactory` 建立，每個 Fragment 都要重複寫一次取得 DAO 的程式碼。
- **IDE 設定進了版控**。`.idea/` 目錄被提交。
- **沒有 CI**。存放庫沒有 `.github/workflows/`。

## 引出的知識條目

- [版控該排除的檔案與大型檔案](../../python-engineering/gitignore-and-large-files/)：`.idea/` 進了版控
- [Jetpack Compose](../../android/jetpack-compose/)：畫面仍是 XML 加 Fragment
- [StateFlow 與畫面狀態](../../android/stateflow-ui-state/)：把 `Flow` 轉回 LiveData，篩選狀態沒有集中管理
- [相依注入](../../android/dependency-injection-hilt/)：四個 Fragment 重複手動組裝 ViewModel
- [Room 資料庫遷移](../../android/room-migration/)：改動資料表結構會清空資料
- [持續整合](../../dev-workflow/continuous-integration/)：沒有自動檢查

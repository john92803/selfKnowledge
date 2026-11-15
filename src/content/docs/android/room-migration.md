---
title: Room 資料庫遷移
description: 改動資料表結構時保留使用者既有的資料。
status: todo
priority: medium
repos:
  - todolist
tags:
  - android
  - room
  - database
updated: 2026-11-15
---

## 這是什麼

App 更新後，使用者手機裡舊版建立的資料庫還在，資料表結構（schema）若有改動，Room 需要知道如何把舊結構升級成新結構，這就是遷移（migration）。有了遷移，使用者原有的資料不會因為你新增一個欄位而消失。Room 提供自動遷移（依兩個版本的 schema 檔產生）與手寫的 `Migration` 兩種方式，也提供測試工具。

## 我的現況

[TodoList](../../repos/todolist/) 的資料庫沒有遷移策略：

- `ui/data/NoteRoomDatabase.kt`：`@Database(entities = [Note::class], version = 1, exportSchema = false)`，建立時呼叫 `.fallbackToDestructiveMigration()`。
- `ui/data/Note.kt`：資料表名稱 `item`，欄位 `id`（自動產生的主鍵）、`date`（`String`）、`note`（`String`）。
- `app/build.gradle.kts`：Room 2.5.0，以 KSP 處理（`ksp ("androidx.room:room-compiler:2.5.0")`）。

現在只要改動 `Note` 的欄位並把 `version` 加一，使用者手機上的所有事項會被清空；`exportSchema = false` 則表示專案沒有留下任何版本的 schema 檔。

## 與主流的落差

官方遷移指南說明：Room 支援自動與手動兩種遷移，目的是在 App 更新改動 schema 時保留既有資料。依 `@AutoMigration` 的官方 API 文件，自動遷移是 Room 依兩個版本的 schema 檔產生的 `Migration`；宣告任何自動遷移，`exportSchema` 都必須設為 true；沒有模稜兩可的變更（刪除或重新命名資料表、欄位）時，不需要 `AutoMigrationSpec`。`fallbackToDestructiveMigration` 的作用是找不到遷移路徑時清空資料庫重建，官方文件明確警告這會永久刪除使用者資料。

TodoList 現在的設定等於承諾「每次改結構就清空使用者資料」，對一個存放待辦事項的 App 來說，這是第一次發布後就會痛的設定。另外，官方遷移指南目前的範例以 Room 3（`androidx.room3`）的套件名稱撰寫，專案用的是 Room 2.5.0（`androidx.room`），照抄範例前要確認名稱，下面的設定以 `room.schemaLocation` 這個 KSP 參數為準，該文件列為不使用 Room Gradle plugin 時的做法。

## 學習路線

1. 理解 schema 版本：`@Database(version = ...)`，資料庫檔案裡記錄著版本號。
2. 匯出 schema：`exportSchema = true` 加上 schema 輸出目錄，JSON 檔要放進版本控制。
3. 自動遷移：`autoMigrations = [AutoMigration(from = 1, to = 2)]`。
4. 需要 `AutoMigrationSpec` 的情況：重新命名或刪除資料表、欄位時，用 `@RenameColumn` 等註解說明。
5. 手寫 `Migration(1, 2)`：用 SQL 處理拆表等 Room 推不出來的變更，以 `addMigrations(...)` 加入。
6. 遷移測試：`MigrationTestHelper` 先以舊版 schema 建庫並插入資料，再執行遷移並驗證。
7. 什麼時候才可以用 `fallbackToDestructiveMigration`：只在資料可以丟棄時使用。

## 動手練習

目標：在 `Note` 新增「是否完成」欄位，且既有資料保留。順序很重要，先在版本 1 狀態匯出 schema，才能產生自動遷移：

1. 把 `exportSchema` 改成 `true`，並在 `app/build.gradle.kts` 設定輸出位置（依官方文件以 `CommandLineArgumentProvider` 傳給 KSP）：

```kotlin
ksp { arg(RoomSchemaArgProvider(File(projectDir, "schemas"))) }
```

   `RoomSchemaArgProvider` 的完整類別定義複製自官方遷移指南。先編譯一次，確認 `app/schemas/.../1.json` 出現，並提交進版控。
2. 修改 `Note.kt` 新增欄位：

```kotlin
@ColumnInfo(name = "done", defaultValue = "0")
val done: Boolean = false
```

3. 修改 `NoteRoomDatabase.kt`：`version = 2`，`autoMigrations = [AutoMigration(from = 1, to = 2)]`，並刪除 `.fallbackToDestructiveMigration()`。新增欄位沒有改名或刪除，不需要 `AutoMigrationSpec`。
4. 新增非空欄位時要提供預設值。官方 `@ColumnInfo` 文件說明 `defaultValue` 的寫法，並提醒它不會在單純 `@Insert` 時被使用（那時用的是 Kotlin 屬性的預設值）；既有資料列需要一個值可填，這也是 SQLite 加欄位的要求。官方文件中沒有找到一句明確寫「自動遷移新增非空欄位必須有預設值」的話，若建置時 Room 報錯，依錯誤訊息調整。

確認舊資料還在：先用版本 1 的 App 在模擬器新增兩三筆事項，不要解除安裝，再安裝版本 2，打開清單確認事項仍在、`done` 為 false。更可靠的做法是寫遷移測試：加入官方的 `room-testing` 套件（與 Room 版本對應，套件名稱以 Room 版本頁為準），把 schema 目錄加到 `androidTest` 的 assets，用 `MigrationTestHelper` 建立版本 1、插入一列、執行遷移到版本 2，再檢查那一列。

## 參考資源

- [遷移 Room 資料庫](https://developer.android.com/training/data-storage/room/migrating-db-versions)：官方指南，含自動遷移、手動遷移、匯出 schema 與遷移測試。
- [AutoMigration API 文件](https://developer.android.com/reference/kotlin/androidx/room/AutoMigration)：說明自動遷移的定義、`exportSchema` 必須為 true、何時需要 spec。
- [ColumnInfo API 文件](https://developer.android.com/reference/kotlin/androidx/room/ColumnInfo)：`defaultValue` 的語法與限制。
- [Room 版本發布紀錄](https://developer.android.com/jetpack/androidx/releases/room)：Room 目前版本與 Gradle plugin 的說明。

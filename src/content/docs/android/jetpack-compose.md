---
title: Jetpack Compose
description: 以 Kotlin 程式碼宣告畫面的 Android UI 工具組，取代 XML layout。
status: todo
priority: high
repos:
  - todolist
tags:
  - android
  - kotlin
  - compose
updated: 2026-11-15
---

## 這是什麼

Jetpack Compose 是 Android 的宣告式 UI 工具組。畫面用 Kotlin 函式（`@Composable`）描述「在這個狀態下畫面長什麼樣子」，狀態改變時框架重新執行相關函式來更新畫面，不再用 XML 排版、再由程式碼去 `findViewById` 或 ViewBinding 修改元件。它解決的是 View 系統裡畫面與狀態要手動同步的問題：清單、點擊事件、顯示內容都寫在同一種語言裡，不必在 XML、Adapter、Fragment 之間來回對應。

## 我的現況

[TodoList](../../repos/todolist/) 的畫面是 XML layout 加 Fragment，使用 ViewBinding：

- `MainActivity.kt` 以 `ActivityMainBinding` 載入 layout，底部導覽搭配 Navigation 的 Fragment。
- `ui/dashboard/DashboardFragment.kt` 以 `FragmentDashboardBinding` 載入 `fragment_dashboard.xml`，用 `binding.recyclerView` 搭配 `DashboardAdapter.kt`（`ListAdapter` 加 `ViewHolder`）顯示清單。
- `app/build.gradle.kts` 已宣告 Compose 套件：`compose-bom:2022.10.00`、`material3`、`ui`、`activity-compose:1.6.1`、`navigation-compose:2.5.1`。但 `buildFeatures` 只有 `viewBinding = true`，沒有 `compose = true`，整個 `app/src/main/java` 找不到 `@Composable`。唯一的 Compose 痕跡是 `HomeFragment.kt` 的一行 `import androidx.compose.runtime.collectAsState`，檔案裡沒有用到它。
- Kotlin 是 1.9.0（`gradle/libs.versions.toml`），Java 相容性 1.8。

## 與主流的落差

Google 在 2026 年 5 月的文章〈Android UI development is Compose First〉中宣布：新的 API、函式庫、工具與指引都會以 Compose 提供，建議新功能用 Compose 寫、既有功能在修改到時再轉換。文章同時說明 View 系統沒有要被棄用或移除，但只會收到重大錯誤修正、不再有新功能；Fragment、RecyclerView、ViewPager 這些函式庫也被視為已完成，只發布重大錯誤修正。

所以 TodoList 現在的寫法不會壞，但之後官方新增的能力都不會出現在它用的那一套裡。另一個落差是版本：專案宣告的 BOM 是 2022.10.00，官方 BOM 頁面目前列的是 2026.09.00（以官方頁面為準）。官方設定頁也提到，較新的 Compose 版本會要求較新的 `compileSdk` 與 Android Gradle Plugin，所以升級 BOM 會連帶牽動建置設定。

## 學習路線

1. Composable 與狀態：`remember`、`mutableStateOf`、狀態提升（state hoisting），理解畫面是狀態的函式。狀態該放在哪裡、怎麼從 ViewModel 取得，見 [StateFlow 與畫面狀態](../stateflow-ui-state/)。
2. `LazyColumn`：以 `items(list, key = ...)` 取代 RecyclerView 加 Adapter 加 DiffUtil。
3. Navigation Compose：用 composable 目的地取代 Fragment 與 nav graph XML。
4. Material 3：`Scaffold`、`Text`、`Button`、`FloatingActionButton` 與主題，取代 XML 裡的 Material 元件。
5. 與 View 互通：官方文件說明，混合專案可在 Fragment 或 XML layout 中放 `ComposeView`，再呼叫它的 `setContent {}`；整個畫面都是 Compose 時才改用 `ComponentActivity.setContent`。
6. 逐畫面遷移：先轉單一畫面，確認可用後再轉下一個，最後才處理導覽與 Activity。

## 動手練習

目標：把清單頁的列表從 RecyclerView 改成 `LazyColumn`，其他部分（日期篩選、FAB、導覽）先不動。

**一、建置設定**（`app/build.gradle.kts`）。專案目前 Kotlin 1.9.0，官方相容表中 Compose Compiler 1.5.0 到 1.5.2 對應 Kotlin 1.9.0；Kotlin 2.0 以上則改用 Compose Compiler Gradle plugin（`org.jetbrains.kotlin.plugin.compose`），不再需要 `composeOptions`。留在 Kotlin 1.9.0 的寫法：

```kotlin
android {
    buildFeatures {
        viewBinding = true
        compose = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.2"
    }
}
```

另外，2022.10.00 的 BOM 太舊，與這個 compiler 版本是否搭配尚未驗證，建議一併升 BOM，版本以[官方 BOM 頁面](https://developer.android.com/develop/ui/compose/bom)為準；若因此要升 Kotlin 或 AGP，Room 的 KSP 版本（目前 `1.9.0-1.0.13`）也要跟著 Kotlin 版本換。還需要 `lifecycle-runtime-compose`（為了 `collectAsStateWithLifecycle`），並把 `HomeFragment.kt` 那行沒用的 import 刪掉。

**二、在 `fragment_dashboard.xml` 把 `RecyclerView` 換成 `ComposeView`**（保留 id 可改為 `composeList`），再在 `DashboardFragment.kt` 設定：

```kotlin
binding.composeList.apply {
    setViewCompositionStrategy(ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed)
    setContent {
        val notes by viewModel.allItems.observeAsState(emptyList())
        NoteList(notes, onNoteClick = { /* 原本 adapter 的 navigate(action) */ })
    }
}
```

`observeAsState` 需要 `androidx.compose.runtime:runtime-livedata`。這樣可以先不動 ViewModel，等學完狀態那個條目再換成 StateFlow。

**三、清單 composable**：

```kotlin
@Composable
fun NoteList(notes: List<Note>, onNoteClick: (Note) -> Unit, modifier: Modifier = Modifier) {
    LazyColumn(modifier) {
        items(notes, key = { it.id }) { note ->
            Column(Modifier.fillMaxWidth().clickable { onNoteClick(note) }.padding(16.dp)) {
                Text(note.date, style = MaterialTheme.typography.labelMedium)
                Text(note.note, style = MaterialTheme.typography.bodyLarge)
            }
        }
    }
}
```

確認方式：App 能編譯並顯示既有事項；點某一列仍會進入 `ItemDetailFragment`；新增、刪除事項後清單自動更新；`DashboardAdapter.kt` 不再被引用後即可刪除。

## 參考資源

- [Android UI development is Compose First](https://android-developers.googleblog.com/2026/05/android-ui-development-is-compose-first.html)：Google 宣布 Compose 為先的原文，說明 View 系統與相關函式庫進入維護模式。
- [Jetpack Compose 文件首頁](https://developer.android.com/develop/ui/compose/documentation)：官方文件目錄，含狀態、清單、導覽、遷移等章節。
- [Compose 設定：相依套件與編譯器](https://developer.android.com/develop/ui/compose/setup-compose-dependencies-and-compiler)：`buildFeatures`、BOM 與 Compose Compiler Gradle plugin 的設定步驟。
- [Compose to Kotlin 相容表](https://developer.android.com/jetpack/androidx/releases/compose-kotlin)：Kotlin 2.0 之前，Compose Compiler 與 Kotlin 版本的對應。
- [Compose Bill of Materials](https://developer.android.com/develop/ui/compose/bom)：BOM 的用法與目前的最新版本。
- [在 View 中使用 Compose（互通 API）](https://developer.android.com/develop/ui/compose/migrate/interoperability-apis/compose-in-views)：`ComposeView`、`ViewCompositionStrategy` 與 Fragment 範例。
- [Compose 清單與格狀](https://developer.android.com/develop/ui/compose/lists)：`LazyColumn` 與 `key` 的用法。

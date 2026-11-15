---
title: 相依注入
description: 用 Hilt 自動提供物件所需的相依，取代手寫的 Factory。
status: todo
priority: medium
repos:
  - todolist
tags:
  - android
  - kotlin
  - hilt
  - architecture
updated: 2026-11-15
---

## 這是什麼

相依注入（dependency injection）是讓一個類別「從外面拿到」它需要的物件，而不是自己建立。例如 ViewModel 需要 DAO，就由外部傳入，這樣測試時可以換成假的實作，也不必讓每個使用的地方都知道怎麼建立它。手動做法是自己寫容器與 Factory；Hilt 是 Android 官方推薦的函式庫，建構在 Dagger 之上，由編譯器依註解產生這些組裝程式碼，並提供編譯期檢查。它解決的是專案變大後，手寫 Factory 與容器的重複與容易出錯。

## 我的現況

[TodoList](../../repos/todolist/) 目前是手動相依注入：

- `ui/dashboard/InventoryApplication.kt` 是自訂 `Application`，以 `by lazy` 持有 `NoteRoomDatabase`，相當於官方文件所說放在 `Application` 裡的容器。
- `ui/dashboard/DashboardViewModel.kt` 底部有手寫的 `InventoryViewModelFactory`，只認得 `DashboardViewModel`，其他類別一律丟出 `IllegalArgumentException`。
- 四個檔案各自重複組裝一次：`HomeFragment.kt`、`DashboardFragment.kt`、`ItemDetailFragment.kt`、`AddNote.kt`，寫法都是

```kotlin
private val viewModel: DashboardViewModel by activityViewModels {
    InventoryViewModelFactory(
        (activity?.application as InventoryApplication).database.noteDao()
    )
}
```

- `app/build.gradle.kts` 已套用 KSP（`com.google.devtools.ksp` 版本 `1.9.0-1.0.13`，Room 用），Java 相容性與 `kotlinOptions.jvmTarget` 都是 1.8。

## 與主流的落差

官方的相依注入指南說明，手動做法需要自己管理容器、手寫 Factory，且隨專案成長會有大量樣板程式碼，建議可行時用 Hilt。Hilt 建構在 Dagger 之上，在建置時建立並驗證相依圖，確保沒有缺少的相依或循環。官方 Hilt 指南的設定方式是同時套用 KSP 與 Hilt 的 Gradle 外掛，並指出目前的 Hilt 與 Compose 版本需要 Java 17，所以 TodoList 的 1.8 要先調高。

這個差異目前沒有造成錯誤，代價是樣板程式碼與測試困難：四個地方都要知道「怎麼拿到 DAO」，之後新增 Repository 或第二個 ViewModel 時，每個地方都要再改。

## 學習路線

1. 手動相依注入：理解建構子傳入相依、容器、Factory，其中 TodoList 現在的寫法就是範例。
2. Hilt 的設定：兩個 Gradle 外掛（Hilt 與 KSP）、`hilt-android` 與 `hilt-android-compiler` 相依、Java 17。
3. `@HiltAndroidApp` 加在 `Application`；`@AndroidEntryPoint` 加在要被注入的 Activity 與 Fragment。
4. 建構子注入 `@Inject constructor` 與 `@HiltViewModel`。
5. Module：`@Module` 加 `@InstallIn(SingletonComponent::class)`，用 `@Provides` 提供無法加註解的類別（Room 資料庫就是官方文件舉的例子），用 `@Binds` 綁定介面。
6. 範圍（scope）：預設每次要求都建立新實例，需要共用時用 `@Singleton` 等；資料庫應只有一個實例。
7. 測試中替換相依（先知道有這回事，不必立刻做）。

## 動手練習

在 TodoList 引入 Hilt，移除 Factory 與四處重複的程式碼：

1. `build.gradle.kts`：先把 `compileOptions` 與 `kotlinOptions.jvmTarget` 都改成 17，並確認 JDK 17 與 AGP、Kotlin 版本能建置；依官方指南在根目錄與 app 的 `plugins` 加上 `com.google.dagger.hilt.android`，加入 `hilt-android` 與 `ksp("com.google.dagger:hilt-android-compiler:...")`。版本以[官方 Hilt 指南](https://developer.android.com/training/dependency-injection/hilt-android)當下顯示的為準；這個指南的範例版本與專案的 Kotlin 1.9.0 是否相容尚未驗證，若建置失敗先檢查版本對應。
2. `InventoryApplication` 加上 `@HiltAndroidApp`，`MainActivity` 與四個 Fragment 加上 `@AndroidEntryPoint`。
3. 新增 module：

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    @Provides @Singleton
    fun provideDatabase(@ApplicationContext context: Context): NoteRoomDatabase =
        NoteRoomDatabase.getDatabase(context)

    @Provides
    fun provideNoteDao(db: NoteRoomDatabase): NoteDao = db.noteDao()
}
```

4. `DashboardViewModel` 改成 `@HiltViewModel class DashboardViewModel @Inject constructor(private val noteDao: NoteDao)`，刪除 `InventoryViewModelFactory`。
5. 四個 Fragment 的屬性改成 `private val viewModel: DashboardViewModel by activityViewModels()`。

確認方式：全專案搜尋 `InventoryViewModelFactory` 與 `as InventoryApplication` 都沒有結果；各畫面行為不變，首頁計數與清單仍共用同一個 ViewModel。資料庫遷移的設定見 [Room 資料庫遷移](../room-migration/)；ViewModel 之後輸出狀態的方式見 [StateFlow 與畫面狀態](../stateflow-ui-state/)。

## 參考資源

- [使用 Hilt 進行相依注入](https://developer.android.com/training/dependency-injection/hilt-android)：官方指南，含 Gradle 設定、Java 17 說明、註解與 module 寫法。
- [Hilt 與 Jetpack 整合](https://developer.android.com/training/dependency-injection/hilt-jetpack)：`@HiltViewModel` 與 `@Inject` 建構子的範例。
- [手動相依注入](https://developer.android.com/training/dependency-injection/manual)：官方說明手動做法、容器與 Factory，以及它的樣板程式碼問題。
- [Hilt 快速入門（dagger.dev）](https://dagger.dev/hilt/quick-start)：Hilt 專案文件，說明 `@AndroidEntryPoint` 支援的類別與限制。

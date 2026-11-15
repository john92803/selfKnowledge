---
title: StateFlow 與畫面狀態
description: 由 ViewModel 以 StateFlow 提供單一的畫面狀態，畫面只負責顯示。
status: todo
priority: medium
repos:
  - todolist
tags:
  - android
  - kotlin
  - coroutines
  - architecture
updated: 2026-11-15
---

## 這是什麼

`StateFlow` 是 Kotlin coroutines 提供的「持有目前狀態、可被觀察」的熱流（hot flow）：它永遠有一個當前值，新的收集者一開始就會拿到最新值，之後每次狀態更新再收到新值。Android 官方文件的建議做法是由 ViewModel 對外提供 `StateFlow`，把整個畫面需要的資料收成一個狀態物件，畫面只負責收集並顯示，使用者的操作則以函式呼叫傳回 ViewModel，形成單向資料流。它解決的是狀態散在多個 LiveData、多個觀察者、畫面裡的暫存變數，難以推論「現在畫面為什麼是這樣」的問題。

## 我的現況

[TodoList](../../repos/todolist/) 已經在資料層用了 `Flow`，但到畫面前一步轉成 LiveData：

- `ui/data/NoteDao.kt` 的查詢（`getItems()`、`getItem(id)`、`getNoteByDate(date)`、`getNoteByToCount(date)`）都回傳 `Flow`。
- `ui/dashboard/DashboardViewModel.kt` 以 `noteDao.getItems().asLiveData()` 提供 `allItems`，`findNote(date)` 每呼叫一次就回傳一個新的 `asLiveData()`；`findNoteByCount` 直接回傳 `Flow`，由 `HomeFragment.kt` 自己再 `asLiveData()`。
- `ui/dashboard/DashboardFragment.kt` 一開始觀察 `viewModel.allItems`，篩選按鈕的處理則是：

```kotlin
binding.checkSelectButton.setOnClickListener {
    val test = viewModel.findNote(binding.dateView.text.toString())
    test.observe(this.viewLifecycleOwner) { items -> adapter.submitList(items) }
}
```

也就是每按一次就多註冊一個觀察者，舊的沒有移除，`allItems` 的觀察者也一直在。依程式邏輯，這代表篩選後只要資料庫有變動（例如新增事項），`allItems` 會再發出一次，並以完整清單覆蓋篩選結果。「目前篩選哪一天」只存在 `dateView` 這個 TextView 的文字裡，ViewModel 不知道。

## 與主流的落差

官方的 StateFlow 文件以 ViewModel 提供 `StateFlow` 作為畫面狀態的做法，並說明與 LiveData 的差異：`StateFlow` 建構時必須給初始值；`LiveData.observe()` 會在畫面進入 `STOPPED` 時自動停止，收集 flow 則不會，所以 View 要在 `repeatOnLifecycle` 區塊裡收集，Compose 則用 `collectAsStateWithLifecycle`。官方文件並警告，直接用 `launch` 或 `launchIn` 收集 flow 來更新 UI，在畫面不可見時仍會處理事件，可能導致當機。

LiveData 在既有的 View 專案中仍然可用，沒有被棄用，TodoList 目前的寫法不是錯，問題在於篩選狀態沒有集中。改用 StateFlow 的好處是狀態只有一份，以及日後轉 Compose 時可以直接銜接（見 [Jetpack Compose](../jetpack-compose/)）。

## 學習路線

1. 認識 `Flow` 與 `StateFlow` 的差別：冷流與熱流、必須有初始值、`value` 屬性。
2. 在 ViewModel 用 `MutableStateFlow` 加唯讀的 `StateFlow` 對外（backing property）。
3. 用 `stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), 初始值)` 把 Room 的 `Flow` 轉成 `StateFlow`；官方文件說明 `WhileSubscribed(5000)` 讓畫面消失後訂閱再保留五秒，以應付設定變更。
4. 用一個 data class 表示整個畫面狀態（篩選日期、清單、之後可加載入中與錯誤）。
5. 以 `flatMapLatest` 讓「輸入狀態」衍生出「輸出狀態」，輸入改變時取消舊的查詢。
6. 在 Fragment 以 `repeatOnLifecycle(Lifecycle.State.STARTED)` 收集；在 Compose 以 `collectAsStateWithLifecycle` 收集。
7. 單向資料流：事件往上（呼叫 ViewModel 函式）、狀態往下（收集 `uiState`）。

## 動手練習

目標：把「目前篩選的日期」放進 `DashboardViewModel`，清單由它衍生，`DashboardFragment` 只收集一個 `StateFlow`。

```kotlin
data class DashboardUiState(
    val selectedDate: String? = null,
    val notes: List<Note> = emptyList()
)

private val selectedDate = MutableStateFlow<String?>(null)

@OptIn(ExperimentalCoroutinesApi::class)
val uiState: StateFlow<DashboardUiState> = selectedDate
    .flatMapLatest { date ->
        val source = if (date == null) noteDao.getItems() else noteDao.getNoteByDate(date)
        source.map { DashboardUiState(date, it) }
    }
    .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), DashboardUiState())

fun selectDate(date: String?) { selectedDate.value = date }
```

`flatMapLatest` 在 kotlinx.coroutines 文件中標示為 `@ExperimentalCoroutinesApi`，所以要加 `@OptIn`。Fragment 這邊：刪掉 `allItems` 與 `findNote` 的兩個觀察者，改成

```kotlin
viewLifecycleOwner.lifecycleScope.launch {
    viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
        viewModel.uiState.collect { adapter.submitList(it.notes) }
    }
}
```

篩選按鈕只呼叫 `viewModel.selectDate(...)`。專案已有 `lifecycle-runtime-ktx:2.5.1`，`repeatOnLifecycle` 需要 2.4.0 以上。確認方式：篩選某一天後，新增一筆其他日期的事項，清單不會被蓋回全部；連按篩選多次，不再累積觀察者；旋轉螢幕後篩選仍在。清除篩選（`selectDate(null)`）要有對應的按鈕。

## 參考資源

- [StateFlow 與 SharedFlow](https://developer.android.com/kotlin/flow/stateflow-and-sharedflow)：官方文件，說明 ViewModel 提供 StateFlow、`repeatOnLifecycle`，以及與 LiveData 的差異。
- [A safer way to collect flows from Android UIs](https://medium.com/androiddevelopers/a-safer-way-to-collect-flows-from-android-uis-23080b1f8bda)：Android Developers 部落格，討論從 UI 收集 flow 的安全做法。
- [搭配生命週期元件使用 coroutines](https://developer.android.com/topic/libraries/architecture/coroutines)：`collectAsStateWithLifecycle` 與 `stateIn` 加 `WhileSubscribed(5000)` 的官方範例。
- [flatMapLatest（kotlinx.coroutines）](https://kotlinlang.org/api/kotlinx.coroutines/kotlinx-coroutines-core/kotlinx.coroutines.flow/flat-map-latest.html)：官方 API 文件，說明行為與實驗性 API 的 opt-in。

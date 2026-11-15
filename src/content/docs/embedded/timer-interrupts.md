---
title: 計時器中斷與非阻塞設計
description: 用計時器中斷計時，讓主迴圈在等待期間仍能處理其他工作。
status: todo
priority: low
repos:
  - microprocessor-lab
tags:
  - embedded
  - "8051"
  - interrupts
  - c
updated: 2026-11-15
---

## 這是什麼

韌體裡「等一段時間」有兩種寫法。阻塞式是用空迴圈或 `delay()` 一直算，等待期間 CPU 什麼也不能做。非阻塞式是讓硬體計時器每隔固定時間產生一次中斷，中斷服務程式（ISR）只記錄「時間到了」，主迴圈平時照常跑，看到記錄就處理。

這種設計讓一塊板子可以同時做動畫、掃描鍵盤、回應按鈕，而不互相卡住。8051 內建 Timer0 與 Timer1，可以作為這個固定週期的時間來源。

## 我的現況

[Microprocessor_LAB](../../repos/microprocessor-lab/) 的 `lab11.c`（8051，Keil C51）用外部中斷控制 LED 動畫，與計時相關的有幾處：

- 動畫速度靠 `delay(speed[speedindex])` 控制，`delay()` 是雙層空迴圈，等待期間 CPU 無法做別的事。
- `int1()`（`interrupt 0`，即 INT0）的 ISR 內以 `while(1)` 反覆呼叫 `kbscan()`，直到按下按鍵才離開，這段時間主迴圈完全停住。`kb44.h` 的 `kbscan()` 本身也有 `delay1ms(20)` 與等待放開的 `while`。
- `state` 與 `speedindex` 在 ISR 裡被修改、在主迴圈裡被讀，兩者都沒有宣告 `volatile`。
- `speed` 陣列有三個元素，`int2()` 卻寫成：

```c
// lab11.c
char speed[] = {10, 50, 100};
void int2() interrupt 2 {
    if(speedindex == 3) { speedindex = 0; }   // 3 才歸零
    else { speedindex++; }
}
```

`speedindex` 會變成 3，主迴圈就讀到 `speed[3]`，超出陣列。另外，`TCON = 5`、`IE = 0X85` 是直接寫數值，沒有 Timer0 的設定。README 提到 INT0 切換花樣，但程式裡 `state[index]` 實際存的是該花樣重複播放的次數，由鍵盤輸入的數字決定。

## 與主流的落差

下列是嵌入式開發的通行做法，來源是教學資料（applied-ee 的 ee-notebook），不是晶片或編譯器的官方規範：

- ISR 盡量短：只設旗標或累加計數，實際工作交給主迴圈。
- 不要在 ISR 內呼叫延遲或等待迴圈。
- 與 ISR 共用的變數宣告為 `volatile`，避免編譯器把旗標快取起來而看不到變化。
- `volatile` 不保證多位元組變數的存取不被打斷。8 位元的 8051 讀 16 位元變數需要兩次存取，必要時要短暫關閉中斷再讀。

`lab11.c` 的 `int1()` 同時違反前兩條。

8051 與 Keil C51 的部分：Timer0 的設定涉及 `TMOD`、`TH0`、`TL0`、`TR0`、`ET0`（以及總開關 `EA`），位元定義以晶片資料手冊為準。Keil C51 的中斷函式用 `interrupt n` 屬性，編號 n 為 0 到 31 的整數常數，向量位址是 8n+3，Timer0 為 `interrupt 1`；`lab11.c` 的 `interrupt 0` 與 `interrupt 2` 正是 INT0 與 INT1。這一段依據搜尋到的 Keil 應用說明，撰寫時未能開啟手冊頁面的內文確認，使用前請對照下方的 Keil 官方文件。

## 學習路線

1. 理解阻塞與非阻塞的差別，以及「主迴圈加旗標」的結構。
2. 讀 Keil 官方文件的中斷函式一節，會寫 `void f() interrupt n`。
3. 理解 Timer0 的模式 1（16 位元）：`TMOD` 選模式、`TH0`／`TL0` 存初值、溢位產生中斷。
4. 會計算重載值：與晶振頻率和每個機器週期的時脈數有關，要依自己的板子算。
5. 理解 `volatile` 的作用與限制，以及何時需要關中斷保護多位元組讀取。
6. 用狀態機取代阻塞迴圈：每次主迴圈只推進一步。

## 動手練習

把 `lab11.c` 改成由 Timer0 中斷產生固定週期的計時，其餘都在同一塊 8051 板子上完成。

**計時器。** 重載值要依實驗板的晶振計算，不要直接抄別人的數字。以標準 8051 每個機器週期 12 個時脈為例（你的晶片是否如此，請查資料手冊）：

```c
// FOSC_HZ 填實驗板的晶振頻率；TICKS_PER_SEC 是你想要的計時節拍
#define RELOAD (65536UL - (FOSC_HZ / 12UL) / TICKS_PER_SEC)

volatile unsigned int tick = 0;
volatile unsigned char key_req = 0, speedindex = 0;

void timer0_isr() interrupt 1 {
    TH0 = RELOAD >> 8; TL0 = RELOAD & 0xFF;   // 模式 1 要手動重載
    tick++;
}
void int1() interrupt 0 { key_req = 1; }                 // 只設旗標
void int2() interrupt 2 { speedindex = (speedindex + 1) % 3; }   // 修正範圍

void timer_init(void) {
    TMOD = (TMOD & 0xF0) | 0x01;              // Timer0 模式 1
    TH0 = RELOAD >> 8; TL0 = RELOAD & 0xFF;
    IT0 = IT1 = 1; EX0 = EX1 = 1; ET0 = 1; TR0 = 1; EA = 1;
}

unsigned int get_tick(void) {     // 16 位元不是單一指令存取
    unsigned int t;
    EA = 0; t = tick; EA = 1;
    return t;
}
```

`speedindex` 只有 1 個位元組，宣告 `volatile` 就夠；`tick` 是 2 個位元組，所以用 `get_tick()` 關中斷讀取。

**狀態機。** 把三個 `swN()` 的迴圈拆成「第 step 個畫面」，主迴圈每經過一個節拍數就推進一格：

```c
code unsigned int speed_ticks[3] = { /* 你想要的三種速度，單位為節拍 */ };

unsigned char frame(unsigned char pat, unsigned char step) {
    if (pat == 0) return step < 8 ? _crol_(0xFE, step) : _cror_(0x7F, step - 8);
    if (pat == 2) return step == 0 ? 0x00 : 0xFF;
    /* pat == 1：依 sw4 的 table1、~table2、table2、~table1 四段各 8 格 */
}

while (1) {
    if ((unsigned int)(get_tick() - last) >= speed_ticks[speedindex]) {
        last = get_tick();
        /* P0 = frame(index, step); 推進 step；跑完一輪就 rep++，
           rep 達 state[index] 就換下一個花樣並更新 P1 */
    }
    if (key_req) {
        unsigned char k = kbscan();
        if (k != 0xff) { state[index] = k; P1 = seg7[k]; key_req = 0; }
    }
}
```

`sw1()` 的原始版本是 8 格左移加 8 格右移，共 16 格，上面的 `frame` 與它對應。`kbscan()` 偵測到按鍵時仍會用 `delay1ms` 消除彈跳並等放開，是短暫的阻塞，但已經不在 ISR 裡。

確認做對：動畫中按 INT1 的按鈕可以立刻改速度；按 INT0 後動畫不會停住，按下鍵盤才更新次數；連按 INT1 超過三次，`speedindex` 仍在 0 到 2。

## 參考資源

- [Interrupt Functions（Keil C51 使用手冊）](https://www.keil.com/support/man/docs/c51/c51_le_interruptfuncs.htm)：`interrupt` 屬性與中斷函式的寫法。
- [Interrupts（applied-ee ee-notebook）](https://applied-ee.github.io/ee-notebook/docs/embedded/firmware-structure/interrupts/)：教學資料，ISR 要短、`volatile` 與多位元組存取的注意事項。

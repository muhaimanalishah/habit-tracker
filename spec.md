# Product & Technical Specification: Local-First Habit Tracker

## 1. Overview

A fast, local-first personal habit tracker built as a React Single Page Application (SPA). It runs entirely in the browser using IndexedDB for storage, with zero backend dependencies, instant UI updates, and a spacious, responsive dashboard.

---

## 2. Tech Stack & Packages

| Layer | Technology / Package | Purpose |
| --- | --- | --- |
| **Framework** | React (Vite) + TypeScript | Fast SPA setup with strict typing for schema & date rules |
| **Styling & UI** | Tailwind CSS + Shadcn UI | Base design system, primitives, tooltips, and dialogs |
| **Drawers / Modals** | `vaul` (via Shadcn Drawer/Sheet) | Responsive side-sheets on desktop, swipeable bottom drawers on mobile |
| **Database** | `dexie` + `dexie-react-hooks` | IndexedDB wrapper + `useLiveQuery` for reactive DB queries |
| **State Management** | React Context API | Holds global UI state (`selectedDate`, `activeFilter`, modal states) |
| **Date Math** | `date-fns` | Timezone-safe date formatting, intervals, and streak calculations |
| **Icons** | `lucide-react` | UI icons + curated icon picker for habits |

---

## 3. Database Schema (Dexie / IndexedDB)

Initialize a single Dexie database instance (`HabitTrackerDB`) with three tables:

```typescript
// db.ts
import Dexie, { type EntityTable } from 'dexie';

export type HabitType = 'binary' | 'quant';
export type FrequencyType = 'daily' | 'specific_days' | 'times_per_week';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'anytime';
export type LogStatus = 'completed' | 'partial' | 'skipped';

export interface Habit {
  id: string;                 // crypto.randomUUID()
  title: string;
  icon: string;               // Lucide icon name (e.g., "Dumbbell", "BookOpen")
  color: string;              // Tailwind color token (e.g., "emerald", "blue", "amber")
  type: HabitType;
  targetValue: number;        // 1 for binary; >1 for quantitative (e.g., 3)
  stepValue: number;          // Increment step (e.g., 1 or 0.5)
  unit?: string;              // Optional unit (e.g., "Liters", "Pages")
  frequencyType: FrequencyType;
  daysOfWeek?: number[];      // [0-6] (Sun-Sat) if frequencyType === 'specific_days'
  timesPerWeek?: number;      // 1-7 if frequencyType === 'times_per_week'
  timeOfDay: TimeOfDay;
  createdAt: string;          // YYYY-MM-DD
  archived: number;           // 0 = active, 1 = archived (indexed as number for Dexie)
  sortOrder: number;
}

export interface HabitLog {
  id: string;                 // Composite key: `${habitId}_${date}`
  habitId: string;
  date: string;               // Strictly "YYYY-MM-DD" (adjusted for 4 AM rollover)
  status: LogStatus;
  value: number;              // 1 for binary completed; current number for quant
  updatedAt: number;          // Date.now()
}

export interface AppSettings {
  id: string;                 // Always "user_settings"
  dayResetHour: number;       // Default: 4 (4:00 AM rollover)
  theme: 'dark' | 'light' | 'system';
  lastBackupDate?: string;    // YYYY-MM-DD
}

```

**Dexie Index Definition:**

```typescript
db.version(1).stores({
  habits: 'id, archived, timeOfDay, sortOrder',
  logs: 'id, habitId, date, [habitId+date]',
  settings: 'id'
});

```

---

## 4. Core Business Logic & Algorithms

### 4.1 The 4:00 AM Logical Date Helper

Never use raw `new Date().toISOString().split('T')[0]` because UTC offsets and post-midnight hours will log habits to the wrong day.

* **Rule:** Subtract `dayResetHour` (default `4` hours) from the current local time before formatting to `YYYY-MM-DD` via `date-fns/format`.
* **Result:** Checking off a habit at 1:30 AM on Tuesday logs it under Monday's date.

### 4.2 Filtering Habits for `selectedDate`

A habit appears in the Action Zone for `selectedDate` if `archived === 0`, `createdAt <= selectedDate`, and:

1. `frequencyType === 'daily'`: Always show.
2. `frequencyType === 'specific_days'`: Show if `daysOfWeek.includes(getDay(selectedDate))`.
3. `frequencyType === 'times_per_week'`: Always show in the list (with a small badge like `2/3 this week`), dimming once the weekly quota is met.

### 4.3 Streak Calculation (Scheduled-Aware)

Calculated dynamically inside a `useMemo` hook by walking backward from `today` using `subDays`:

* **Completed (`status === 'completed'`):** Increments streak by `1`.
* **Skipped (`status === 'skipped'`):** Does not increment streak, but **does not break it**. Continue walking backward.
* **Unscheduled Day:** If a habit is set to Mon/Wed/Fri, Tuesday is ignored. Continue walking backward.
* **Today Grace Rule:** If `today` is not yet completed, do not reset the streak to `0`—start counting from `yesterday` unless `today` is already marked completed.
* **Missing / Partial on a Scheduled Past Day:** Stops the loop.

### 4.4 Momentum Score (0–100%)

Look at the last 30 scheduled days for a habit (or across all habits for global momentum):

* Apply an exponential moving average where each scheduled day has a weight:

$$\text{Score}_{t} = (\text{Score}_{t-1} \times 0.92) + (\text{Completed}_{t} \times 8)$$


* Skipped days leave $\text{Score}_{t} = \text{Score}_{t-1}$ unchanged. Clamp result between `0` and `100`.

---

## 5. Layout & Responsive UI Architecture

### 5.1 Desktop Layout (`lg: >= 1024px`)

* **Container:** Centered `max-w-6xl mx-auto px-6 py-8`.
* **Top Header Bar:**
* **Left:** Formatted date title (`Wednesday, Oct 14`) + subtitle (`3 of 6 completed today`).
* **Right:** Time-of-day filter pills (`All`, `Morning`, `Afternoon`, `Evening`) + Primary `+ New Habit` button + Settings icon button.


* **Main Grid:** `grid grid-cols-12 gap-10 items-start`
* **Left Column (`col-span-7` — 60% Action Zone):**
1. **7-Day Strip:** Row of 7 interactive day cards (`Today` + past 6 days). Shows day letter, date number, and a completion dot.
2. **Habit List:** Grouped cleanly by time of day (if `All` filter is active) or rendered as a spacious stack (`space-y-3`).


* **Right Column (`col-span-5 sticky top-8` — 40% Overview Panel):**
1. **Card 1 (Momentum & Streaks):** Today's completion progress bar + 3 metric blocks (`Current Streak`, `Momentum %`, `Best Streak`).
2. **Card 2 (Consistency Heatmap):** 18-week GitHub-style contribution grid (`7 rows × 18 cols`). Color intensity scales across 4 levels based on daily completion percentage (`0%`, `1-49%`, `50-99%`, `100%`).





### 5.2 Mobile Layout (`< 1024px`)

* **Single Column View:** Full width (`px-4 pt-6 pb-24`).
* **Bottom Floating Switcher:** Fixed centered glassmorphic pill at `bottom-5` toggling between two views: **`Today`** (Action Zone) and **`Insights`** (Overview Panel).
* **Floating Action Button (FAB):** Fixed `+` button at `bottom-5 right-5` for creating a habit with one thumb.
* **Adaptive Heatmap:** Automatically slices the date interval to show the **last 12 weeks** so grid squares stay large and touch-friendly without horizontal scrollbars.
* **Adaptive Drawers:** Any modal that opens as a right-side `Sheet` on desktop renders as a bottom swipeable `Drawer` (`vaul`) on mobile.

---

## 6. Component Breakdown & Interactions

### 6.1 `HabitCard.tsx`

* **Container:** `p-4 rounded-xl border bg-card hover:border-primary/30 transition-all flex items-center justify-between gap-4`
* **Left Zone (Click opens Detail/Edit Sheet):**
* Tinted icon square (`w-10 h-10 rounded-lg`) using the habit's selected color and Lucide icon.
* Habit title (`font-medium`) + subtitle tag (`Morning • 1.5 / 3 Liters` or current streak flame icon).


* **Right Zone (Action Area — minimum `44x44px` hit target):**
* **Skip Trigger:** On desktop, a subtle ghost button (`Skip`) appears on card hover. On mobile, swiping the card left or long-pressing toggles the `skipped` state.
* **Binary Control:** Custom rounded checkbox. Clicking toggles between `completed` and deleting the log for `selectedDate`.
* **Quantitative Control:** A circular SVG progress ring wrapping a `+` button. Clicking increments `value` by `stepValue`. Once `value >= targetValue`, status flips to `completed`.



### 6.2 `HabitFormSheet.tsx` (Create / Edit)

* **Fields:**
* Title text input.
* Icon picker (grid of 24 curated Lucide icons) & Color picker (6 clean Tailwind swatches).
* Habit Type toggle (`Yes / No` vs. `Measurable Target`). If Measurable, reveal `Target`, `Step`, and `Unit` inputs inline.
* Frequency selector (`Every day`, `Specific days of week` with `S M T W T F S` toggle buttons, or `X times per week` slider).
* Time of Day selector (`Anytime`, `Morning`, `Afternoon`, `Evening`).


* **Edit Mode Footer:** Includes `Archive Habit` (hides from Today view, preserves past logs) and `Delete Permanently` (deletes habit + all associated logs in a Dexie transaction).

### 6.3 `SettingsModal.tsx` (Data & Preferences)

* **Theme Toggle:** Light / Dark / System.
* **Day Rollover Hour:** Select dropdown (`12:00 AM` to `6:00 AM`, default `4:00 AM`).
* **Backup & Restore:**
* **Export JSON:** Queries `db.habits.toArray()`, `db.logs.toArray()`, and `db.settings.toArray()`, bundles them into a timestamped `habit-backup-YYYY-MM-DD.json` blob, and triggers a browser download.
* **Import JSON:** File input that validates the keys, clears existing tables inside a `db.transaction('rw', ...)`, and runs `bulkPut()` to restore all records.



---

## 7. Keyboard Shortcuts (Desktop)

Attach a single `keydown` listener inside the root layout (disabled when an `input` or `textarea` is focused):

* **`N`**: Open the "New Habit" sheet.
* **`[` or `ArrowLeft**`: Move `selectedDate` back 1 day.
* **`]` or `ArrowRight**`: Move `selectedDate` forward 1 day (up to `today`).
* **`T`**: Jump `selectedDate` back to `today`.
* **`1` – `9**`: Toggle/increment the $n$-th visible habit in the list.

---

## 8. Suggested Project Folder Structure

```text
src/
├── components/
│   ├── dashboard/
│   │   ├── HeaderBar.tsx
│   │   ├── SevenDayStrip.tsx
│   │   ├── HabitList.tsx
│   │   ├── HabitCard.tsx
│   │   ├── OverviewPanel.tsx
│   │   └── ConsistencyHeatmap.tsx
│   ├── modals/
│   │   ├── HabitFormSheet.tsx
│   │   ├── HabitDetailSheet.tsx
│   │   └── SettingsModal.tsx
│   ├── layout/
│   │   └── MobileBottomNav.tsx
│   └── ui/                  # Shadcn primitives (button, sheet, drawer, tooltip, etc.)
├── context/
│   └── UIContext.tsx        # selectedDate, activeFilter, activeModalId
├── db/
│   ├── db.ts                # Dexie instance & schema types
│   ├── actions.ts           # toggleHabit, incrementHabit, skipHabit, exportDB, importDB
│   └── seed.ts              # Optional initial default settings
├── lib/
│   ├── dates.ts             # getLogicalToday(), 7-day generator, heatmap intervals
│   └── stats.ts             # calculateStreak(), calculateMomentum()
└── App.tsx

```

---

## 9. Build Order (Step-by-Step Implementation Plan)

1. **Scaffold & DB Setup:** Initialize Vite + React + TypeScript + Tailwind + Shadcn UI. Set up `db.ts` and `dates.ts` with the 4:00 AM logical date helper.
2. **UI Context & Seed:** Create `UIContext` holding `selectedDate` and wire up `HabitFormSheet` so you can create habits and verify they appear in IndexedDB via `useLiveQuery`.
3. **The Action Zone (Left Column):** Build `SevenDayStrip`, `HabitList`, and `HabitCard` with Binary, Quantitative, and Skip interactions.
4. **Stats Engine & Right Column:** Write the pure functions in `stats.ts` for Streaks and Momentum, then wire up `OverviewPanel` and `ConsistencyHeatmap`.
5. **Mobile Adaptation & Polish:** Add the `< 1024px` bottom switcher, responsive drawer hook (`useMediaQuery`), keyboard shortcuts, and JSON Import/Export in `SettingsModal`.


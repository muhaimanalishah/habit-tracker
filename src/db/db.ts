import Dexie, { type EntityTable } from 'dexie';

export type HabitType = 'binary' | 'quant';
export type FrequencyType = 'daily' | 'specific_days' | 'times_per_week';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'anytime';
export type LogStatus = 'completed' | 'partial' | 'skipped';

export interface Habit {
  id: string; // crypto.randomUUID()
  title: string;
  icon: string; // Lucide icon name (e.g., "Dumbbell", "BookOpen")
  color: string; // Tailwind color token (e.g., "emerald", "blue", "amber", "purple", "rose", "cyan")
  type: HabitType;
  targetValue: number; // 1 for binary; >1 for quantitative (e.g., 3)
  stepValue: number; // Increment step (e.g., 1 or 0.5)
  unit?: string; // Optional unit (e.g., "Liters", "Pages")
  frequencyType: FrequencyType;
  daysOfWeek?: number[]; // [0-6] (Sun-Sat) if frequencyType === 'specific_days'
  timesPerWeek?: number; // 1-7 if frequencyType === 'times_per_week'
  timeOfDay: TimeOfDay;
  createdAt: string; // YYYY-MM-DD
  archived: number; // 0 = active, 1 = archived (indexed as number for Dexie)
  sortOrder: number;
}

export interface HabitLog {
  id: string; // Composite key: `${habitId}_${date}`
  habitId: string;
  date: string; // Strictly "YYYY-MM-DD" (adjusted for 4 AM rollover)
  status: LogStatus;
  value: number; // 1 for binary completed; current number for quant
  note?: string; // Optional daily micro-note
  updatedAt: number; // Date.now()
}

export interface AppSettings {
  id: string; // Always "user_settings"
  dayResetHour: number; // Default: 4 (4:00 AM rollover)
  theme: 'dark' | 'light' | 'system';
  lastBackupDate?: string; // YYYY-MM-DD
  hasInitialized?: boolean; // Set to true once initial seed/wipe has completed
}

export const db = new Dexie('HabitTrackerDB') as Dexie & {
  habits: EntityTable<Habit, 'id'>;
  logs: EntityTable<HabitLog, 'id'>;
  settings: EntityTable<AppSettings, 'id'>;
};

db.version(1).stores({
  habits: 'id, archived, timeOfDay, sortOrder',
  logs: 'id, habitId, date, [habitId+date]',
  settings: 'id',
});

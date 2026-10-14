import { db, type Habit, type AppSettings } from './db';
import { format } from 'date-fns';

/**
 * Toggles a binary habit for a given date.
 * If already completed, removes the log (or resets to partial/0 if note exists).
 * Otherwise marks as completed, preserving any existing note.
 */
export async function toggleHabit(habit: Habit, dateStr: string): Promise<void> {
  const logId = `${habit.id}_${dateStr}`;
  const existingLog = await db.logs.get(logId);

  if (existingLog && existingLog.status === 'completed') {
    if (existingLog.note) {
      await db.logs.put({
        ...existingLog,
        status: 'partial',
        value: 0,
        updatedAt: Date.now(),
      });
    } else {
      await db.logs.delete(logId);
    }
  } else {
    await db.logs.put({
      id: logId,
      habitId: habit.id,
      date: dateStr,
      status: 'completed',
      value: 1,
      note: existingLog?.note,
      updatedAt: Date.now(),
    });
  }
}

/**
 * Increments a quantitative habit by stepValue (or customAmount).
 * When value >= targetValue, flips status to 'completed', preserving note.
 */
export async function incrementHabit(
  habit: Habit,
  dateStr: string,
  customAmount?: number
): Promise<void> {
  const logId = `${habit.id}_${dateStr}`;
  const existingLog = await db.logs.get(logId);

  const currentValue = existingLog ? existingLog.value : 0;
  const step = customAmount ?? habit.stepValue ?? 1;
  const newValue = Number((currentValue + step).toFixed(2));
  const isCompleted = newValue >= habit.targetValue;

  await db.logs.put({
    id: logId,
    habitId: habit.id,
    date: dateStr,
    status: isCompleted ? 'completed' : 'partial',
    value: newValue,
    note: existingLog?.note,
    updatedAt: Date.now(),
  });
}

/**
 * Decrements a quantitative habit by stepValue.
 * If value <= 0, resets to 0 (or deletes if no note exists).
 */
export async function decrementHabit(habit: Habit, dateStr: string): Promise<void> {
  const logId = `${habit.id}_${dateStr}`;
  const existingLog = await db.logs.get(logId);
  if (!existingLog) return;

  const step = habit.stepValue ?? 1;
  const newValue = Number((existingLog.value - step).toFixed(2));

  if (newValue <= 0) {
    if (existingLog.note) {
      await db.logs.put({
        ...existingLog,
        value: 0,
        status: 'partial',
        updatedAt: Date.now(),
      });
    } else {
      await db.logs.delete(logId);
    }
  } else {
    await db.logs.put({
      ...existingLog,
      value: newValue,
      status: newValue >= habit.targetValue ? 'completed' : 'partial',
      updatedAt: Date.now(),
    });
  }
}

/**
 * Sets specific value for a quantitative habit.
 */
export async function setHabitValue(habit: Habit, dateStr: string, value: number): Promise<void> {
  const logId = `${habit.id}_${dateStr}`;
  const existingLog = await db.logs.get(logId);

  if (value <= 0) {
    if (existingLog?.note) {
      await db.logs.put({
        ...existingLog,
        value: 0,
        status: 'partial',
        updatedAt: Date.now(),
      });
    } else {
      await db.logs.delete(logId);
    }
    return;
  }

  const isCompleted = value >= habit.targetValue;
  await db.logs.put({
    id: logId,
    habitId: habit.id,
    date: dateStr,
    status: isCompleted ? 'completed' : 'partial',
    value: Number(value.toFixed(2)),
    note: existingLog?.note,
    updatedAt: Date.now(),
  });
}

/**
 * Toggles skipped status for a habit on a given date, preserving note.
 */
export async function toggleSkipHabit(habit: Habit, dateStr: string): Promise<void> {
  const logId = `${habit.id}_${dateStr}`;
  const existingLog = await db.logs.get(logId);

  if (existingLog?.status === 'skipped') {
    if (existingLog.note) {
      await db.logs.put({
        ...existingLog,
        status: 'partial',
        value: 0,
        updatedAt: Date.now(),
      });
    } else {
      await db.logs.delete(logId);
    }
  } else {
    await db.logs.put({
      id: logId,
      habitId: habit.id,
      date: dateStr,
      status: 'skipped',
      value: 0,
      note: existingLog?.note,
      updatedAt: Date.now(),
    });
  }
}

/**
 * Saves or updates a daily micro-note for a habit on a specific date.
 */
export async function saveHabitNote(habit: Habit, dateStr: string, noteText: string): Promise<void> {
  const logId = `${habit.id}_${dateStr}`;
  const existingLog = await db.logs.get(logId);
  const trimmed = noteText.trim();

  if (existingLog) {
    if (!trimmed && existingLog.status === 'partial' && existingLog.value === 0) {
      // Empty note on a shell record: clean up
      await db.logs.delete(logId);
    } else {
      await db.logs.put({
        ...existingLog,
        note: trimmed || undefined,
        updatedAt: Date.now(),
      });
    }
  } else if (trimmed) {
    await db.logs.put({
      id: logId,
      habitId: habit.id,
      date: dateStr,
      status: 'partial',
      value: 0,
      note: trimmed,
      updatedAt: Date.now(),
    });
  }
}

/**
 * Reorders a habit up or down within its group.
 */
export async function moveHabitOrder(
  habitId: string,
  direction: 'up' | 'down',
  groupHabits: Habit[]
): Promise<void> {
  const index = groupHabits.findIndex((h) => h.id === habitId);
  if (index === -1) return;
  if (direction === 'up' && index === 0) return;
  if (direction === 'down' && index === groupHabits.length - 1) return;

  const targetIndex = direction === 'up' ? index - 1 : index + 1;

  // Normalize sort orders: 0, 1, 2...
  const updated = groupHabits.map((h, i) => ({ ...h, sortOrder: i }));
  // Swap
  const temp = updated[index].sortOrder;
  updated[index].sortOrder = updated[targetIndex].sortOrder;
  updated[targetIndex].sortOrder = temp;

  await db.habits.bulkPut(updated);
}

/**
 * Saves (creates or updates) a habit.
 */
export async function saveHabit(habit: Habit): Promise<void> {
  await db.habits.put(habit);
}

/**
 * Archives or unarchives a habit.
 */
export async function setHabitArchived(habitId: string, archived: 0 | 1): Promise<void> {
  await db.habits.update(habitId, { archived });
}

/**
 * Deletes a habit and all associated logs in a Dexie transaction.
 */
export async function deleteHabit(habitId: string): Promise<void> {
  await db.transaction('rw', [db.habits, db.logs], async () => {
    await db.habits.delete(habitId);
    await db.logs.where('habitId').equals(habitId).delete();
  });
}

/**
 * Clears all habits and logs, and sets hasInitialized = true so seed does not run.
 */
export async function clearAllData(): Promise<void> {
  await db.transaction('rw', [db.habits, db.logs, db.settings], async () => {
    await db.habits.clear();
    await db.logs.clear();
    const current = await db.settings.get('user_settings');
    await db.settings.put({
      id: 'user_settings',
      dayResetHour: current?.dayResetHour ?? 4,
      theme: current?.theme ?? 'system',
      hasInitialized: true,
    });
  });
}

/**
 * Saves application settings.
 */
export async function saveSettings(settings: Partial<AppSettings>): Promise<void> {
  const current = await db.settings.get('user_settings');
  const updated: AppSettings = {
    id: 'user_settings',
    dayResetHour: settings.dayResetHour ?? current?.dayResetHour ?? 4,
    theme: settings.theme ?? current?.theme ?? 'system',
    lastBackupDate: settings.lastBackupDate ?? current?.lastBackupDate,
    hasInitialized: settings.hasInitialized ?? current?.hasInitialized ?? true,
  };
  await db.settings.put(updated);
}

/**
 * Gets application settings, or initializes default settings if none exist.
 */
export async function getSettings(): Promise<AppSettings> {
  const existing = await db.settings.get('user_settings');
  if (existing) return existing;

  const defaults: AppSettings = {
    id: 'user_settings',
    dayResetHour: 4,
    theme: 'system',
    hasInitialized: true,
  };
  await db.settings.put(defaults);
  return defaults;
}

/**
 * Exports all database records to a downloaded JSON file.
 */
export async function exportDatabase(): Promise<void> {
  const habits = await db.habits.toArray();
  const logs = await db.logs.toArray();
  const settings = await db.settings.toArray();

  const backupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    habits,
    logs,
    settings,
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const fileName = `habit-backup-${todayStr}.json`;

  const blob = new Blob([JSON.stringify(backupData, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);

  // Update last backup date in settings
  await saveSettings({ lastBackupDate: todayStr });
}

/**
 * Imports database records from a JSON file string with full validation and transaction safety.
 */
export async function importDatabase(jsonString: string): Promise<{ success: boolean; message: string }> {
  try {
    const data = JSON.parse(jsonString);

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid JSON file format.');
    }

    if (!Array.isArray(data.habits) || !Array.isArray(data.logs)) {
      throw new Error('Missing habits or logs data arrays in backup file.');
    }

    await db.transaction('rw', [db.habits, db.logs, db.settings], async () => {
      await db.habits.clear();
      await db.logs.clear();
      await db.settings.clear();

      if (data.habits.length > 0) {
        await db.habits.bulkPut(data.habits);
      }
      if (data.logs.length > 0) {
        await db.logs.bulkPut(data.logs);
      }
      if (Array.isArray(data.settings) && data.settings.length > 0) {
        await db.settings.bulkPut(data.settings);
      } else {
        await db.settings.put({
          id: 'user_settings',
          dayResetHour: 4,
          theme: 'system',
          hasInitialized: true,
        });
      }
    });

    return {
      success: true,
      message: `Successfully restored ${data.habits.length} habits and ${data.logs.length} logs.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error during import.';
    return { success: false, message: msg };
  }
}

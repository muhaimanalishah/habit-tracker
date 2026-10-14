import {
  parseISO,
  subDays,
  addDays,
  format,
  getDay,
  isBefore,
} from 'date-fns';
import type { Habit, HabitLog } from '@/db/db';
import { isHabitScheduledForDate, getWeekBoundaries } from './dates';

/**
 * Calculates current streak for a single habit.
 * Scheduled-aware and times_per_week aware.
 */
export function calculateHabitStreak(
  habit: Habit,
  logsByDate: Map<string, HabitLog>,
  todayStr: string
): number {
  if (habit.archived === 1) return 0;

  const createdDate = parseISO(habit.createdAt);
  const todayDate = parseISO(todayStr);

  // If created in the future, 0
  if (isBefore(todayDate, createdDate)) return 0;

  const currentWeekStartStr = getWeekBoundaries(todayStr).startStr;
  const isTimesPerWeek = habit.frequencyType === 'times_per_week';
  const targetPerWeek = habit.timesPerWeek ?? 1;

  // Cache for weekly completed/skipped counts
  const weekCountsCache = new Map<string, number>();
  const getWeekEligibleCount = (dStr: string): number => {
    const { startStr } = getWeekBoundaries(dStr);
    const cached = weekCountsCache.get(startStr);
    if (cached !== undefined) return cached;

    let count = 0;
    const monday = parseISO(startStr);
    for (let i = 0; i < 7; i++) {
      const cur = format(addDays(monday, i), 'yyyy-MM-dd');
      const l = logsByDate.get(cur);
      if (l?.status === 'completed' || l?.status === 'skipped') {
        count++;
      }
    }
    weekCountsCache.set(startStr, count);
    return count;
  };

  let streak = 0;

  // Check today's status
  const todayLog = logsByDate.get(todayStr);
  const todayIsScheduled = isHabitScheduledForDate(habit, todayStr);

  if (todayIsScheduled && todayLog?.status === 'completed') {
    streak += 1;
  }
  // Grace rule for today: whether completed, skipped, or incomplete,
  // we count today above and continue walking backward from yesterday (offset 1)
  const startFromDayOffset = 1;

  // Walk backward day by day
  for (let i = startFromDayOffset; i < 3650; i++) {
    const d = subDays(todayDate, i);
    const dateStr = format(d, 'yyyy-MM-dd');

    // If we walked past creation date, stop
    if (dateStr < habit.createdAt) {
      break;
    }

    // Check if scheduled
    const isScheduled = isHabitScheduledForDate(habit, dateStr);
    if (!isScheduled) {
      // Unscheduled Day: ignored, continue walking backward
      continue;
    }

    const log = logsByDate.get(dateStr);
    if (log?.status === 'completed') {
      streak += 1;
    } else if (log?.status === 'skipped') {
      // Skipped: does not increment, does not break. Continue backward.
      continue;
    } else {
      // Unlogged or partial day
      if (isTimesPerWeek) {
        // Do not break if in current week OR if the past week achieved weekly quota
        const isCurrentWeek = dateStr >= currentWeekStartStr;
        const metQuota = getWeekEligibleCount(dateStr) >= targetPerWeek;
        if (isCurrentWeek || metQuota) {
          continue;
        }
      }
      // Otherwise, missing on a scheduled past day breaks the streak
      break;
    }
  }

  return streak;
}

/**
 * Calculates best all-time streak for a habit.
 */
export function calculateHabitBestStreak(
  habit: Habit,
  logsByDate: Map<string, HabitLog>,
  todayStr: string
): number {
  if (habit.createdAt > todayStr) return 0;

  const currentWeekStartStr = getWeekBoundaries(todayStr).startStr;
  const isTimesPerWeek = habit.frequencyType === 'times_per_week';
  const targetPerWeek = habit.timesPerWeek ?? 1;

  const weekCountsCache = new Map<string, number>();
  const getWeekEligibleCount = (dStr: string): number => {
    const { startStr } = getWeekBoundaries(dStr);
    const cached = weekCountsCache.get(startStr);
    if (cached !== undefined) return cached;

    let count = 0;
    const monday = parseISO(startStr);
    for (let i = 0; i < 7; i++) {
      const cur = format(addDays(monday, i), 'yyyy-MM-dd');
      const l = logsByDate.get(cur);
      if (l?.status === 'completed' || l?.status === 'skipped') {
        count++;
      }
    }
    weekCountsCache.set(startStr, count);
    return count;
  };

  let bestStreak = 0;
  let currentRunningStreak = 0;

  const createdDate = parseISO(habit.createdAt);

  // Walk forward from createdAt to today
  let curr = createdDate;
  while (format(curr, 'yyyy-MM-dd') <= todayStr) {
    const dateStr = format(curr, 'yyyy-MM-dd');

    if (isHabitScheduledForDate(habit, dateStr)) {
      const log = logsByDate.get(dateStr);
      if (log?.status === 'completed') {
        currentRunningStreak += 1;
        if (currentRunningStreak > bestStreak) {
          bestStreak = currentRunningStreak;
        }
      } else if (log?.status === 'skipped') {
        // Skipped does not increment nor break
      } else {
        if (isTimesPerWeek) {
          const isCurrentWeek = dateStr >= currentWeekStartStr;
          const metQuota = getWeekEligibleCount(dateStr) >= targetPerWeek;
          if (isCurrentWeek || metQuota) {
            // Do not break
          } else {
            currentRunningStreak = 0;
          }
        } else {
          // Only break if it's in the past; if it's today and incomplete, don't necessarily break running streak
          if (dateStr < todayStr) {
            currentRunningStreak = 0;
          }
        }
      }
    }

    curr = addDays(curr, 1);
  }

  return Math.max(bestStreak, calculateHabitStreak(habit, logsByDate, todayStr));
}

/**
 * Calculates Momentum Score (0–100%) for a single habit over the last 30 scheduled days.
 * Score_t = (Score_{t-1} * 0.92) + (Completed_t * 8)
 * Skipped days leave Score_t = Score_{t-1} unchanged.
 */
export function calculateHabitMomentum(
  habit: Habit,
  logsByDate: Map<string, HabitLog>,
  todayStr: string
): number {
  if (habit.archived === 1) return 0;

  const todayDate = parseISO(todayStr);
  const isTimesPerWeek = habit.frequencyType === 'times_per_week';
  const targetPerWeek = habit.timesPerWeek ?? 1;

  const weekCountsCache = new Map<string, number>();
  const getWeekCompletedCount = (dStr: string): number => {
    const { startStr } = getWeekBoundaries(dStr);
    const cached = weekCountsCache.get(startStr);
    if (cached !== undefined) return cached;

    let count = 0;
    const monday = parseISO(startStr);
    for (let i = 0; i < 7; i++) {
      const cur = format(addDays(monday, i), 'yyyy-MM-dd');
      const l = logsByDate.get(cur);
      if (l?.status === 'completed') {
        count++;
      }
    }
    weekCountsCache.set(startStr, count);
    return count;
  };

  const scheduledDays: string[] = [];

  // Collect the last 30 scheduled days (walking backward from today)
  for (let i = 0; i < 180 && scheduledDays.length < 30; i++) {
    const d = subDays(todayDate, i);
    const dateStr = format(d, 'yyyy-MM-dd');
    if (dateStr < habit.createdAt) break;

    if (isHabitScheduledForDate(habit, dateStr)) {
      scheduledDays.push(dateStr);
    }
  }

  if (scheduledDays.length === 0) return 0;

  // Process chronologically (from oldest to newest)
  scheduledDays.reverse();

  let score = 0;
  for (const dateStr of scheduledDays) {
    const log = logsByDate.get(dateStr);
    if (log?.status === 'skipped') {
      // Skipped leaves score unchanged
      continue;
    }
    if (log?.status === 'completed') {
      score = score * 0.92 + 8;
    } else if (isTimesPerWeek && getWeekCompletedCount(dateStr) >= targetPerWeek) {
      // Authorized rest day in a satisfied week leaves score unchanged
      continue;
    } else {
      score = score * 0.92;
    }
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Calculates global momentum across all active habits.
 * Evaluates the daily completion percentage for each of the last 30 days.
 */
export function calculateGlobalMomentum(
  habits: Habit[],
  allLogs: HabitLog[],
  todayStr: string
): number {
  const activeHabits = habits.filter((h) => h.archived === 0);
  if (activeHabits.length === 0) return 0;

  // Pre-index logs by composite key `${habitId}_${date}`
  const logMap = new Map<string, HabitLog>();
  for (const log of allLogs) {
    logMap.set(`${log.habitId}_${log.date}`, log);
  }

  const todayDate = parseISO(todayStr);
  const days: string[] = [];

  for (let i = 29; i >= 0; i--) {
    days.push(format(subDays(todayDate, i), 'yyyy-MM-dd'));
  }

  let score = 0;
  for (const dateStr of days) {
    let scheduledCount = 0;
    let completedCount = 0;
    let skippedCount = 0;

    for (const habit of activeHabits) {
      if (habit.frequencyType === 'times_per_week') {
        const log = logMap.get(`${habit.id}_${dateStr}`);
        if (log?.status === 'completed') {
          scheduledCount++;
          completedCount++;
        } else if (log?.status === 'skipped') {
          scheduledCount++;
          skippedCount++;
        } else {
          // Check if week quota was met
          const { startStr } = getWeekBoundaries(dateStr);
          let weekCount = 0;
          const monday = parseISO(startStr);
          for (let d = 0; d < 7; d++) {
            const dStr = format(addDays(monday, d), 'yyyy-MM-dd');
            const l = logMap.get(`${habit.id}_${dStr}`);
            if (l?.status === 'completed') weekCount++;
          }
          if (weekCount >= (habit.timesPerWeek ?? 1)) {
            // Authorized rest day in satisfied week
            scheduledCount++;
            skippedCount++;
          } else {
            scheduledCount++;
          }
        }
      } else if (isHabitScheduledForDate(habit, dateStr)) {
        scheduledCount++;
        const log = logMap.get(`${habit.id}_${dateStr}`);
        if (log?.status === 'completed') {
          completedCount++;
        } else if (log?.status === 'skipped') {
          skippedCount++;
        }
      }
    }

    const effectiveScheduled = scheduledCount - skippedCount;
    if (effectiveScheduled <= 0) {
      continue;
    }

    const completionRate = completedCount / effectiveScheduled; // 0 to 1
    score = score * 0.92 + completionRate * 8;
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Calculates global current streak: consecutive days where 100% of scheduled habits were completed.
 */
export function calculateGlobalStreak(
  habits: Habit[],
  allLogs: HabitLog[],
  todayStr: string
): { currentStreak: number; bestStreak: number } {
  const activeHabits = habits.filter((h) => h.archived === 0);
  if (activeHabits.length === 0) return { currentStreak: 0, bestStreak: 0 };

  const logMap = new Map<string, HabitLog>();
  for (const log of allLogs) {
    logMap.set(`${log.habitId}_${log.date}`, log);
  }

  const isDayFullyCompleted = (dateStr: string): boolean | null => {
    let scheduled = 0;
    let completed = 0;

    for (const h of activeHabits) {
      if (h.frequencyType === 'times_per_week') {
        const log = logMap.get(`${h.id}_${dateStr}`);
        if (log?.status === 'completed' || log?.status === 'skipped') {
          scheduled++;
          completed++;
        } else {
          // Check if week quota was met for the week containing dateStr
          const { startStr } = getWeekBoundaries(dateStr);
          let weekCount = 0;
          const monday = parseISO(startStr);
          for (let d = 0; d < 7; d++) {
            const dStr = format(addDays(monday, d), 'yyyy-MM-dd');
            const l = logMap.get(`${h.id}_${dStr}`);
            if (l?.status === 'completed') weekCount++;
          }
          if (weekCount >= (h.timesPerWeek ?? 1)) {
            // Authorized rest day in satisfied week: does not block full day completion
          } else {
            scheduled++;
          }
        }
      } else if (isHabitScheduledForDate(h, dateStr)) {
        scheduled++;
        const l = logMap.get(`${h.id}_${dateStr}`);
        if (l?.status === 'completed' || l?.status === 'skipped') {
          completed++;
        }
      }
    }

    if (scheduled === 0) return null; // No habits scheduled
    return completed === scheduled;
  };

  const todayDate = parseISO(todayStr);
  let currentStreak = 0;

  // Check today
  const todayStatus = isDayFullyCompleted(todayStr);
  const startOffset = 1;
  if (todayStatus === true) {
    currentStreak += 1;
  }
  // Grace rule for today: if today is false or null, we start counting from yesterday

  for (let i = startOffset; i < 365; i++) {
    const dateStr = format(subDays(todayDate, i), 'yyyy-MM-dd');
    const status = isDayFullyCompleted(dateStr);
    if (status === null) continue; // unscheduled day
    if (status === true) {
      currentStreak += 1;
    } else {
      break;
    }
  }

  // Best streak over past 180 days
  let bestStreak = currentStreak;
  let run = 0;
  for (let i = 180; i >= 0; i--) {
    const dateStr = format(subDays(todayDate, i), 'yyyy-MM-dd');
    const status = isDayFullyCompleted(dateStr);
    if (status === null) continue;
    if (status === true) {
      run++;
      if (run > bestStreak) bestStreak = run;
    } else {
      if (i > 0) run = 0; // Don't break if today is incomplete
    }
  }

  return { currentStreak, bestStreak };
}

export interface HeatmapCell {
  dateStr: string;
  level: 0 | 1 | 2 | 3; // 0 = 0%, 1 = 1-49%, 2 = 50-99%, 3 = 100%
  completionRate: number; // 0 to 100
  completedCount: number;
  scheduledCount: number;
}

/**
 * Generate 18-week (or 12-week on mobile) heatmap data grid.
 * Grid is arranged in columns of weeks, each containing 7 days (Mon to Sun).
 */
export function generateHeatmapGrid(
  habits: Habit[],
  allLogs: HabitLog[],
  todayStr: string,
  weeksCount = 18
): HeatmapCell[][] {
  const activeHabits = habits.filter((h) => h.archived === 0);
  const logMap = new Map<string, HabitLog>();
  for (const log of allLogs) {
    logMap.set(`${log.habitId}_${log.date}`, log);
  }

  const todayDate = parseISO(todayStr);
  // We want the current week to be the rightmost column
  // Let week start on Monday (1)
  const currentDayOfWeek = (getDay(todayDate) + 6) % 7; // 0 for Mon ... 6 for Sun
  // Starting day is (7 - currentDayOfWeek) days ago
  const daysFromEndOfWeek = 6 - currentDayOfWeek;
  const gridEndDate = addDays(todayDate, daysFromEndOfWeek); // Upcoming Sunday

  const weeks: HeatmapCell[][] = [];

  for (let w = weeksCount - 1; w >= 0; w--) {
    const weekDays: HeatmapCell[] = [];
    for (let d = 0; d < 7; d++) {
      const daysAgo = w * 7 + (6 - d);
      const cellDate = subDays(gridEndDate, daysAgo);
      const cellDateStr = format(cellDate, 'yyyy-MM-dd');

      let scheduled = 0;
      let completed = 0;

      for (const h of activeHabits) {
        if (isHabitScheduledForDate(h, cellDateStr)) {
          scheduled++;
          const l = logMap.get(`${h.id}_${cellDateStr}`);
          if (l?.status === 'completed') {
            completed++;
          }
        }
      }

      let rate = 0;
      let level: 0 | 1 | 2 | 3 = 0;

      if (scheduled > 0) {
        rate = Math.round((completed / scheduled) * 100);
        if (rate === 0) level = 0;
        else if (rate < 50) level = 1;
        else if (rate < 100) level = 2;
        else level = 3;
      }

      weekDays.push({
        dateStr: cellDateStr,
        level,
        completionRate: rate,
        completedCount: completed,
        scheduledCount: scheduled,
      });
    }
    weeks.push(weekDays);
  }

  return weeks;
}

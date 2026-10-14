import {
  format,
  subHours,
  subDays,
  addDays,
  parseISO,
  getDay,
  startOfWeek,
  endOfWeek,
  isSameDay,
  isBefore,
  isAfter,
} from 'date-fns';
import type { Habit } from '@/db/db';

/**
 * Returns today's logical date taking into account the dayResetHour (e.g. 4 AM rollover).
 * E.g., if local time is Tuesday 1:30 AM and reset hour is 4, logical today is Monday.
 */
export function getLogicalToday(dayResetHour = 4): string {
  return getLogicalDate(new Date(), dayResetHour);
}

/**
 * Converts a given Date instance into logical "yyyy-MM-dd" using the rollover hour.
 */
export function getLogicalDate(date: Date, dayResetHour = 4): string {
  const adjusted = subHours(date, dayResetHour);
  return format(adjusted, 'yyyy-MM-dd');
}

/**
 * Format date string (yyyy-MM-dd) to human readable string e.g. "Wednesday, Oct 14"
 */
export function formatDisplayDate(dateStr: string): string {
  const date = parseISO(dateStr);
  return format(date, 'EEEE, MMM d');
}

/**
 * Format date string to short label e.g. "Oct 14"
 */
export function formatShortDate(dateStr: string): string {
  const date = parseISO(dateStr);
  return format(date, 'MMM d');
}

export interface DayCardInfo {
  dateStr: string;
  dayLetter: string; // 'M', 'T', 'W', etc.
  dayNum: number; // 14
  isToday: boolean;
  dayName: string; // "Wed"
}

/**
 * Returns the 7-day strip: today + past 6 days, in chronological order (past to today).
 */
export function getSevenDayStrip(todayStr: string): DayCardInfo[] {
  const todayDate = parseISO(todayStr);
  const days: DayCardInfo[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = subDays(todayDate, i);
    const dateStr = format(d, 'yyyy-MM-dd');
    days.push({
      dateStr,
      dayLetter: format(d, 'EEEEE'), // Single letter: M, T, W...
      dayNum: d.getDate(),
      isToday: i === 0,
      dayName: format(d, 'EEE'),
    });
  }

  return days;
}

/**
 * Checks whether a habit is scheduled for a given date.
 */
export function isHabitScheduledForDate(habit: Habit, dateStr: string): boolean {
  if (habit.archived === 1) return false;
  if (habit.createdAt > dateStr) return false;

  if (habit.frequencyType === 'daily') {
    return true;
  }

  if (habit.frequencyType === 'specific_days') {
    const date = parseISO(dateStr);
    const dayOfWeek = getDay(date); // 0 (Sun) to 6 (Sat)
    return habit.daysOfWeek ? habit.daysOfWeek.includes(dayOfWeek) : true;
  }

  if (habit.frequencyType === 'times_per_week') {
    // According to spec 4.2:
    // frequencyType === 'times_per_week': Always show in the list
    // (with a small badge like 2/3 this week), dimming once the weekly quota is met.
    return true;
  }

  return true;
}

/**
 * Return date range string for the week of dateStr (Monday to Sunday)
 */
export function getWeekBoundaries(dateStr: string): { startStr: string; endStr: string } {
  const date = parseISO(dateStr);
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return {
    startStr: format(start, 'yyyy-MM-dd'),
    endStr: format(end, 'yyyy-MM-dd'),
  };
}

/**
 * Helpers for step navigation
 */
export function getPreviousDay(dateStr: string): string {
  return format(subDays(parseISO(dateStr), 1), 'yyyy-MM-dd');
}

export function getNextDay(dateStr: string): string {
  return format(addDays(parseISO(dateStr), 1), 'yyyy-MM-dd');
}

export { isBefore, isAfter, isSameDay, parseISO, format, subDays, addDays };

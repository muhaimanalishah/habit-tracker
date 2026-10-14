import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Habit } from '@/db/db';
import { getLogicalToday, getPreviousDay, getNextDay } from '@/lib/dates';
import { initializeDatabaseIfNeeded } from '@/db/seed';

export type TimeFilter = 'all' | 'morning' | 'afternoon' | 'evening';
export type MobileTab = 'today' | 'insights';

interface UIContextType {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  todayStr: string;
  dayResetHour: number;
  timeFilter: TimeFilter;
  setTimeFilter: (filter: TimeFilter) => void;
  mobileTab: MobileTab;
  setMobileTab: (tab: MobileTab) => void;

  // Modals / Sheets
  isNewHabitOpen: boolean;
  openNewHabit: () => void;
  closeNewHabit: () => void;

  editingHabit: Habit | null;
  openEditHabit: (habit: Habit) => void;
  closeEditHabit: () => void;

  viewingHabit: Habit | null;
  openViewingHabit: (habit: Habit) => void;
  closeViewingHabit: () => void;

  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;

  // Shortcuts
  jumpToToday: () => void;
  goToPreviousDay: () => void;
  goToNextDay: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  // Read settings from Dexie
  const settings = useLiveQuery(() => db.settings.get('user_settings'));
  const dayResetHour = settings?.dayResetHour ?? 4;

  const todayStr = useMemo(() => getLogicalToday(dayResetHour), [dayResetHour]);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Sync selectedDate whenever logical todayStr changes (e.g. rollover hour change)
  const [prevTodayStr, setPrevTodayStr] = useState(todayStr);
  if (prevTodayStr !== todayStr) {
    setPrevTodayStr(todayStr);
    setSelectedDate(todayStr);
  }
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [mobileTab, setMobileTab] = useState<MobileTab>('today');

  const [isNewHabitOpen, setIsNewHabitOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [viewingHabit, setViewingHabit] = useState<Habit | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Initialize DB with seed habits if empty
  useEffect(() => {
    initializeDatabaseIfNeeded();
  }, []);


  const openNewHabit = useCallback(() => setIsNewHabitOpen(true), []);
  const closeNewHabit = useCallback(() => setIsNewHabitOpen(false), []);

  const openEditHabit = useCallback((habit: Habit) => {
    setViewingHabit(null);
    setEditingHabit(habit);
  }, []);
  const closeEditHabit = useCallback(() => setEditingHabit(null), []);

  const openViewingHabit = useCallback((habit: Habit) => setViewingHabit(habit), []);
  const closeViewingHabit = useCallback(() => setViewingHabit(null), []);

  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);

  const jumpToToday = useCallback(() => setSelectedDate(todayStr), [todayStr]);
  const goToPreviousDay = useCallback(() => {
    setSelectedDate((curr) => getPreviousDay(curr));
  }, []);
  const goToNextDay = useCallback(() => {
    setSelectedDate((curr) => {
      const next = getNextDay(curr);
      // Can go up to today or future if desired, but spec says:
      // "] or ArrowRight: Move selectedDate forward 1 day (up to today)"
      if (next > todayStr) return curr;
      return next;
    });
  }, [todayStr]);

  const value = useMemo(
    () => ({
      selectedDate,
      setSelectedDate,
      todayStr,
      dayResetHour,
      timeFilter,
      setTimeFilter,
      mobileTab,
      setMobileTab,
      isNewHabitOpen,
      openNewHabit,
      closeNewHabit,
      editingHabit,
      openEditHabit,
      closeEditHabit,
      viewingHabit,
      openViewingHabit,
      closeViewingHabit,
      isSettingsOpen,
      openSettings,
      closeSettings,
      jumpToToday,
      goToPreviousDay,
      goToNextDay,
    }),
    [
      selectedDate,
      todayStr,
      dayResetHour,
      timeFilter,
      mobileTab,
      isNewHabitOpen,
      openNewHabit,
      closeNewHabit,
      editingHabit,
      openEditHabit,
      closeEditHabit,
      viewingHabit,
      openViewingHabit,
      closeViewingHabit,
      isSettingsOpen,
      openSettings,
      closeSettings,
      jumpToToday,
      goToPreviousDay,
      goToNextDay,
    ]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}

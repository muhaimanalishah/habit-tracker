import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Habit, type HabitLog } from '@/db/db';
import { UIProvider, useUI } from '@/context/UIContext';
import { isHabitScheduledForDate } from '@/lib/dates';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { HeaderBar } from '@/components/dashboard/HeaderBar';
import { SevenDayStrip } from '@/components/dashboard/SevenDayStrip';
import { HabitList } from '@/components/dashboard/HabitList';
import { OverviewPanel } from '@/components/dashboard/OverviewPanel';
import { HabitFormSheet } from '@/components/modals/HabitFormSheet';
import { HabitDetailSheet } from '@/components/modals/HabitDetailSheet';
import { SettingsModal } from '@/components/modals/SettingsModal';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { SplashScreen } from '@/components/layout/SplashScreen';

interface DashboardViewProps {
  habits: Habit[];
  logs: HabitLog[];
}

function DashboardView({ habits, logs }: DashboardViewProps) {
  const { selectedDate, mobileTab, timeFilter } = useUI();

  // Active habits
  const activeHabits = useMemo(() => habits.filter((h) => h.archived === 0), [habits]);

  // Scheduled habits for selectedDate
  const scheduledHabits = useMemo(() => {
    return activeHabits
      .filter((h) => isHabitScheduledForDate(h, selectedDate))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [activeHabits, selectedDate]);

  // Visible habits according to timeFilter
  const visibleHabits = useMemo(() => {
    if (timeFilter === 'all') return scheduledHabits;
    return scheduledHabits.filter((h) => h.timeOfDay === timeFilter || h.timeOfDay === 'anytime');
  }, [scheduledHabits, timeFilter]);

  // Calculate completion count for HeaderBar
  const { completedCount, scheduledCount } = useMemo(() => {
    let comp = 0;
    for (const h of scheduledHabits) {
      const log = logs.find((l) => l.habitId === h.id && l.date === selectedDate);
      if (log?.status === 'completed') {
        comp++;
      }
    }
    return { completedCount: comp, scheduledCount: scheduledHabits.length };
  }, [scheduledHabits, logs, selectedDate]);

  // Attach global keyboard shortcuts (N, [, ], T, 1-9)
  useKeyboardShortcuts(visibleHabits);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors selection:bg-primary/20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-28 lg:pb-8">
        {/* Header Bar */}
        <HeaderBar
          completedCount={completedCount}
          totalScheduledCount={scheduledCount}
        />

        {/* Desktop Layout: 12 cols (7 cols Action Zone + 5 cols Overview Panel) */}
        <div className="hidden lg:grid grid-cols-12 gap-10 items-start">
          {/* Left Column (60% Action Zone) */}
          <main className="col-span-7">
            {/* 7-Day Strip */}
            <SevenDayStrip habits={habits} logs={logs} />

            {/* Habit List */}
            <HabitList habits={habits} logs={logs} />
          </main>

          {/* Right Column (40% Overview Panel) */}
          <aside className="col-span-5 sticky top-8">
            <OverviewPanel habits={habits} logs={logs} />
          </aside>
        </div>

        {/* Mobile / Tablet Layout (< 1024px) with Bottom Switcher */}
        <div className="lg:hidden">
          {mobileTab === 'today' ? (
            <main className="space-y-6">
              <SevenDayStrip habits={habits} logs={logs} />
              <HabitList habits={habits} logs={logs} />
            </main>
          ) : (
            <aside className="space-y-6">
              <OverviewPanel habits={habits} logs={logs} />
            </aside>
          )}
        </div>
      </div>

      {/* Mobile Floating Bottom Nav & FAB */}
      <MobileBottomNav />

      {/* Modals & Responsive Drawers */}
      <HabitFormSheet />
      <HabitDetailSheet />
      <SettingsModal />
    </div>
  );
}

function DashboardContent() {
  // Reactive Dexie queries
  const rawHabits = useLiveQuery(() => db.habits.toArray());
  const rawLogs = useLiveQuery(() => db.logs.toArray());

  // Show splash screen while loading data from IndexedDB
  if (rawHabits === undefined || rawLogs === undefined) {
    return <SplashScreen />;
  }

  return <DashboardView habits={rawHabits} logs={rawLogs} />;
}

export default function App() {
  return (
    <UIProvider>
      <DashboardContent />
    </UIProvider>
  );
}

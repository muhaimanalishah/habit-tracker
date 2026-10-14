import { useMemo } from 'react';
import type { Habit, HabitLog } from '@/db/db';
import { useUI } from '@/context/UIContext';
import { isHabitScheduledForDate } from '@/lib/dates';
import { calculateGlobalStreak, calculateGlobalMomentum } from '@/lib/stats';
import { ConsistencyHeatmap } from './ConsistencyHeatmap';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

interface OverviewPanelProps {
  habits: Habit[];
  logs: HabitLog[];
}

export function OverviewPanel({ habits, logs }: OverviewPanelProps) {
  const { todayStr, selectedDate } = useUI();

  // Active habits
  const activeHabits = useMemo(() => habits.filter((h) => h.archived === 0), [habits]);

  // Global Streaks
  const { currentStreak, bestStreak } = useMemo(() => {
    return calculateGlobalStreak(activeHabits, logs, todayStr);
  }, [activeHabits, logs, todayStr]);

  // Global Momentum
  const momentumScore = useMemo(() => {
    return calculateGlobalMomentum(activeHabits, logs, todayStr);
  }, [activeHabits, logs, todayStr]);

  // Progress for the active selectedDate
  const { scheduledCount, completedCount, percentage } = useMemo(() => {
    let sched = 0;
    let comp = 0;

    for (const h of activeHabits) {
      if (isHabitScheduledForDate(h, selectedDate)) {
        sched++;
        const log = logs.find((l) => l.habitId === h.id && l.date === selectedDate);
        if (log?.status === 'completed') {
          comp++;
        }
      }
    }

    const pct = sched > 0 ? Math.round((comp / sched) * 100) : 0;
    return { scheduledCount: sched, completedCount: comp, percentage: pct };
  }, [activeHabits, logs, selectedDate]);

  const isToday = selectedDate === todayStr;

  return (
    <div className="space-y-6">
      {/* Card 1: Daily Summary & Key Metrics */}
      <div className="rounded-xl border border-border bg-card text-card-foreground p-6 shadow-xs">
        {/* Top Section: Immediate Scannable Status */}
        <div className="flex items-baseline justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-foreground">
                {completedCount} of {scheduledCount}
              </span>
              <span className="text-sm text-muted-foreground font-medium">
                {isToday ? 'completed today' : 'completed'}
              </span>
            </div>
          </div>
          <span className="text-2xl font-semibold text-foreground tracking-tight">
            {percentage}%
          </span>
        </div>

        {/* Standard Shadcn Progress bar */}
        <Progress value={percentage} className="h-2 mt-3" />

        {/* Clean Separator */}
        <Separator className="my-5" />

        {/* Bottom Section: 3-column clean stat strip, no inner boxes or emoji circles */}
        <div className="grid grid-cols-3 divide-x divide-border">
          {/* Column 1 */}
          <div className="pr-4">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block">
              Current Streak
            </span>
            <div className="text-2xl font-bold text-foreground mt-1 tracking-tight">
              {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
            </div>
          </div>

          {/* Column 2 */}
          <div className="px-4 sm:px-6">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block">
              Momentum
            </span>
            <div className="text-2xl font-bold text-foreground mt-1 tracking-tight">
              {momentumScore}%
            </div>
          </div>

          {/* Column 3 */}
          <div className="pl-4 sm:pl-6">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block">
              Best Streak
            </span>
            <div className="text-2xl font-bold text-foreground mt-1 tracking-tight">
              {bestStreak} {bestStreak === 1 ? 'day' : 'days'}
            </div>
          </div>
        </div>
      </div>

      {/* Card 2: Consistency Heatmap */}
      <ConsistencyHeatmap habits={habits} logs={logs} />
    </div>
  );
}

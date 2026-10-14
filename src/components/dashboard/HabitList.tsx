import React, { useMemo } from 'react';
import type { Habit, HabitLog } from '@/db/db';
import { useUI } from '@/context/UIContext';
import { isHabitScheduledForDate, getWeekBoundaries } from '@/lib/dates';
import { calculateHabitStreak } from '@/lib/stats';
import { moveHabitOrder } from '@/db/actions';
import { HabitCard } from './HabitCard';
import { Button } from '@/components/ui/button';
import { Plus, CheckCircle2, Sun, Sunset, Moon, Sparkles } from 'lucide-react';

interface HabitListProps {
  habits: Habit[];
  logs: HabitLog[];
}

export function HabitList({ habits, logs }: HabitListProps) {
  const { selectedDate, todayStr, timeFilter, openNewHabit } = useUI();

  // Index logs by `${habitId}_${date}`
  const logMap = useMemo(() => {
    const map = new Map<string, HabitLog>();
    for (const log of logs) {
      map.set(`${log.habitId}_${log.date}`, log);
    }
    return map;
  }, [logs]);

  // Index logs by habitId -> (date -> HabitLog) for streak calculation
  const habitLogsMap = useMemo(() => {
    const map = new Map<string, Map<string, HabitLog>>();
    for (const log of logs) {
      let sub = map.get(log.habitId);
      if (!sub) {
        sub = new Map<string, HabitLog>();
        map.set(log.habitId, sub);
      }
      sub.set(log.date, log);
    }
    return map;
  }, [logs]);

  // Weekly boundaries for selectedDate
  const { startStr, endStr } = useMemo(
    () => getWeekBoundaries(selectedDate),
    [selectedDate]
  );

  // Weekly completed counts for each habit
  const weeklyCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const log of logs) {
      if (log.date >= startStr && log.date <= endStr && log.status === 'completed') {
        counts.set(log.habitId, (counts.get(log.habitId) || 0) + 1);
      }
    }
    return counts;
  }, [logs, startStr, endStr]);

  // Filter habits scheduled for selectedDate
  const scheduledHabits = useMemo(() => {
    return habits
      .filter((h) => h.archived === 0)
      .filter((h) => isHabitScheduledForDate(h, selectedDate))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [habits, selectedDate]);

  // Apply timeOfDay filter
  const visibleHabits = useMemo(() => {
    if (timeFilter === 'all') return scheduledHabits;
    return scheduledHabits.filter((h) => h.timeOfDay === timeFilter || h.timeOfDay === 'anytime');
  }, [scheduledHabits, timeFilter]);

  // If timeFilter is 'all', group by time of day
  const groupedHabits = useMemo(() => {
    if (timeFilter !== 'all') return null;

    const groups: {
      key: 'morning' | 'afternoon' | 'evening' | 'anytime';
      title: string;
      icon: React.ReactNode;
      items: Habit[];
    }[] = [
      {
        key: 'morning',
        title: 'Morning',
        icon: <Sun className="w-4 h-4 text-amber-500" />,
        items: [],
      },
      {
        key: 'afternoon',
        title: 'Afternoon',
        icon: <Sparkles className="w-4 h-4 text-orange-500" />,
        items: [],
      },
      {
        key: 'evening',
        title: 'Evening',
        icon: <Sunset className="w-4 h-4 text-purple-500" />,
        items: [],
      },
      {
        key: 'anytime',
        title: 'Anytime',
        icon: <Moon className="w-4 h-4 text-blue-500" />,
        items: [],
      },
    ];

    for (const habit of scheduledHabits) {
      const g = groups.find((item) => item.key === habit.timeOfDay) || groups[3];
      g.items.push(habit);
    }

    return groups.filter((g) => g.items.length > 0);
  }, [scheduledHabits, timeFilter]);

  if (visibleHabits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-dashed border-border/80 bg-card/40">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3 text-muted-foreground">
          <CheckCircle2 className="w-6 h-6 stroke-[1.5]" />
        </div>
        <h3 className="font-semibold text-foreground text-base">No habits scheduled</h3>
        <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-5">
          {timeFilter === 'all'
            ? 'You have no active habits scheduled for this day.'
            : `No habits scheduled for ${timeFilter} on this day.`}
        </p>
        <Button onClick={openNewHabit} size="sm" className="gap-1.5 shadow-xs">
          <Plus className="w-4 h-4" />
          Create New Habit
        </Button>
      </div>
    );
  }

  // Render grouped view if 'all' filter is active
  if (timeFilter === 'all' && groupedHabits) {
    return (
      <div className="space-y-6">
        {groupedHabits.map((group) => (
          <div key={group.key} className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
              {group.icon}
              <span>{group.title}</span>
              <span className="text-[10px] text-muted-foreground/60 font-normal">
                ({group.items.length})
              </span>
            </div>

            <div className="space-y-2.5">
              {group.items.map((habit, index) => {
                const log = logMap.get(`${habit.id}_${selectedDate}`);
                const hLogs = habitLogsMap.get(habit.id) || new Map();
                const streak = calculateHabitStreak(habit, hLogs, todayStr);
                const weeklyDone = weeklyCounts.get(habit.id) || 0;

                return (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    log={log}
                    streak={streak}
                    canMoveUp={index > 0}
                    canMoveDown={index < group.items.length - 1}
                    onMoveUp={() => moveHabitOrder(habit.id, 'up', group.items)}
                    onMoveDown={() => moveHabitOrder(habit.id, 'down', group.items)}
                    weeklyProgress={
                      habit.frequencyType === 'times_per_week'
                        ? { completedDays: weeklyDone, target: habit.timesPerWeek || 1 }
                        : undefined
                    }
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Render flat stack if a specific time of day is filtered
  return (
    <div className="space-y-2.5">
      {visibleHabits.map((habit, index) => {
        const log = logMap.get(`${habit.id}_${selectedDate}`);
        const hLogs = habitLogsMap.get(habit.id) || new Map();
        const streak = calculateHabitStreak(habit, hLogs, todayStr);
        const weeklyDone = weeklyCounts.get(habit.id) || 0;

        return (
          <HabitCard
            key={habit.id}
            habit={habit}
            log={log}
            streak={streak}
            canMoveUp={index > 0}
            canMoveDown={index < visibleHabits.length - 1}
            onMoveUp={() => moveHabitOrder(habit.id, 'up', visibleHabits)}
            onMoveDown={() => moveHabitOrder(habit.id, 'down', visibleHabits)}
            weeklyProgress={
              habit.frequencyType === 'times_per_week'
                ? { completedDays: weeklyDone, target: habit.timesPerWeek || 1 }
                : undefined
            }
          />
        );
      })}
    </div>
  );
}

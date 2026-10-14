import { useMemo } from 'react';
import { useUI } from '@/context/UIContext';
import { getSevenDayStrip } from '@/lib/dates';
import type { Habit, HabitLog } from '@/db/db';
import { isHabitScheduledForDate } from '@/lib/dates';
import { Check } from 'lucide-react';

interface SevenDayStripProps {
  habits: Habit[];
  logs: HabitLog[];
}

export function SevenDayStrip({ habits, logs }: SevenDayStripProps) {
  const { todayStr, selectedDate, setSelectedDate } = useUI();

  const days = useMemo(() => getSevenDayStrip(todayStr), [todayStr]);

  // Index logs by date
  const logsByDate = useMemo(() => {
    const map = new Map<string, HabitLog[]>();
    for (const log of logs) {
      const list = map.get(log.date) || [];
      list.push(log);
      map.set(log.date, list);
    }
    return map;
  }, [logs]);

  // Active habits
  const activeHabits = useMemo(() => habits.filter((h) => h.archived === 0), [habits]);

  return (
    <div className="grid grid-cols-7 gap-2 mb-6">
      {days.map((day) => {
        const isSelected = day.dateStr === selectedDate;
        const dayLogs = logsByDate.get(day.dateStr) || [];

        // Calculate completion status for this day
        let scheduledCount = 0;
        let completedCount = 0;

        for (const habit of activeHabits) {
          if (isHabitScheduledForDate(habit, day.dateStr)) {
            scheduledCount++;
            const l = dayLogs.find((item) => item.habitId === habit.id);
            if (l?.status === 'completed') {
              completedCount++;
            }
          }
        }

        const isFullyCompleted = scheduledCount > 0 && completedCount === scheduledCount;

        return (
          <button
            key={day.dateStr}
            type="button"
            onClick={() => setSelectedDate(day.dateStr)}
            className={`group relative flex flex-col items-center justify-between py-3 px-1 rounded-xl border transition-all text-center cursor-pointer ${
              isSelected
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-card text-card-foreground border-border hover:border-foreground/20 hover:bg-muted/30'
            }`}
          >
            <span
              className={`text-[11px] font-semibold uppercase tracking-wider ${
                isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
              }`}
            >
              {day.isToday ? 'Today' : day.dayName}
            </span>

            <span className="text-lg font-bold my-1 tracking-tight">{day.dayNum}</span>

            {/* Clean unmistakable completion indicator */}
            <div className="h-4 flex items-center justify-center">
              {isFullyCompleted ? (
                <Check
                  className={`w-3.5 h-3.5 stroke-[3] ${
                    isSelected ? 'text-primary-foreground' : 'text-primary'
                  }`}
                />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full opacity-0" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

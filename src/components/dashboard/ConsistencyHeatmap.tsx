import { useMemo, useState } from 'react';
import type { Habit, HabitLog } from '@/db/db';
import { useUI } from '@/context/UIContext';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { generateHeatmapGrid, type HeatmapCell } from '@/lib/stats';
import { formatShortDate } from '@/lib/dates';

interface ConsistencyHeatmapProps {
  habits: Habit[];
  logs: HabitLog[];
}

const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];

export function ConsistencyHeatmap({ habits, logs }: ConsistencyHeatmapProps) {
  const { todayStr, selectedDate, setSelectedDate } = useUI();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);

  // 18 weeks on desktop, 12 weeks on mobile
  const weeksCount = isDesktop ? 18 : 12;

  const weeksGrid = useMemo(() => {
    return generateHeatmapGrid(habits, logs, todayStr, weeksCount);
  }, [habits, logs, todayStr, weeksCount]);

  const getCellColorClass = (cell: HeatmapCell) => {
    if (cell.scheduledCount === 0) {
      return 'bg-muted/40 border-border/30';
    }
    switch (cell.level) {
      case 3:
        return 'bg-emerald-500 border-emerald-600 dark:bg-emerald-500 shadow-2xs';
      case 2:
        return 'bg-emerald-500/65 border-emerald-500/40';
      case 1:
        return 'bg-emerald-500/30 border-emerald-500/30';
      case 0:
      default:
        return 'bg-muted border-border/60';
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground p-6 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-sm text-foreground">Consistency Heatmap</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Past {weeksCount} weeks of habit execution
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span>Less</span>
          <span className="w-2.5 h-2.5 rounded-[3px] bg-muted border border-border/60" />
          <span className="w-2.5 h-2.5 rounded-[3px] bg-emerald-500/30" />
          <span className="w-2.5 h-2.5 rounded-[3px] bg-emerald-500/65" />
          <span className="w-2.5 h-2.5 rounded-[3px] bg-emerald-500" />
          <span>More</span>
        </div>
      </div>

      {/* Grid Container: stretches full width */}
      <div className="flex gap-2 items-start w-full">
        {/* Day labels column */}
        <div className="flex flex-col gap-1.5 pr-1 select-none pt-0.5 shrink-0">
          {DAY_LABELS.map((label, idx) => (
            <div
              key={idx}
              className="h-3 w-5 text-[9px] font-medium text-muted-foreground/70 flex items-center leading-none"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Full width CSS Grid for weeks */}
        <div
          className={`flex-1 grid gap-1.5 ${
            isDesktop
              ? 'grid-cols-[repeat(18,minmax(0,1fr))]'
              : 'grid-cols-[repeat(12,minmax(0,1fr))]'
          }`}
        >
          {weeksGrid.map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col gap-1.5">
              {week.map((cell) => {
                const isSelected = cell.dateStr === selectedDate;
                const isToday = cell.dateStr === todayStr;

                return (
                  <button
                    key={cell.dateStr}
                    type="button"
                    onClick={() => setSelectedDate(cell.dateStr)}
                    onMouseEnter={() => setHoveredCell(cell)}
                    onMouseLeave={() => setHoveredCell(null)}
                    aria-label={`${cell.dateStr}: ${cell.completedCount}/${cell.scheduledCount} completed`}
                    className={`aspect-square w-full rounded-[4px] border transition-transform cursor-pointer relative ${getCellColorClass(
                      cell
                    )} ${
                      isSelected
                        ? 'ring-2 ring-primary ring-offset-1 ring-offset-background scale-110 z-10'
                        : isToday
                        ? 'ring-1 ring-foreground ring-offset-1 ring-offset-background'
                        : 'hover:scale-110'
                    }`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Hover Info bar */}
      <div className="mt-3.5 text-xs text-muted-foreground min-h-[1.25rem] flex items-center">
        {hoveredCell ? (
          <span>
            <strong className="text-foreground">{formatShortDate(hoveredCell.dateStr)}</strong>:{' '}
            {hoveredCell.scheduledCount === 0 ? (
              'No habits scheduled'
            ) : (
              <>
                {hoveredCell.completedCount} of {hoveredCell.scheduledCount} completed (
                {hoveredCell.completionRate}%)
              </>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground/60 text-[11px]">
            Hover or tap any square to inspect and jump to that day
          </span>
        )}
      </div>
    </div>
  );
}

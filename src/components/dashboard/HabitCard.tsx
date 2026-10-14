import React from 'react';
import type { Habit, HabitLog } from '@/db/db';
import { useUI } from '@/context/UIContext';
import { toggleHabit, incrementHabit, toggleSkipHabit } from '@/db/actions';
import { getColorDetails, HabitIcon } from '@/lib/icons';
import { Check, Plus, Flame, FastForward, Undo2, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HabitCardProps {
  habit: Habit;
  log?: HabitLog;
  streak: number;
  weeklyProgress?: { completedDays: number; target: number };
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function HabitCard({
  habit,
  log,
  streak,
  weeklyProgress,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: HabitCardProps) {
  const { selectedDate, openViewingHabit } = useUI();

  const color = getColorDetails(habit.color);
  const status = log?.status;
  const isCompleted = status === 'completed';
  const isSkipped = status === 'skipped';
  const currentValue = log?.value ?? 0;

  // Handle Binary toggle
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleHabit(habit, selectedDate);
  };

  // Handle Quantitative increment
  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    incrementHabit(habit, selectedDate);
  };

  // Handle Skip toggle
  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSkipHabit(habit, selectedDate);
  };

  const weeklyQuotaMet =
    habit.frequencyType === 'times_per_week' &&
    weeklyProgress &&
    weeklyProgress.completedDays >= weeklyProgress.target;

  return (
    <div
      onClick={() => openViewingHabit(habit)}
      className={`group relative p-4 rounded-xl border transition-colors flex items-center justify-between gap-4 cursor-pointer select-none shadow-xs ${
        isCompleted
          ? 'bg-muted/40 border-border/60 hover:border-border'
          : isSkipped
          ? 'bg-muted/20 border-dashed border-border/60 opacity-60'
          : 'bg-card border-border hover:border-foreground/20'
      }`}
    >
      {/* Left Zone: Icon & Info */}
      <div
        className={`flex items-center gap-3.5 min-w-0 flex-1 transition-opacity ${
          isCompleted ? 'opacity-60' : ''
        }`}
      >
        {/* Clean Icon Box: bg-muted, subtle /10 tint, no heavy border */}
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color.bgClass} ${color.textClass}`}
        >
          <HabitIcon name={habit.icon} className="w-5 h-5" />
        </div>

        {/* Title & Subtitle */}
        <div className="flex flex-col min-w-0">
          <h3
            className={`text-base font-medium truncate transition-colors ${
              isCompleted
                ? 'line-through text-muted-foreground'
                : isSkipped
                ? 'line-through text-muted-foreground'
                : 'text-foreground'
            }`}
          >
            {habit.title}
          </h3>

          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
            <span className="capitalize">{habit.timeOfDay}</span>

            {/* Times per week badge */}
            {habit.frequencyType === 'times_per_week' && weeklyProgress && (
              <>
                <span>•</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${
                    weeklyQuotaMet
                      ? 'bg-muted text-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {weeklyProgress.completedDays}/{weeklyProgress.target} this week
                </span>
              </>
            )}

            {/* Streak flame */}
            {streak > 0 && (
              <>
                <span>•</span>
                <span className="inline-flex items-center gap-0.5 text-amber-500 font-medium">
                  <Flame className="w-3.5 h-3.5 fill-amber-500" />
                  {streak}
                </span>
              </>
            )}

            {isSkipped && (
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                Skipped
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right Zone: Controls */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Reordering Controls (Desktop Hover) */}
        {(onMoveUp || onMoveDown) && (
          <div
            className="items-center gap-0.5 opacity-0 group-hover:opacity-100 hidden sm:flex transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              disabled={!canMoveUp}
              onClick={onMoveUp}
              className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-20 rounded-md"
              title="Move Up"
              aria-label="Move Up"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={!canMoveDown}
              onClick={onMoveDown}
              className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-20 rounded-md"
              title="Move Down"
              aria-label="Move Down"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {/* Subtle desktop hover skip trigger / active unskip */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkip}
          className={`h-8 px-2 text-xs transition-opacity rounded-md flex items-center gap-1 ${
            isSkipped
              ? 'opacity-100 text-foreground bg-muted hover:bg-muted/80'
              : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground hidden sm:flex'
          }`}
          title={isSkipped ? 'Unskip habit' : 'Skip habit for today'}
        >
          {isSkipped ? (
            <>
              <Undo2 className="w-3.5 h-3.5" />
              <span>Unskip</span>
            </>
          ) : (
            <>
              <FastForward className="w-3.5 h-3.5" />
              <span>Skip</span>
            </>
          )}
        </Button>

        {/* Binary Habit Control */}
        {habit.type === 'binary' && (
          <button
            type="button"
            onClick={handleToggle}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              isCompleted
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'border border-input bg-background hover:bg-accent text-transparent hover:text-muted-foreground'
            }`}
            aria-label={isCompleted ? `Uncheck ${habit.title}` : `Complete ${habit.title}`}
          >
            <Check
              className={`w-4 h-4 transition-transform ${
                isCompleted ? 'text-primary-foreground stroke-[2.5]' : 'opacity-0'
              }`}
            />
          </button>
        )}

        {/* Quantitative Habit Control: Inline Counter Pill + Step Button */}
        {habit.type === 'quant' && (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {/* Inline progress counter pill on right side */}
            <span
              className={`px-2.5 py-1 text-xs font-medium rounded-md border ${
                isCompleted
                  ? 'bg-muted/60 text-muted-foreground border-border/60'
                  : 'bg-muted/40 text-foreground border-border'
              }`}
            >
              {currentValue} / {habit.targetValue} {habit.unit || ''}
            </span>

            {/* Clean 9x9 Action Button */}
            <button
              type="button"
              onClick={handleIncrement}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                isCompleted
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'border border-input bg-background hover:bg-accent text-foreground'
              }`}
              aria-label={`Add ${habit.stepValue} to ${habit.title}`}
            >
              {isCompleted ? (
                <Check className="w-4 h-4 text-primary-foreground stroke-[2.5]" />
              ) : (
                <Plus className="w-4 h-4 stroke-[2]" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

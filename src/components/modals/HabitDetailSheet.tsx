import { useMemo, useState } from 'react';
import { useUI } from '@/context/UIContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type HabitLog } from '@/db/db';
import {
  toggleHabit,
  incrementHabit,
  decrementHabit,
  toggleSkipHabit,
  saveHabitNote,
  moveHabitOrder,
} from '@/db/actions';
import {
  calculateHabitStreak,
  calculateHabitBestStreak,
  calculateHabitMomentum,
} from '@/lib/stats';
import { formatDisplayDate, subDays, format, parseISO } from '@/lib/dates';
import { ResponsiveSheet } from '@/components/ui/responsive-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { getColorDetails, HabitIcon } from '@/lib/icons';
import {
  Edit2,
  Check,
  Plus,
  Minus,
  FastForward,
  Undo2,
  Calendar,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

interface DailyNoteInputProps {
  initialNote: string;
  onSave: (note: string) => void;
}

function DailyNoteInput({ initialNote, onSave }: DailyNoteInputProps) {
  const [val, setVal] = useState(initialNote);
  const [saved, setSaved] = useState(false);

  const handleBlurOrEnter = () => {
    if (val !== initialNote) {
      onSave(val);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="pt-2 border-t border-border/40 space-y-1.5">
      <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
        <span>Daily Note</span>
        {saved && (
          <span className="text-[10px] text-emerald-500 font-medium">
            ✓ Saved
          </span>
        )}
      </div>
      <Input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={handleBlurOrEnter}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          }
        }}
        placeholder="Add a quick note for this day (e.g. 60kg bench, Chapter 4)..."
        className="h-8 text-xs bg-background/50 border-input"
      />
    </div>
  );
}

export function HabitDetailSheet() {
  const {
    viewingHabit,
    closeViewingHabit,
    openEditHabit,
    selectedDate,
    todayStr,
  } = useUI();

  const habit = viewingHabit;
  const habitId = habit?.id;

  // Query logs for this specific habit
  const habitLogs = useLiveQuery(
    () => (habitId ? db.logs.where('habitId').equals(habitId).toArray() : []),
    [habitId]
  );

  // Query all active habits for reordering
  const rawActiveHabits = useLiveQuery(() => db.habits.where('archived').equals(0).toArray());
  const allActiveHabits = useMemo(() => rawActiveHabits ?? [], [rawActiveHabits]);

  const groupHabits = useMemo(() => {
    if (!habit) return [];
    return allActiveHabits
      .filter((h) => h.timeOfDay === habit.timeOfDay)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [allActiveHabits, habit]);

  const habitGroupIndex = groupHabits.findIndex((h) => h.id === habitId);
  const canMoveUp = habitGroupIndex > 0;
  const canMoveDown = habitGroupIndex !== -1 && habitGroupIndex < groupHabits.length - 1;

  const logsByDate = useMemo(() => {
    const map = new Map<string, HabitLog>();
    if (habitLogs) {
      for (const log of habitLogs) {
        map.set(log.date, log);
      }
    }
    return map;
  }, [habitLogs]);

  const currentLog = logsByDate.get(selectedDate);
  const isCompleted = currentLog?.status === 'completed';
  const isSkipped = currentLog?.status === 'skipped';
  const currentValue = currentLog?.value ?? 0;

  // Habit metrics
  const streak = useMemo(() => {
    if (!habit) return 0;
    return calculateHabitStreak(habit, logsByDate, todayStr);
  }, [habit, logsByDate, todayStr]);

  const bestStreak = useMemo(() => {
    if (!habit) return 0;
    return calculateHabitBestStreak(habit, logsByDate, todayStr);
  }, [habit, logsByDate, todayStr]);

  const momentum = useMemo(() => {
    if (!habit) return 0;
    return calculateHabitMomentum(habit, logsByDate, todayStr);
  }, [habit, logsByDate, todayStr]);

  // Past 14 days history strip
  const pastDays = useMemo(() => {
    const days: { dateStr: string; label: string; log?: HabitLog }[] = [];
    const base = parseISO(todayStr);
    for (let i = 13; i >= 0; i--) {
      const d = subDays(base, i);
      const dStr = format(d, 'yyyy-MM-dd');
      days.push({
        dateStr: dStr,
        label: format(d, 'd MMM'),
        log: logsByDate.get(dStr),
      });
    }
    return days;
  }, [logsByDate, todayStr]);

  if (!habit) return null;

  const color = getColorDetails(habit.color);

  return (
    <ResponsiveSheet
      open={Boolean(viewingHabit)}
      onOpenChange={(open) => !open && closeViewingHabit()}
    >
      <div className="space-y-6 pb-6">
        {/* Habit Header: mr-8 leaves room for absolute SheetClose X button */}
        <div className="flex items-start justify-between gap-4 mr-8">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${color.bgClass} ${color.textClass}`}
            >
              <HabitIcon name={habit.icon} className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-foreground truncate">{habit.title}</h2>
              <p className="text-xs text-muted-foreground capitalize mt-0.5">
                {habit.timeOfDay} •{' '}
                {habit.frequencyType === 'daily'
                  ? 'Daily'
                  : habit.frequencyType === 'specific_days'
                  ? 'Specific days'
                  : `${habit.timesPerWeek}x / week`}
                {habit.type === 'quant' && ` • Goal: ${habit.targetValue} ${habit.unit || ''}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              disabled={!canMoveUp}
              onClick={() => moveHabitOrder(habit.id, 'up', groupHabits)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-20 rounded-md"
              title="Move Up"
              aria-label="Move Up"
            >
              <ChevronUp className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={!canMoveDown}
              onClick={() => moveHabitOrder(habit.id, 'down', groupHabits)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-20 rounded-md"
              title="Move Down"
              aria-label="Move Down"
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openEditHabit(habit)}
              className="h-8 gap-1.5 text-xs rounded-md"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </Button>
          </div>
        </div>

        {/* Clean 3-column stats strip (matching OverviewPanel style) */}
        <div className="rounded-xl border border-border bg-card p-4 grid grid-cols-3 divide-x divide-border shadow-xs">
          <div className="pr-3 text-center">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block">
              Streak
            </span>
            <span className="text-xl font-bold text-foreground mt-0.5 block tracking-tight">
              {streak} {streak === 1 ? 'day' : 'days'}
            </span>
          </div>

          <div className="px-3 text-center">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block">
              Momentum
            </span>
            <span className="text-xl font-bold text-foreground mt-0.5 block tracking-tight">
              {momentum}%
            </span>
          </div>

          <div className="pl-3 text-center">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block">
              Best
            </span>
            <span className="text-xl font-bold text-foreground mt-0.5 block tracking-tight">
              {bestStreak} {bestStreak === 1 ? 'day' : 'days'}
            </span>
          </div>
        </div>

        {/* Selected Date Action Section */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-3 shadow-xs">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">
              {formatDisplayDate(selectedDate)}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                isCompleted
                  ? 'bg-muted text-foreground'
                  : isSkipped
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-muted/40 text-muted-foreground'
              }`}
            >
              {isCompleted ? 'Completed' : isSkipped ? 'Skipped' : 'Incomplete'}
            </span>
          </div>

          <Separator />

          {/* Quick actions for selected date */}
          {habit.type === 'binary' ? (
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant={isCompleted ? 'outline' : 'default'}
                onClick={() => toggleHabit(habit, selectedDate)}
                className="flex-1 h-9 rounded-md gap-2 font-medium"
              >
                <Check className="w-4 h-4" />
                {isCompleted ? 'Mark Incomplete' : 'Mark Completed'}
              </Button>

              <Button
                variant="ghost"
                onClick={() => toggleSkipHabit(habit, selectedDate)}
                className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground rounded-md"
                title={isSkipped ? 'Unskip' : 'Skip for today'}
              >
                {isSkipped ? (
                  <>
                    <Undo2 className="w-3.5 h-3.5 mr-1" /> Unskip
                  </>
                ) : (
                  <>
                    <FastForward className="w-3.5 h-3.5 mr-1" /> Skip
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Current progress:</span>
                <span className="font-semibold text-foreground">
                  {currentValue} / {habit.targetValue} {habit.unit || ''}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-md shrink-0"
                  onClick={() => decrementHabit(habit, selectedDate)}
                  disabled={currentValue <= 0}
                >
                  <Minus className="w-4 h-4" />
                </Button>

                <Button
                  variant="default"
                  onClick={() => incrementHabit(habit, selectedDate)}
                  className="flex-1 h-9 rounded-md gap-1.5 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add +{habit.stepValue} {habit.unit || ''}
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => toggleSkipHabit(habit, selectedDate)}
                  className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-md"
                >
                  {isSkipped ? 'Unskip' : 'Skip'}
                </Button>
              </div>
            </div>
          )}

          {/* Daily Micro-Note Area */}
          <DailyNoteInput
            key={`${habit.id}_${selectedDate}`}
            initialNote={currentLog?.note ?? ''}
            onSave={(noteText) => saveHabitNote(habit, selectedDate, noteText)}
          />
        </div>

        {/* Clean 14-day square grid matching heatmap style */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>Activity (Last 14 Days)</span>
          </div>

          <div className="grid grid-cols-7 gap-2 p-3 rounded-xl bg-card border border-border shadow-xs">
            {pastDays.map((item) => {
              const done = item.log?.status === 'completed';
              const skipped = item.log?.status === 'skipped';
              const hasNote = Boolean(item.log?.note);
              const isCellSelected = item.dateStr === selectedDate;

              return (
                <div
                  key={item.dateStr}
                  className={`flex flex-col items-center py-1.5 rounded-md ${
                    isCellSelected ? 'ring-1 ring-primary bg-muted/40' : ''
                  }`}
                  title={`${item.dateStr}: ${
                    done
                      ? 'Completed'
                      : skipped
                      ? 'Skipped'
                      : 'Incomplete'
                  }${item.log?.note ? ` • Note: ${item.log.note}` : ''}`}
                >
                  <span className="text-[10px] text-muted-foreground font-medium mb-1">
                    {item.label.split(' ')[0]}
                  </span>
                  <div
                    className={`aspect-square w-6 rounded-[4px] border flex items-center justify-center text-[10px] font-bold ${
                      done
                        ? 'bg-emerald-500 text-white border-emerald-600'
                        : skipped
                        ? 'bg-muted text-muted-foreground border-border/60'
                        : 'bg-muted/30 text-muted-foreground/40 border-border/40'
                    }`}
                  >
                    {done ? '✓' : skipped ? '—' : ''}
                  </div>
                  {hasNote && (
                    <div
                      className="w-1 h-1 rounded-full bg-primary mt-1"
                      title={item.log?.note}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ResponsiveSheet>
  );
}

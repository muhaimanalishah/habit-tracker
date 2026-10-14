import React, { useState } from 'react';
import { useUI } from '@/context/UIContext';
import {
  type Habit,
  type HabitType,
  type FrequencyType,
  type TimeOfDay,
} from '@/db/db';
import { saveHabit, setHabitArchived, deleteHabit } from '@/db/actions';
import { ResponsiveSheet } from '@/components/ui/responsive-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CURATED_ICONS,
  COLOR_OPTIONS,
  HabitIcon,
  getColorDetails,
} from '@/lib/icons';
import { Archive, Trash2, Check, AlertTriangle } from 'lucide-react';

const DAYS_OF_WEEK = [
  { label: 'S', day: 0, name: 'Sun' },
  { label: 'M', day: 1, name: 'Mon' },
  { label: 'T', day: 2, name: 'Tue' },
  { label: 'W', day: 3, name: 'Wed' },
  { label: 'T', day: 4, name: 'Thu' },
  { label: 'F', day: 5, name: 'Fri' },
  { label: 'S', day: 6, name: 'Sat' },
];

const TIME_OPTIONS: { label: string; value: TimeOfDay }[] = [
  { label: 'Anytime', value: 'anytime' },
  { label: 'Morning', value: 'morning' },
  { label: 'Afternoon', value: 'afternoon' },
  { label: 'Evening', value: 'evening' },
];

interface HabitFormContentProps {
  editingHabit: Habit | null;
  todayStr: string;
  onClose: () => void;
}

function HabitFormContent({
  editingHabit,
  todayStr,
  onClose,
}: HabitFormContentProps) {
  const isEditing = Boolean(editingHabit);

  // Initialize form state directly from props
  const [title, setTitle] = useState(() => editingHabit?.title ?? '');
  const [icon, setIcon] = useState(() => editingHabit?.icon ?? 'Sparkles');
  const [color, setColor] = useState(() => editingHabit?.color ?? 'emerald');
  const [type, setType] = useState<HabitType>(() => editingHabit?.type ?? 'binary');
  const [targetValue, setTargetValue] = useState<number>(() => editingHabit?.targetValue ?? 1);
  const [stepValue, setStepValue] = useState<number>(() => editingHabit?.stepValue ?? 1);
  const [unit, setUnit] = useState(() => editingHabit?.unit ?? '');
  const [frequencyType, setFrequencyType] = useState<FrequencyType>(
    () => editingHabit?.frequencyType ?? 'daily'
  );
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(
    () => editingHabit?.daysOfWeek ?? [1, 2, 3, 4, 5]
  );
  const [timesPerWeek, setTimesPerWeek] = useState<number>(
    () => editingHabit?.timesPerWeek ?? 3
  );
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(
    () => editingHabit?.timeOfDay ?? 'morning'
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleToggleDay = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day)
        ? prev.length > 1
          ? prev.filter((d) => d !== day)
          : prev
        : [...prev, day].sort()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const habitData: Habit = {
      id: editingHabit ? editingHabit.id : crypto.randomUUID(),
      title: title.trim(),
      icon,
      color,
      type,
      targetValue: type === 'quant' ? Math.max(0.1, Number(targetValue)) : 1,
      stepValue: type === 'quant' ? Math.max(0.01, Number(stepValue)) : 1,
      unit: type === 'quant' && unit.trim() ? unit.trim() : undefined,
      frequencyType,
      daysOfWeek: frequencyType === 'specific_days' ? daysOfWeek : undefined,
      timesPerWeek: frequencyType === 'times_per_week' ? timesPerWeek : undefined,
      timeOfDay,
      createdAt: editingHabit ? editingHabit.createdAt : todayStr,
      archived: editingHabit ? editingHabit.archived : 0,
      sortOrder: editingHabit ? editingHabit.sortOrder : Date.now(),
    };

    await saveHabit(habitData);
    onClose();
  };

  const handleArchive = async () => {
    if (!editingHabit) return;
    const nextArchived = editingHabit.archived === 1 ? 0 : 1;
    await setHabitArchived(editingHabit.id, nextArchived);
    onClose();
  };

  const handleDelete = async () => {
    if (!editingHabit) return;
    await deleteHabit(editingHabit.id);
    onClose();
  };

  const currentColor = getColorDetails(color);

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-6">
      {/* Title Input */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Habit Name
        </label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Read 20 pages, Hydrate, Morning Run"
          required
          autoFocus
          className="h-10 text-sm rounded-md border-input bg-background"
        />
      </div>

      {/* Color Swatches */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Color Accent
        </label>
        <div className="flex items-center gap-2.5">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => setColor(c.name)}
              className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer flex items-center justify-center ${
                color === c.name
                  ? 'scale-110 border-foreground shadow-xs'
                  : 'border-transparent opacity-80 hover:opacity-100'
              }`}
              style={{ backgroundColor: c.fillHex }}
              title={c.label}
            >
              {color === c.name && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
            </button>
          ))}
        </div>
      </div>

      {/* Curated Icon Grid */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Icon
        </label>
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 p-2 rounded-lg bg-muted/40 border border-border max-h-36 overflow-y-auto no-scrollbar">
          {CURATED_ICONS.map((opt) => {
            const isSelected = icon === opt.name;
            return (
              <button
                key={opt.name}
                type="button"
                onClick={() => setIcon(opt.name)}
                className={`w-8 h-8 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                  isSelected
                    ? `${currentColor.bgClass} ${currentColor.textClass} ring-1 ring-primary`
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                title={opt.label}
              >
                <HabitIcon name={opt.name} className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Habit Type (Shadcn Tabs) */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Habit Type
        </label>
        <Tabs
          value={type}
          onValueChange={(val) => setType(val as HabitType)}
          className="w-full"
        >
          <TabsList className="w-full grid grid-cols-2 h-9 p-1">
            <TabsTrigger value="binary" className="text-xs font-medium cursor-pointer">
              Yes / No (Checkbox)
            </TabsTrigger>
            <TabsTrigger value="quant" className="text-xs font-medium cursor-pointer">
              Measurable Target
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* If Measurable, reveal Target, Step, Unit */}
        {type === 'quant' && (
          <div className="p-3.5 rounded-lg border border-border bg-muted/30 space-y-3 mt-2">
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">
                  Target Goal
                </label>
                <Input
                  type="number"
                  step="any"
                  min="0.1"
                  value={targetValue}
                  onChange={(e) => setTargetValue(Number(e.target.value))}
                  className="h-8 mt-1 rounded-md text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">
                  Step Amount
                </label>
                <Input
                  type="number"
                  step="any"
                  min="0.01"
                  value={stepValue}
                  onChange={(e) => setStepValue(Number(e.target.value))}
                  className="h-8 mt-1 rounded-md text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">
                  Unit (optional)
                </label>
                <Input
                  type="text"
                  placeholder="L, Pages"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="h-8 mt-1 rounded-md text-xs"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Frequency Selector (Shadcn Tabs) */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Frequency
        </label>
        <Tabs
          value={frequencyType}
          onValueChange={(val) => setFrequencyType(val as FrequencyType)}
          className="w-full"
        >
          <TabsList className="w-full grid grid-cols-3 h-9 p-1">
            <TabsTrigger value="daily" className="text-xs font-medium cursor-pointer">
              Every Day
            </TabsTrigger>
            <TabsTrigger value="specific_days" className="text-xs font-medium cursor-pointer">
              Specific Days
            </TabsTrigger>
            <TabsTrigger value="times_per_week" className="text-xs font-medium cursor-pointer">
              Times / Week
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Specific Days Picker */}
        {frequencyType === 'specific_days' && (
          <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-2 mt-2">
            <span className="text-[11px] text-muted-foreground block">
              Scheduled days:
            </span>
            <div className="grid grid-cols-7 gap-1.5">
              {DAYS_OF_WEEK.map((d) => {
                const isSelected = daysOfWeek.includes(d.day);
                return (
                  <button
                    key={d.day}
                    type="button"
                    onClick={() => handleToggleDay(d.day)}
                    className={`h-8 rounded-md font-medium text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-background border border-border text-muted-foreground hover:text-foreground'
                    }`}
                    title={d.name}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Times Per Week Slider */}
        {frequencyType === 'times_per_week' && (
          <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-2 mt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Target days per week:</span>
              <span className="font-semibold text-foreground">
                {timesPerWeek} {timesPerWeek === 1 ? 'day' : 'days'} / week
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="7"
              step="1"
              value={timesPerWeek}
              onChange={(e) => setTimesPerWeek(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Time of Day (Shadcn Tabs) */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Time of Day
        </label>
        <Tabs
          value={timeOfDay}
          onValueChange={(val) => setTimeOfDay(val as TimeOfDay)}
          className="w-full"
        >
          <TabsList className="w-full grid grid-cols-4 h-9 p-1">
            {TIME_OPTIONS.map((opt) => (
              <TabsTrigger
                key={opt.value}
                value={opt.value}
                className="text-xs font-medium cursor-pointer"
              >
                {opt.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2.5 pt-3 border-t border-border">
        <Button type="submit" className="w-full font-medium h-9 rounded-md shadow-xs">
          {isEditing ? 'Save Changes' : 'Create Habit'}
        </Button>

        {/* Edit Mode: Archive & Delete */}
        {isEditing && (
          <div className="flex flex-col gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={handleArchive}
              className="w-full h-8 text-xs text-muted-foreground hover:text-foreground gap-2 rounded-md"
            >
              <Archive className="w-3.5 h-3.5" />
              {editingHabit?.archived === 1 ? 'Unarchive Habit' : 'Archive Habit'}
            </Button>

            {!showDeleteConfirm ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full h-8 text-xs text-destructive hover:bg-destructive/10 gap-2 rounded-md"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Permanently
              </Button>
            ) : (
              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-destructive font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Delete habit and all its logged history?</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    className="flex-1 h-8 text-xs rounded-md"
                  >
                    Yes, Delete
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 h-8 text-xs rounded-md"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </form>
  );
}

export function HabitFormSheet() {
  const {
    isNewHabitOpen,
    closeNewHabit,
    editingHabit,
    closeEditHabit,
    todayStr,
  } = useUI();

  const isOpen = isNewHabitOpen || Boolean(editingHabit);
  const isEditing = Boolean(editingHabit);

  const handleClose = () => {
    if (isEditing) {
      closeEditHabit();
    } else {
      closeNewHabit();
    }
  };

  return (
    <ResponsiveSheet
      open={isOpen}
      onOpenChange={(open) => !open && handleClose()}
      title={isEditing ? 'Edit Habit' : 'Create New Habit'}
      description={
        isEditing
          ? 'Modify habit parameters and schedules'
          : 'Set up an intentional daily or scheduled routine'
      }
    >
      <HabitFormContent
        key={editingHabit?.id ?? 'new'}
        editingHabit={editingHabit}
        todayStr={todayStr}
        onClose={handleClose}
      />
    </ResponsiveSheet>
  );
}

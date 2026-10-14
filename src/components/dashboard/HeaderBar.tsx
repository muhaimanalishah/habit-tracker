import { useUI, type TimeFilter } from '@/context/UIContext';
import { formatDisplayDate } from '@/lib/dates';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Settings,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react';

interface HeaderBarProps {
  completedCount: number;
  totalScheduledCount: number;
}

const FILTER_ITEMS: { label: string; value: TimeFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Morning', value: 'morning' },
  { label: 'Afternoon', value: 'afternoon' },
  { label: 'Evening', value: 'evening' },
];

export function HeaderBar({ completedCount, totalScheduledCount }: HeaderBarProps) {
  const {
    selectedDate,
    todayStr,
    timeFilter,
    setTimeFilter,
    openNewHabit,
    openSettings,
    jumpToToday,
    goToPreviousDay,
    goToNextDay,
  } = useUI();

  const isToday = selectedDate === todayStr;

  return (
    <header className="flex flex-col gap-4 border-b border-border/40 pb-6 mb-8 md:flex-row md:items-center md:justify-between">
      {/* Date navigation & Title */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {formatDisplayDate(selectedDate)}
          </h1>
          <div className="flex items-center gap-1 ml-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={goToPreviousDay}
              title="Previous Day ([ or Left Arrow])"
              aria-label="Previous Day"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-30"
              onClick={goToNextDay}
              disabled={isToday}
              title="Next Day (] or Right Arrow])"
              aria-label="Next Day"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isToday && (
              <Button
                variant="outline"
                size="sm"
                onClick={jumpToToday}
                className="h-7 px-2.5 text-xs font-medium ml-1"
                title="Jump to Today (T)"
              >
                <Calendar className="h-3 w-3 mr-1" />
                Today
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {totalScheduledCount === 0 ? (
            'No habits scheduled for this day'
          ) : (
            <>
              <span className="font-medium text-foreground">{completedCount}</span> of{' '}
              <span className="font-medium text-foreground">{totalScheduledCount}</span>{' '}
              completed {isToday ? 'today' : 'on this day'}
            </>
          )}
        </p>
      </div>

      {/* Controls & Filter Pills */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Shadcn Tabs for Time of Day */}
        <Tabs
          value={timeFilter}
          onValueChange={(val) => setTimeFilter(val as TimeFilter)}
          className="w-auto"
        >
          <TabsList className="h-9 p-1">
            {FILTER_ITEMS.map((item) => (
              <TabsTrigger
                key={item.value}
                value={item.value}
                className="px-3 py-1 text-xs font-medium cursor-pointer"
              >
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            onClick={openNewHabit}
            size="sm"
            className="hidden sm:inline-flex items-center gap-1.5 shadow-xs font-medium"
          >
            <Plus className="h-4 w-4" />
            <span>New Habit</span>
            <kbd className="hidden md:inline-block ml-1 px-1.5 py-0.5 text-[10px] bg-primary-foreground/20 rounded font-mono">
              N
            </kbd>
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            onClick={openSettings}
            title="Settings & Data Backup"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

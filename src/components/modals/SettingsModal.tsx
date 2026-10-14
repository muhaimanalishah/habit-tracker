import React, { useRef, useState } from 'react';
import { useUI } from '@/context/UIContext';
import { useTheme } from '@/components/theme-provider';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import {
  saveSettings,
  exportDatabase,
  importDatabase,
  setHabitArchived,
  deleteHabit,
  clearAllData,
} from '@/db/actions';
import { seedSampleData } from '@/db/seed';
import { getColorDetails, HabitIcon } from '@/lib/icons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Moon,
  Sun,
  Laptop,
  Download,
  Upload,
  Clock,
  Sparkles,
  Command,
  CheckCircle,
  AlertCircle,
  Trash2,
} from 'lucide-react';

const ROLLOVER_HOURS = [
  { value: 0, label: '12:00 AM (Midnight)' },
  { value: 1, label: '1:00 AM' },
  { value: 2, label: '2:00 AM' },
  { value: 3, label: '3:00 AM' },
  { value: 4, label: '4:00 AM (Default)' },
  { value: 5, label: '5:00 AM' },
  { value: 6, label: '6:00 AM' },
];

export function SettingsModal() {
  const { isSettingsOpen, closeSettings } = useUI();
  const { theme, setTheme } = useTheme();

  const settings = useLiveQuery(() => db.settings.get('user_settings'));
  const currentResetHour = settings?.dayResetHour ?? 4;

  const archivedHabits = useLiveQuery(() => db.habits.where('archived').equals(1).toArray()) ?? [];

  const [importStatus, setImportStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRolloverChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = parseInt(e.target.value, 10);
    await saveSettings({ dayResetHour: val });
  };

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    await saveSettings({ theme: newTheme });
  };

  const handleExport = async () => {
    await exportDatabase();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const res = await importDatabase(content);
      setImportStatus(res);
      setTimeout(() => setImportStatus(null), 5000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLoadSample = async () => {
    setIsResetting(true);
    await seedSampleData(currentResetHour);
    setIsResetting(false);
    setImportStatus({
      success: true,
      message: 'Sample habits and 30-day history reloaded!',
    });
    setTimeout(() => setImportStatus(null), 4000);
  };

  const handleClearAll = async () => {
    await clearAllData();
    setShowClearConfirm(false);
    setImportStatus({
      success: true,
      message: 'All habits and logs have been wiped. Ready to start fresh!',
    });
    setTimeout(() => setImportStatus(null), 4000);
  };

  return (
    <Dialog open={isSettingsOpen} onOpenChange={(open) => !open && closeSettings()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto no-scrollbar p-6">
        <DialogHeader className="p-0">
          <DialogTitle className="text-xl font-bold">Preferences & Data</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Configure habit tracking rules, manage archived habits, or backup data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Theme Selector using Shadcn Tabs */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Appearance
            </label>
            <Tabs
              value={theme}
              onValueChange={(val) => handleThemeChange(val as 'light' | 'dark' | 'system')}
              className="w-full"
            >
              <TabsList className="w-full grid grid-cols-3 h-9 p-1">
                <TabsTrigger value="light" className="text-xs font-medium cursor-pointer gap-1.5">
                  <Sun className="w-3.5 h-3.5" />
                  Light
                </TabsTrigger>
                <TabsTrigger value="dark" className="text-xs font-medium cursor-pointer gap-1.5">
                  <Moon className="w-3.5 h-3.5" />
                  Dark
                </TabsTrigger>
                <TabsTrigger value="system" className="text-xs font-medium cursor-pointer gap-1.5">
                  <Laptop className="w-3.5 h-3.5" />
                  System
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Day Rollover Hour */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Day Rollover Hour
            </label>
            <p className="text-xs text-muted-foreground">
              Habits checked in after midnight before this hour still count towards yesterday.
            </p>
            <select
              value={currentResetHour}
              onChange={handleRolloverChange}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {ROLLOVER_HOURS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <Separator />

          {/* Archived Habits Manager */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Archived Habits ({archivedHabits.length})
              </span>
            </div>

            {archivedHabits.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No archived habits.</p>
            ) : (
              <div className="max-h-40 overflow-y-auto no-scrollbar divide-y divide-border rounded-lg border border-border bg-muted/20">
                {archivedHabits.map((habit) => {
                  const color = getColorDetails(habit.color);
                  return (
                    <div key={habit.id} className="flex items-center justify-between p-2.5 gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${color.bgClass} ${color.textClass}`}
                        >
                          <HabitIcon name={habit.icon} className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-medium text-foreground truncate">
                          {habit.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setHabitArchived(habit.id, 0)}
                          className="h-7 px-2 text-xs rounded-md"
                        >
                          Restore
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteHabit(habit.id)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive rounded-md"
                          title="Permanently Delete Habit"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Separator />

          {/* Backup & Restore */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Local-First Data Storage
              </label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your data stays in your browser IndexedDB. Export anytime to backup or sync.
              </p>
            </div>

            {importStatus && (
              <div
                className={`p-3 rounded-md text-xs flex items-center gap-2 ${
                  importStatus.success
                    ? 'bg-muted text-foreground border border-border'
                    : 'bg-destructive/10 text-destructive border border-destructive/20'
                }`}
              >
                {importStatus.success ? (
                  <CheckCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{importStatus.message}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <Button
                variant="outline"
                onClick={handleExport}
                className="h-9 text-xs font-medium gap-2 justify-center rounded-md"
              >
                <Download className="w-3.5 h-3.5" />
                Export JSON
              </Button>

              <Button
                variant="outline"
                onClick={handleImportClick}
                className="h-9 text-xs font-medium gap-2 justify-center rounded-md"
              >
                <Upload className="w-3.5 h-3.5" />
                Import JSON
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          <Separator />

          {/* Sample Data & Clear Data */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-foreground block">
                  Sample Habits
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Reload sample habits & 30-day logs
                </span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleLoadSample}
                disabled={isResetting}
                className="text-xs gap-1.5 rounded-md h-8"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Load Sample
              </Button>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-foreground block">
                    Reset Application Data
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Wipe all habits and logs to start fresh
                  </span>
                </div>
                {!showClearConfirm && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowClearConfirm(true)}
                    className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 rounded-md h-8"
                  >
                    Clear All Data
                  </Button>
                )}
              </div>

              {showClearConfirm && (
                <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 space-y-2">
                  <p className="text-xs text-destructive font-medium">
                    Wipe all habits and tracking logs? This cannot be undone.
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleClearAll}
                      className="h-7 text-xs rounded-md"
                    >
                      Yes, Wipe Everything
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowClearConfirm(false)}
                      className="h-7 text-xs rounded-md"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Desktop Keyboard Shortcuts Reference */}
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Command className="w-3.5 h-3.5" />
              Keyboard Shortcuts
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-md bg-muted/40 border border-border">
                <span className="text-muted-foreground">New Habit</span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono text-[10px]">N</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-md bg-muted/40 border border-border">
                <span className="text-muted-foreground">Jump to Today</span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono text-[10px]">T</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-md bg-muted/40 border border-border">
                <span className="text-muted-foreground">Prev / Next Day</span>
                <span className="flex gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono text-[10px]">[</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono text-[10px]">]</kbd>
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-md bg-muted/40 border border-border">
                <span className="text-muted-foreground">Toggle Habit</span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono text-[10px]">1 – 9</kbd>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

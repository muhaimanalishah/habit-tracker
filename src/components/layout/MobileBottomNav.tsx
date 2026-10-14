import { useUI } from '@/context/UIContext';
import { CheckCircle2, BarChart2, Plus } from 'lucide-react';

export function MobileBottomNav() {
  const { mobileTab, setMobileTab, openNewHabit } = useUI();

  return (
    <div className="lg:hidden fixed bottom-5 inset-x-0 pointer-events-none z-40 px-5 flex items-center justify-between">
      {/* Spacer to balance FAB */}
      <div className="w-12 h-12 pointer-events-none invisible" />

      {/* Centered Glassmorphic Pill */}
      <nav
        aria-label="Mobile View Switcher"
        className="pointer-events-auto flex items-center p-1.5 rounded-full bg-background/80 dark:bg-card/80 backdrop-blur-md border border-border/80 shadow-lg"
      >
        <button
          type="button"
          onClick={() => setMobileTab('today')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            mobileTab === 'today'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Today</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('insights')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            mobileTab === 'insights'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Insights</span>
        </button>
      </nav>

      {/* Floating Action Button (FAB) at bottom-5 right-5 */}
      <button
        type="button"
        onClick={openNewHabit}
        className="pointer-events-auto w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center transition-transform active:scale-95 hover:scale-105 cursor-pointer"
        aria-label="Create new habit"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>
    </div>
  );
}

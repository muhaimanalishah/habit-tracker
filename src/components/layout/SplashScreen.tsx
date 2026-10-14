import { Flame } from 'lucide-react';

export function SplashScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-background text-foreground transition-colors">
      <div className="w-14 h-14 rounded-2xl bg-muted/60 border border-border flex items-center justify-center mb-4 text-foreground animate-pulse shadow-xs">
        <Flame className="w-6 h-6 fill-amber-500 text-amber-500" />
      </div>
      <h2 className="text-lg font-bold tracking-tight text-foreground mb-1">
        Habit Tracker
      </h2>
      <p className="text-xs text-muted-foreground mb-6">
        Loading your habits...
      </p>
      <div className="w-32 h-1 bg-muted rounded-full overflow-hidden relative">
        <div className="absolute top-0 bottom-0 left-0 bg-primary rounded-full animate-[indeterminate_1.4s_ease-in-out_infinite] w-2/5" />
      </div>
    </div>
  );
}

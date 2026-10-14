import { useEffect } from 'react';
import { useUI } from '@/context/UIContext';
import type { Habit } from '@/db/db';
import { toggleHabit, incrementHabit } from '@/db/actions';

function isInputElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

export function useKeyboardShortcuts(visibleHabits: Habit[]) {
  const {
    openNewHabit,
    jumpToToday,
    goToPreviousDay,
    goToNextDay,
    selectedDate,
    isNewHabitOpen,
    editingHabit,
    viewingHabit,
    isSettingsOpen,
  } = useUI();

  const isModalOpen =
    isNewHabitOpen ||
    Boolean(editingHabit) ||
    Boolean(viewingHabit) ||
    isSettingsOpen;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input/textarea
      if (isInputElement(e.target)) return;

      // Ignore modifier keys
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // If a modal is open, let Escape or dialog handlers work, don't trigger global shortcuts
      if (isModalOpen) return;

      const key = e.key;

      if (key === 'n' || key === 'N') {
        e.preventDefault();
        openNewHabit();
        return;
      }

      if (key === '[' || key === 'ArrowLeft') {
        e.preventDefault();
        goToPreviousDay();
        return;
      }

      if (key === ']' || key === 'ArrowRight') {
        e.preventDefault();
        goToNextDay();
        return;
      }

      if (key === 't' || key === 'T') {
        e.preventDefault();
        jumpToToday();
        return;
      }

      // Check numbers 1-9
      const num = parseInt(key, 10);
      if (!isNaN(num) && num >= 1 && num <= 9) {
        const habitIndex = num - 1;
        if (habitIndex < visibleHabits.length) {
          e.preventDefault();
          const targetHabit = visibleHabits[habitIndex];
          if (targetHabit.type === 'binary') {
            toggleHabit(targetHabit, selectedDate);
          } else {
            incrementHabit(targetHabit, selectedDate);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isModalOpen,
    openNewHabit,
    jumpToToday,
    goToPreviousDay,
    goToNextDay,
    visibleHabits,
    selectedDate,
  ]);
}

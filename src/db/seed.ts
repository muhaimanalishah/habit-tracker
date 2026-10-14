import { db, type Habit, type HabitLog } from './db';
import { subDays, format } from '@/lib/dates';

export async function seedSampleData(dayResetHour = 4): Promise<void> {
  const thirtyDaysAgo = format(subDays(new Date(), 35), 'yyyy-MM-dd');

  const sampleHabits: Habit[] = [
    {
      id: 'habit-1',
      title: 'Morning Meditation',
      icon: 'Sparkles',
      color: 'emerald',
      type: 'binary',
      targetValue: 1,
      stepValue: 1,
      frequencyType: 'daily',
      timeOfDay: 'morning',
      createdAt: thirtyDaysAgo,
      archived: 0,
      sortOrder: 1,
    },
    {
      id: 'habit-2',
      title: 'Hydration Goal',
      icon: 'Droplets',
      color: 'blue',
      type: 'quant',
      targetValue: 3,
      stepValue: 0.5,
      unit: 'Liters',
      frequencyType: 'daily',
      timeOfDay: 'anytime',
      createdAt: thirtyDaysAgo,
      archived: 0,
      sortOrder: 2,
    },
    {
      id: 'habit-3',
      title: 'Workout & Fitness',
      icon: 'Dumbbell',
      color: 'rose',
      type: 'binary',
      targetValue: 1,
      stepValue: 1,
      frequencyType: 'specific_days',
      daysOfWeek: [1, 2, 4, 5, 6], // Mon, Tue, Thu, Fri, Sat
      timeOfDay: 'afternoon',
      createdAt: thirtyDaysAgo,
      archived: 0,
      sortOrder: 3,
    },
    {
      id: 'habit-4',
      title: 'Book Reading',
      icon: 'BookOpen',
      color: 'amber',
      type: 'quant',
      targetValue: 25,
      stepValue: 5,
      unit: 'Pages',
      frequencyType: 'daily',
      timeOfDay: 'evening',
      createdAt: thirtyDaysAgo,
      archived: 0,
      sortOrder: 4,
    },
    {
      id: 'habit-5',
      title: 'Journal & Reflection',
      icon: 'PenTool',
      color: 'violet',
      type: 'binary',
      targetValue: 1,
      stepValue: 1,
      frequencyType: 'times_per_week',
      timesPerWeek: 5,
      timeOfDay: 'evening',
      createdAt: thirtyDaysAgo,
      archived: 0,
      sortOrder: 5,
    },
  ];

  const sampleLogs: HabitLog[] = [];

  // Generate realistic logs for the past 30 days
  for (let i = 30; i >= 0; i--) {
    const dStr = format(subDays(new Date(), i), 'yyyy-MM-dd');

    // Habit 1: Meditation (high consistency, ~85%)
    if (i !== 3 && i !== 12 && i !== 19) {
      sampleLogs.push({
        id: `habit-1_${dStr}`,
        habitId: 'habit-1',
        date: dStr,
        status: 'completed',
        value: 1,
        updatedAt: Date.now() - i * 86400000,
      });
    }

    // Habit 2: Water (quant, variable values)
    const waterValue = i === 0 ? 2.0 : i % 5 === 0 ? 2.5 : 3.0;
    sampleLogs.push({
      id: `habit-2_${dStr}`,
      habitId: 'habit-2',
      date: dStr,
      status: waterValue >= 3 ? 'completed' : 'partial',
      value: waterValue,
      updatedAt: Date.now() - i * 86400000,
    });

    // Habit 3: Workout (mon, tue, thu, fri, sat)
    const dayOfWeek = new Date(dStr + 'T12:00:00').getDay();
    if ([1, 2, 4, 5, 6].includes(dayOfWeek) && i !== 7 && i !== 14) {
      sampleLogs.push({
        id: `habit-3_${dStr}`,
        habitId: 'habit-3',
        date: dStr,
        status: i === 4 ? 'skipped' : 'completed',
        value: 1,
        updatedAt: Date.now() - i * 86400000,
      });
    }

    // Habit 4: Reading
    if (i !== 2 && i !== 8 && i !== 22) {
      const pages = i === 0 ? 15 : i % 4 === 0 ? 30 : 25;
      sampleLogs.push({
        id: `habit-4_${dStr}`,
        habitId: 'habit-4',
        date: dStr,
        status: pages >= 25 ? 'completed' : 'partial',
        value: pages,
        updatedAt: Date.now() - i * 86400000,
      });
    }

    // Habit 5: Journal
    if (i % 7 < 5) {
      sampleLogs.push({
        id: `habit-5_${dStr}`,
        habitId: 'habit-5',
        date: dStr,
        status: 'completed',
        value: 1,
        updatedAt: Date.now() - i * 86400000,
      });
    }
  }

  await db.transaction('rw', [db.habits, db.logs, db.settings], async () => {
    await db.habits.bulkPut(sampleHabits);
    await db.logs.bulkPut(sampleLogs);
    const existingSettings = await db.settings.get('user_settings');
    await db.settings.put({
      id: 'user_settings',
      dayResetHour: existingSettings?.dayResetHour ?? dayResetHour,
      theme: existingSettings?.theme ?? 'system',
      hasInitialized: true,
    });
  });
}

/**
 * Initializes the database on first load if empty and has not been explicitly initialized/cleared.
 */
export async function initializeDatabaseIfNeeded(): Promise<void> {
  const settings = await db.settings.get('user_settings');
  const habitsCount = await db.habits.count();
  if (!settings?.hasInitialized && habitsCount === 0) {
    await seedSampleData(4);
  }
}

import {
  Sparkles,
  Dumbbell,
  BookOpen,
  Droplets,
  Heart,
  Brain,
  PenTool,
  Flame,
  Moon,
  Sun,
  Apple,
  Coffee,
  Footprints,
  Target,
  Smile,
  Music,
  Bed,
  Bike,
  Shield,
  DollarSign,
  Laptop,
  CheckCircle2,
  Clock,
  Zap,
  type LucideIcon,
} from 'lucide-react';

export interface IconOption {
  name: string;
  icon: LucideIcon;
  label: string;
}

export const CURATED_ICONS: IconOption[] = [
  { name: 'Sparkles', icon: Sparkles, label: 'Mindfulness' },
  { name: 'Dumbbell', icon: Dumbbell, label: 'Fitness' },
  { name: 'BookOpen', icon: BookOpen, label: 'Reading' },
  { name: 'Droplets', icon: Droplets, label: 'Water' },
  { name: 'Heart', icon: Heart, label: 'Health' },
  { name: 'Brain', icon: Brain, label: 'Study' },
  { name: 'PenTool', icon: PenTool, label: 'Writing' },
  { name: 'Flame', icon: Flame, label: 'Streak / Energy' },
  { name: 'Moon', icon: Moon, label: 'Sleep' },
  { name: 'Sun', icon: Sun, label: 'Morning' },
  { name: 'Apple', icon: Apple, label: 'Nutrition' },
  { name: 'Coffee', icon: Coffee, label: 'Break' },
  { name: 'Footprints', icon: Footprints, label: 'Walking' },
  { name: 'Target', icon: Target, label: 'Focus' },
  { name: 'Smile', icon: Smile, label: 'Mood' },
  { name: 'Music', icon: Music, label: 'Music' },
  { name: 'Bed', icon: Bed, label: 'Rest' },
  { name: 'Bike', icon: Bike, label: 'Cycling' },
  { name: 'Shield', icon: Shield, label: 'Discipline' },
  { name: 'DollarSign', icon: DollarSign, label: 'Finances' },
  { name: 'Laptop', icon: Laptop, label: 'Coding' },
  { name: 'CheckCircle2', icon: CheckCircle2, label: 'Tasks' },
  { name: 'Clock', icon: Clock, label: 'Time' },
  { name: 'Zap', icon: Zap, label: 'Energy' },
];

export const ICON_MAP: Record<string, LucideIcon> = {
  Sparkles,
  Dumbbell,
  BookOpen,
  Droplets,
  Heart,
  Brain,
  PenTool,
  Flame,
  Moon,
  Sun,
  Apple,
  Coffee,
  Footprints,
  Target,
  Smile,
  Music,
  Bed,
  Bike,
  Shield,
  DollarSign,
  Laptop,
  CheckCircle2,
  Clock,
  Zap,
};

export interface ColorOption {
  name: string;
  label: string;
  bgClass: string;
  textClass: string;
  fillHex: string;
}

export const COLOR_OPTIONS: ColorOption[] = [
  {
    name: 'emerald',
    label: 'Emerald',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-500',
    fillHex: '#10b981',
  },
  {
    name: 'blue',
    label: 'Blue',
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-500',
    fillHex: '#3b82f6',
  },
  {
    name: 'violet',
    label: 'Violet',
    bgClass: 'bg-violet-500/10',
    textClass: 'text-violet-500',
    fillHex: '#8b5cf6',
  },
  {
    name: 'amber',
    label: 'Amber',
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-500',
    fillHex: '#f59e0b',
  },
  {
    name: 'rose',
    label: 'Rose',
    bgClass: 'bg-rose-500/10',
    textClass: 'text-rose-500',
    fillHex: '#f43f5e',
  },
  {
    name: 'cyan',
    label: 'Cyan',
    bgClass: 'bg-cyan-500/10',
    textClass: 'text-cyan-500',
    fillHex: '#06b6d4',
  },
];

export function getColorDetails(colorName: string): ColorOption {
  return COLOR_OPTIONS.find((c) => c.name === colorName) || COLOR_OPTIONS[0];
}

export function HabitIcon({
  name,
  className = 'w-5 h-5',
}: {
  name: string;
  className?: string;
}) {
  const IconComponent = ICON_MAP[name] || Sparkles;
  return <IconComponent className={className} />;
}

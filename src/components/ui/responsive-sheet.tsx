import * as React from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';

interface ResponsiveSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: ResponsiveSheetProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className={`w-full sm:max-w-md p-6 flex flex-col gap-6 overflow-y-auto no-scrollbar ${className ?? ''}`}
        >
          {(title || description) && (
            <SheetHeader className="p-0">
              {title && <SheetTitle className="text-lg font-semibold text-foreground">{title}</SheetTitle>}
              {description && <SheetDescription className="text-sm text-muted-foreground">{description}</SheetDescription>}
            </SheetHeader>
          )}
          {children}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent
        className={`[--drawer-inset:0px] rounded-t-[20px] rounded-b-none border-t border-border bg-background max-h-[85dvh] flex flex-col p-0 ${
          className ?? ''
        }`}
      >
        <div className="overflow-y-auto no-scrollbar px-6 pt-2 pb-8 flex-1">
          {(title || description) && (
            <DrawerHeader className="text-left px-0 mb-4">
              {title && <DrawerTitle className="text-lg font-semibold text-foreground">{title}</DrawerTitle>}
              {description && <DrawerDescription className="text-sm text-muted-foreground">{description}</DrawerDescription>}
            </DrawerHeader>
          )}
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

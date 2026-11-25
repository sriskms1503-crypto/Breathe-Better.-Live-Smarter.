import { useCallback, type KeyboardEvent } from 'react';

/**
 * Provides WAI-ARIA keyboard navigation (ArrowLeft, ArrowRight, Home, End)
 * for accessible horizontal tablists.
 */
export function useTabNavigation<T extends string>(
  items: ReadonlyArray<T>,
  activeItem: T,
  onSelect: (item: T) => void
) {
  const handleTabKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      if (items.length === 0) return;
      let nextIndex: number | null = null;

      if (e.key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % items.length;
      } else if (e.key === 'ArrowLeft') {
        nextIndex = (currentIndex - 1 + items.length) % items.length;
      } else if (e.key === 'Home') {
        nextIndex = 0;
      } else if (e.key === 'End') {
        nextIndex = items.length - 1;
      }

      if (nextIndex === null) return;
      e.preventDefault();
      const nextItem = items[nextIndex];
      onSelect(nextItem);

      const parent = e.currentTarget.closest('[role="tablist"]');
      const buttons = parent?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      buttons?.[nextIndex]?.focus();
    },
    [items, onSelect]
  );

  return {
    getTabProps: (item: T, index: number, idPrefix: string) => {
      const selected = activeItem === item;
      return {
        id: `${idPrefix}-tab-${index}`,
        role: 'tab' as const,
        'aria-selected': selected,
        'aria-controls': `${idPrefix}-panel`,
        tabIndex: selected ? 0 : -1,
        onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => handleTabKeyDown(e, index),
      };
    },
    getPanelProps: (idPrefix: string) => {
      const activeIdx = Math.max(0, items.indexOf(activeItem));
      return {
        id: `${idPrefix}-panel`,
        role: 'tabpanel' as const,
        'aria-labelledby': `${idPrefix}-tab-${activeIdx}`,
      };
    },
  };
}

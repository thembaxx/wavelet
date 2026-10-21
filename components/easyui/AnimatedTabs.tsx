'use client';

// Adapted from EasyUI AnimatedTabs by Suraj Maurya (MIT).
// https://github.com/Surajmaurya1/easyui/blob/main/src/components/ui/AnimatedTabs.tsx
// Uses Wavelet's existing Motion dependency, palette, and selectable-button semantics.
import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export interface AnimatedTabItem {
  id: string;
  label: string;
  icon?: ReactNode;
  ariaLabel?: string;
  testId?: string;
}

interface AnimatedTabsProps {
  tabs: AnimatedTabItem[];
  value: string;
  onValueChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
  reducedMotion?: boolean;
}

export function AnimatedTabs({
  tabs, value, onValueChange, ariaLabel, className, reducedMotion = false,
}: AnimatedTabsProps) {
  const id = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!(event.target instanceof HTMLButtonElement) || !event.target.hasAttribute('data-easyui-tab')) return;
    const index = tabs.findIndex(tab => tab.id === value);
    if (index === -1 || tabs.length === 0) return;
    let next = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    buttons.current[next]?.focus();
    if (tabs[next].id !== value) onValueChange(tabs[next].id);
  };

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn('easyui-animated-tabs', className)}
      onKeyDown={handleKeyDown}
    >
      {tabs.map((tab, index) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            ref={element => { buttons.current[index] = element; }}
            type="button"
            data-easyui-tab
            data-state={active ? 'on' : 'off'}
            data-testid={tab.testId}
            aria-label={tab.ariaLabel || tab.label}
            aria-pressed={active}
            onClick={() => { if (!active) onValueChange(tab.id); }}
          >
            {active && (reducedMotion
              ? <span className="easyui-tab-indicator" aria-hidden="true" />
              : <motion.span
                  layoutId={`easyui-tab-indicator-${id}`}
                  className="easyui-tab-indicator"
                  aria-hidden="true"
                  transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                />)}
            <span className="easyui-tab-content">
              {tab.icon}
              <span>{tab.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

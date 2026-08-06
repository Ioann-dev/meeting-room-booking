'use client';

import * as RadixTabs from '@radix-ui/react-tabs';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface TabItem {
  value: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  label: string;
  items: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
}

/**
 * Generic tabs primitive (Radix-based, like `Dialog`): each tab's content
 * mounts only while active (Radix Tabs unmounts inactive panels by
 * default), so callers get "fetch on first activation" for free just by
 * putting their data-fetching in the panel component itself.
 */
export function Tabs({ label, items, value, onValueChange }: TabsProps) {
  return (
    <RadixTabs.Root value={value} onValueChange={onValueChange} className="flex flex-col gap-4">
      <RadixTabs.List aria-label={label} className="flex gap-1 border-b border-border">
        {items.map((item) => (
          <RadixTabs.Trigger
            key={item.value}
            value={item.value}
            className={cn(
              '-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium text-ink-muted transition-colors',
              'hover:text-ink',
              'data-[state=active]:border-accent data-[state=active]:text-accent-strong',
            )}
          >
            {item.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {items.map((item) => (
        <RadixTabs.Content
          key={item.value}
          value={item.value}
          className="focus-visible:outline-none"
        >
          {item.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
}

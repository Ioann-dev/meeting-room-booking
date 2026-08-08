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
      {/* A segmented control (soft neutral track, white active pill), not
          the old thin-underline tab row -- the underline read visibly
          older/quieter than the filled-pill primary nav sitting right
          above it in the header, so this brings the two navigational
          patterns into the same visual language. */}
      <RadixTabs.List
        aria-label={label}
        className="inline-flex w-fit items-center gap-1 rounded-lg bg-surface-soft p-1"
      >
        {items.map((item) => (
          <RadixTabs.Trigger
            key={item.value}
            value={item.value}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium text-ink-subtle transition-[background-color,box-shadow,color] duration-150 ease-premium',
              'hover:text-ink',
              'data-[state=active]:bg-surface data-[state=active]:font-semibold data-[state=active]:text-ink data-[state=active]:shadow-sm',
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

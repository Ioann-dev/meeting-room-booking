import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { ToastProvider } from '@/components/ui/toast';

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AppShell>{children}</AppShell>
    </ToastProvider>
  );
}

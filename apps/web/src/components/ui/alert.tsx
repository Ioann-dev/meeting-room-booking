import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type AlertVariant = 'error' | 'warning' | 'info' | 'success';

const VARIANT_CLASSES: Record<AlertVariant, string> = {
  error: 'border-danger/30 bg-danger-tint text-danger',
  warning: 'border-warning/30 bg-warning-tint text-warning',
  info: 'border-info/30 bg-info-tint text-info',
  success: 'border-success/30 bg-success-tint text-success',
};

const ROLE_BY_VARIANT: Record<AlertVariant, 'alert' | 'status'> = {
  error: 'alert',
  warning: 'status',
  info: 'status',
  success: 'status',
};

interface AlertProps {
  variant: AlertVariant;
  children: ReactNode;
}

export function Alert({ variant, children }: AlertProps) {
  return (
    <p
      role={ROLE_BY_VARIANT[variant]}
      className={cn('rounded-md border px-3 py-2 text-sm', VARIANT_CLASSES[variant])}
    >
      {children}
    </p>
  );
}

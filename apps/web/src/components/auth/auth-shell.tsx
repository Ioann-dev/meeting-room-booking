import Link from 'next/link';
import type { ReactNode } from 'react';
import { WordmarkIcon } from '@/components/shell/app-header';
import { EVENT_PALETTE } from '@/lib/event-palette';

interface AuthShellProps {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}

/**
 * Shared visual frame for /login, /register, and /verify-email: the
 * wordmark + centered form card, unchanged in substance from before, plus
 * a decorative right-hand panel that only renders at `lg:` and up (mobile
 * stays exactly the single-column, form-first layout it already was --
 * the panel is `hidden` below `lg:`, not just visually empty, so it costs
 * nothing there).
 */
export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <main className="flex min-h-screen flex-col bg-canvas lg:flex-row">
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <WordmarkIcon />
          <span className="text-sm font-semibold tracking-tight text-ink">Meeting Rooms</span>
        </Link>

        <div className="w-full max-w-[26rem] rounded-xl border border-border bg-surface p-8 shadow-md animate-[premium-card-in_220ms_var(--ease-premium)]">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-ink-subtle">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>

      <AuthDecorativePanel />
    </main>
  );
}

/**
 * Purely decorative, CSS-only: a dot-grid wash plus a handful of floating
 * rounded rectangles colored from the app's own real 7-hue event palette
 * (event-palette.ts) at fixed, hand-placed positions -- an abstract nod to
 * "this is a scheduling product" using the product's own real color
 * system, not a screenshot, illustration, or any claim (no logos, counts,
 * testimonials, or metrics of any kind, real or fabricated).
 */
function AuthDecorativePanel() {
  const [purple, blue, cyan, mint, , coral] = EVENT_PALETTE;
  return (
    <div
      aria-hidden="true"
      className="relative hidden w-[42%] max-w-xl shrink-0 overflow-hidden bg-primary lg:block"
    >
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 100% at 100% 0%, rgb(255 255 255 / 0.12), transparent 55%), radial-gradient(120% 100% at 0% 100%, rgb(0 0 0 / 0.15), transparent 55%)',
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-80 w-80">
          <FloatingCard palette={purple!} className="left-2 top-4 w-40 -rotate-6" lines={2} />
          <FloatingCard palette={blue!} className="right-0 top-24 w-36 rotate-3" lines={1} />
          <FloatingCard palette={mint!} className="bottom-16 left-0 w-32 rotate-2" lines={1} />
          <FloatingCard palette={coral!} className="bottom-0 right-4 w-36 -rotate-3" lines={2} />
          <span
            className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-white/95 shadow-xl"
            style={{ color: cyan!.border }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8">
              <rect
                x="3"
                y="4.5"
                width="18"
                height="16"
                rx="2.5"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path d="M3 9.5h18" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="M8 2.5v4M16 2.5v4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}

function FloatingCard({
  palette,
  className,
  lines,
}: {
  palette: { background: string; border: string };
  className: string;
  lines: 1 | 2;
}) {
  return (
    <div
      className={`absolute rounded-lg border-l-[3px] px-3 py-2.5 shadow-lg ${className}`}
      style={{ backgroundColor: palette.background, borderLeftColor: palette.border }}
    >
      <div
        className="h-2 w-3/4 rounded-full opacity-70"
        style={{ backgroundColor: palette.border }}
      />
      {lines === 2 && (
        <div
          className="mt-1.5 h-2 w-1/2 rounded-full opacity-45"
          style={{ backgroundColor: palette.border }}
        />
      )}
    </div>
  );
}

# Phase 11 — Mobile scenario, responsive calendar and accessibility

**Objective:** Make the product genuinely usable on phones and robust for keyboard/accessibility use.  
**Target:** 6 meaningful commits.

Execute Phase 11 only.

## Mobile calendar

1. At <=640px, do not squeeze seven unreadable columns into the viewport.
2. Keep the same custom data model but use a touch-friendly horizontal day scroller/day chips with a clear active day.
3. Preserve a sticky/clear time rail and readable event cards.
4. Use bottom-sheet/drawer presentation for booking form/details on small screens when appropriate.
5. Ensure controls have approximately 44px touch targets.
6. Keep input text at 16px where needed to avoid iOS zoom.
7. Preserve week navigation and room switching without layout jumps.
8. Test at least 390x844 and 430px widths.

## Accessibility

9. Audit semantic labels, form errors, focus order, dialog focus return, keyboard actions and Escape behavior.
10. Use `aria-live` carefully for async success/error messages and notification toasts.
11. Do not communicate ownership/status by color alone.
12. Check contrast of event cards, muted text and focus rings.
13. Respect `prefers-reduced-motion`.
14. Add automated accessibility checks where they fit cleanly, e.g. axe in Playwright, and fix real issues rather than suppressing rules.

## Acceptance criteria

- schedule is usable at 390x844 without accidental page overflow or microscopic text;
- booking create/cancel works by touch;
- core desktop flows work by keyboard;
- no major automated accessibility violations on auth, schedule and My Bookings.

## Verify and stop

Manually test 390px and 430px widths plus keyboard desktop flow. Run accessibility checks, tests and build. STOP.

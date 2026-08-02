# Phase 07 — Design system and authenticated application shell

**Objective:** Create the visual language/navigation foundation before the dense calendar surface.  
**Target:** 7 meaningful commits.

Execute Phase 07 only. Do not implement the full weekly grid yet.

## Design direction

Build a restrained, premium B2B productivity interface. Use Tailwind CSS plus small reusable components.
Radix primitives are allowed for generic dialogs/popovers/toasts, but not for a ready-made calendar.

## Tasks

1. Establish design tokens:
   - typography;
   - spacing;
   - radii;
   - shadows;
   - surfaces/borders;
   - semantic status colors.
2. Build reusable UI primitives only where they reduce duplication:
   - Button;
   - Input;
   - Select;
   - FormField;
   - Dialog/confirmation;
   - Toast;
   - Loading/skeleton;
   - EmptyState;
   - ErrorState/retry.
3. Build authenticated app shell:
   - product header;
   - room/schedule navigation;
   - My Bookings;
   - user menu/logout;
   - notification placeholder area.
4. Add room selector with floor/capacity context and capacity filter.
5. Align auth pages with the same design system.
6. Add responsive shell behavior.
7. Ensure keyboard focus, visible focus rings, labels and logical navigation.

## Acceptance criteria

- screens share one coherent visual language;
- no generic starter-template look;
- loading/empty/error primitives exist before schedule implementation;
- shell works at desktop and narrow widths;
- no calendar library has been introduced.

## Verify and stop

Run web lint/typecheck/build and manually review desktop plus narrow viewport. STOP.

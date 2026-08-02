# Phase 08 — Custom weekly schedule grid

**Objective:** Build the central product surface from scratch with precise layout and time-zone rendering.  
**Target:** 13 meaningful commits.

Execute Phase 08 only.

## Non-negotiable

Do not install or use FullCalendar, React Big Calendar, DayPilot, Scheduler, or any ready-made scheduling grid.

## Tasks

1. Make room/week selection URL-addressable so deep links can open a room on a specific week.
2. Generate a 7-day week model and 30-minute slot rows.
3. Build the schedule manually using CSS Grid/table/application logic.
4. Provide:
   - day headers;
   - time rail;
   - clear office-hours context;
   - previous/current/next week navigation.
5. Map UTC booking instants into the user's browser zone for rendering.
6. Preserve correct visual duration/position.
7. Render each occupied booking with:
   - title;
   - author;
   - own-vs-other state;
   - accessible ownership cue not based on color alone.
8. Highlight:
   - today;
   - current-time line when relevant.
9. If user zone differs from office zone, show a clear `Europe/Kyiv` notice near the grid.
10. Handle:
    - loading;
    - no bookings;
    - API error with retry;
    - empty/available schedule without a blank screen.
11. Allow selecting/clicking a free slot to preselect a future booking start.
12. Add booking-detail interaction without allowing foreign cancellation.
13. Add keyboard focus/activation behavior for slots/events where practical.
14. Add tests for:
    - week/slot generation;
    - timezone mapping;
    - layout-position math;
    - adjacency rendering assumptions.

## Acceptance criteria

- grid is completely custom;
- occupied slot title + author visible;
- own bookings visibly distinct;
- week navigation works;
- current day/time are clear;
- cross-time-zone display is correct;
- errors/empty/loading states are polished.

## Verify and stop

Run schedule tests, web lint/typecheck/build, manually inspect several time zones and widths. STOP.

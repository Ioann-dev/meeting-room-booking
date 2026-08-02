# Phase 04 — Rooms, office-time rules and shared time-zone primitives

**Objective:** Create room discovery plus DST-safe office/user time foundations.  
**Target:** 6 meaningful commits.

Execute Phase 04 only. Do not build the weekly calendar UI yet.

## Tasks

1. Add authenticated room endpoints:
   - list rooms;
   - room detail if useful;
   - optional minimum-capacity filter.
2. Return only fields needed by the client.
3. Centralize domain constants:
   - office zone `Europe/Kyiv`;
   - office opening `09:00`;
   - office closing `19:00`;
   - slot size 30 minutes;
   - maximum booking duration 4 hours.
4. Build shared/server time utilities that:
   - accept IANA zones;
   - convert office-local wall time to UTC instants;
   - convert UTC instants to display-zone data;
   - compute office-local week boundaries;
   - validate 30-minute alignment;
   - validate duration;
   - validate office-hours containment;
   - correctly handle Kyiv DST.
5. Never hardcode Berlin/Kyiv UTC offsets.
6. On web:
   - detect browser zone with `Intl.DateTimeFormat().resolvedOptions().timeZone`;
   - provide a user-zone context/helper;
   - provide a clear office-zone badge/notice when zones differ.
7. Add focused tests for:
   - Kyiv DST transitions;
   - cross-zone conversion;
   - slot alignment;
   - office-hour boundaries.

## Acceptance criteria

- capacity filtering works;
- all office rules are expressed using `Europe/Kyiv`;
- conversion tests do not depend on the machine's local zone;
- DST-safe tests pass.

## Verify and stop

Run time tests, room endpoint tests, root lint/typecheck/test/build. STOP.

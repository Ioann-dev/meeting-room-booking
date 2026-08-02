# Phase 12 — Integration tests, security hardening and code quality

**Objective:** Prove the system works as a product and remove weak spots before packaging.  
**Target:** 8 meaningful commits.

Execute Phase 12 only.

## Test matrix

1. Ensure required interval-overlap unit tests remain under root `npm test`.
2. Add API integration tests for:
   - register/login/session/logout;
   - verified vs unverified booking;
   - valid booking;
   - invalid title/alignment/duration/past/outside-hours;
   - overlap rejected;
   - adjacency accepted;
   - own cancellation;
   - foreign cancellation rejected;
   - recurring create/cancel;
   - capacity filter;
   - My Bookings ordering/pagination.
3. Keep/strengthen parallel concurrency test proving exactly one booking survives.
4. Add web E2E smoke:
   login → schedule → create → My Bookings → deep link → cancel.

## Security and maintainability

5. Review:
   - cookie flags;
   - CORS;
   - security headers/Helmet;
   - request body limits;
   - auth rate limiting.
6. Ensure production errors do not expose stack traces/internal SQL details.
7. Verify passwords, tokens and session secrets are never logged.
8. Verify repository contains no real `.env`.
9. Add graceful database/API-unavailable behavior where missing.
10. Run dependency audit and address safe high/critical fixes without blind major upgrades.
11. Search for and clean:
    - dead code;
    - production `console.log`;
    - duplicated validation constants;
    - routine `any`;
    - unjustified eslint disables;
    - TODO/FIXME.
12. Refactor oversized/mixed-responsibility files only where it improves maintainability.
13. Keep root `npm test` deterministic/reasonably fast; heavier suites may have explicit scripts.

## Acceptance criteria

- mandatory API failure paths have automated coverage;
- no known high-severity dependency problem is ignored without documentation;
- ownership/business rules cannot be bypassed directly;
- production errors are useful without leaking internals.

## Verify and stop

Run lint, typecheck, unit, integration, E2E where supported, and production builds. Report environment-dependent tests explicitly. STOP.

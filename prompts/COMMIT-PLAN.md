# 112-Commit Blueprint

Use this as a planning ledger, not fake history.

Only create a commit when the described change really exists and passes the relevant check.
Merge or skip a planned line when implementation reality makes a separate commit dishonest.

## Phase 00 — Discovery
001. `docs(requirements): map specification to implementation and verification`
002. `docs(architecture): record overlap, timezone and delivery decisions`

## Phase 01 — Workspace
003. `chore(repo): initialize npm workspace structure`
004. `feat(web): bootstrap strict Next.js application`
005. `feat(api): bootstrap NestJS service`
006. `chore(shared): add shared TypeScript package and base configs`
007. `chore(repo): add root quality and development scripts`
008. `feat(health): wire API health check to web connectivity status`
009. `docs(setup): document initial local development workflow`

## Phase 02 — Persistence
010. `chore(db): configure Prisma and PostgreSQL environment`
011. `feat(db): model users sessions and verification tokens`
012. `feat(db): model rooms bookings series and notifications`
013. `perf(db): add query indexes for schedule and user history`
014. `feat(db): enforce active booking overlap exclusion constraint`
015. `feat(seed): add deterministic rooms and test users`
016. `feat(seed): add conflict-free demo booking data`
017. `chore(db): add migration seed and reset scripts`
018. `test(db): verify uniqueness adjacency overlap and cancellation constraints`

## Phase 03 — Authentication
019. `feat(auth): add validated registration flow and email canonicalization`
020. `feat(auth): hash and verify passwords with argon2id`
021. `feat(auth): add opaque database session issuance`
022. `feat(auth): protect current-user routes with session guard`
023. `feat(auth): implement logout and session revocation`
024. `feat(auth): add development email verification tokens`
025. `feat(web): build registration and login screens`
026. `feat(web): restore authenticated session across page reloads`
027. `test(auth): cover registration login session logout and verification`

## Phase 04 — Rooms and time
028. `feat(rooms): expose seeded room list and detail endpoints`
029. `feat(rooms): add minimum-capacity filtering`
030. `feat(time): centralize office zone hours and slot constants`
031. `feat(time): add DST-safe office interval conversion utilities`
032. `feat(web): detect browser timezone and render office-zone badge`
033. `test(time): cover Kyiv DST and cross-timezone display cases`

## Phase 05 — Booking core
034. `feat(booking): add booking DTOs and domain service skeleton`
035. `feat(booking): validate title slot alignment and duration rules`
036. `feat(booking): validate future and Europe/Kyiv office hours`
037. `feat(booking): require verified user and existing room`
038. `feat(booking): create bookings with database conflict mapping`
039. `feat(schedule): expose active room bookings for an office week`
040. `feat(booking): authorize owner-only cancellation`
041. `feat(api): standardize booking error codes and responses`
042. `test(interval): cover half-open overlap edge cases`
043. `test(booking): add create validation and cancellation integration tests`
044. `test(concurrency): prove same-slot race persists one booking`

## Phase 06 — Recurrence
045. `feat(recurrence): add weekly recurrence contract and series metadata`
046. `feat(recurrence): generate office-local weekly occurrences across DST`
047. `feat(recurrence): create series transactionally`
048. `feat(recurrence): report conflicting occurrence and rollback series`
049. `feat(recurrence): cancel a single occurrence`
050. `feat(recurrence): cancel all active series occurrences`
051. `feat(schedule): include recurrence metadata in booking responses`
052. `test(recurrence): cover creation conflicts DST and cancellation`
053. `docs(recurrence): document series semantics and constraints`

## Phase 07 — Design system
054. `style(web): establish product design tokens and base typography`
055. `feat(ui): add focused form and action primitives`
056. `feat(ui): add loading empty error dialog and toast primitives`
057. `feat(shell): build authenticated app navigation shell`
058. `feat(rooms): add room selector and capacity filter UI`
059. `style(auth): align authentication screens with product design`
060. `fix(a11y): harden shell focus and responsive navigation`

## Phase 08 — Weekly grid
061. `feat(schedule): add office-week URL state and navigation`
062. `feat(schedule): generate timezone-aware thirty-minute slot model`
063. `feat(schedule): build custom seven-day CSS grid`
064. `feat(schedule): add sticky day headers and time rail`
065. `feat(schedule): map UTC bookings to grid position and duration`
066. `feat(schedule): render booking title author and ownership states`
067. `feat(schedule): highlight today and current time`
068. `feat(schedule): explain office timezone when user zone differs`
069. `feat(schedule): add loading empty and retry states`
070. `feat(schedule): preselect free slots for booking`
071. `feat(schedule): add booking detail interaction`
072. `fix(a11y): add keyboard focus behavior to slots and events`
073. `test(schedule): cover slot generation timezone and layout math`

## Phase 09 — Booking UX
074. `feat(book-form): add booking dialog and selected-slot defaults`
075. `feat(book-form): add validated date start end and title controls`
076. `feat(book-form): add weekly recurrence controls`
077. `feat(book-form): map API validation and conflict errors`
078. `feat(schedule): refresh grid and toast after successful booking`
079. `feat(cancel): add owner cancellation confirmation flow`
080. `feat(cancel): add occurrence-versus-series cancellation choice`
081. `test(web): cover booking and cancellation interaction states`

## Phase 10 — My Bookings and notifications
082. `feat(my-bookings): expose upcoming and paginated past booking queries`
083. `feat(my-bookings): build upcoming and past sections`
084. `feat(my-bookings): add schedule deep links and pagination states`
085. `feat(my-bookings): reuse cancellation flow for upcoming items`
086. `feat(notifications): add persistent notification service and API`
087. `feat(notifications): schedule idempotent ending-soon checks`
088. `feat(web): add notification bell unread state and toast delivery`
089. `test(notifications): cover idempotency cancellation and timing rules`

## Phase 11 — Mobile and accessibility
090. `feat(responsive): refine compact app shell and controls`
091. `feat(schedule): add mobile day chips and snap scrolling`
092. `feat(schedule): optimize sticky time rail and event cards for touch`
093. `feat(mobile): present booking and detail flows as bottom sheets`
094. `fix(a11y): improve focus labels contrast and reduced motion`
095. `test(a11y): add mobile viewport and axe smoke coverage`

## Phase 12 — Quality and security
096. `test(api): expand validation and authorization integration matrix`
097. `test(concurrency): harden race-condition regression coverage`
098. `test(e2e): add login booking deep-link and cancel smoke flow`
099. `fix(security): harden cookies headers cors and request limits`
100. `fix(api): sanitize production errors and remove sensitive logging`
101. `chore(deps): resolve safe dependency audit findings`
102. `refactor(core): remove dead code duplication and oversized modules`
103. `test(repo): stabilize root quality gates and test scripts`

## Phase 13 — Delivery
104. `chore(docker): add production multi-stage web and API images`
105. `chore(docker): add PostgreSQL compose stack and persistent volume`
106. `fix(docker): add healthchecks and reliable startup sequencing`
107. `ci(github): run format lint typecheck tests and builds`
108. `docs(readme): document clean-machine launch tests users and architecture`
109. `chore(repo): verify env template gitignore and clean-clone setup`

## Phase 14 — Release
110. `fix(release): resolve final requirement audit defects`
111. `docs(release): record verified requirement evidence and demo flow`
112. `chore(release): remove debug artifacts and finalize green release`

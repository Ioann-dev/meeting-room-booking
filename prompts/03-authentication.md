# Phase 03 — Authentication, persistent sessions and email verification

**Objective:** Deliver secure registration/login/logout plus the email-verification bonus.  
**Target:** 9 meaningful commits.

Execute Phase 03 only.

## Tasks

1. Build a NestJS auth module with server-side DTO validation.
2. Registration:
   - trim name and require non-empty;
   - trim + lowercase email before persistence/lookup;
   - unique canonical email;
   - password length 8–72 characters;
   - clear conflict/validation messages.
3. Hash passwords with Argon2id.
4. Login with canonicalized email and password verification.
5. Issue opaque database sessions in secure HttpOnly cookies.
6. Add a session/current-user endpoint and guard for protected endpoints.
7. Logout must revoke/delete the active server-side session and clear cookie.
8. Ensure session survives page reload.
9. Email verification bonus:
   - create single-use expiring token;
   - log a development verification URL instead of real SMTP;
   - verification endpoint consumes token safely;
   - repeated/expired token use returns clear errors;
   - user verification state is exposed safely to the client.
10. Booking authorization is not implemented here, but create reusable `verified` state/guard primitives for later.
11. Build polished login and registration pages with:
   - field errors;
   - pending state;
   - server error messages;
   - session restoration;
   - logout.
12. Add tests for normalization, duplicate email, password boundaries, login, session persistence, logout, verification expiry/reuse.

## Security

- no auth token in localStorage;
- secure cookie configuration per environment;
- do not log passwords, cookies, raw session tokens or verification-token secrets.

## Acceptance criteria

- `Ivan@x.com` and `ivan@x.com` cannot become separate accounts;
- valid session survives reload;
- logout invalidates it server-side;
- verification flow works without SMTP;
- auth tests pass.

## Verify and stop

Run auth tests plus lint/typecheck/build. Manually verify register → login → refresh → verification → logout. STOP.

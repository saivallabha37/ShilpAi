# PRD 01 — Authentication & Users

**Project:** ShilpAI (SIH26090)
**Module:** Authentication & User Management
**Status:** Approved — v1.1
**Depends on:** None (foundational module)
**Depended on by:** 02 (Artisan Profile), 03 (Product Management), 08 (B2B Market Linkage & Buyer Discovery), and transitively everything else

**Tagging convention used throughout:** `[CONFIRMED]` = stated in the official SIH26090 screenshot · `[PROPOSED]` = our design decision, made to serve a confirmed requirement, but not itself stated by the PS · `[ASSUMPTION]` = standard engineering practice with no PS basis at all, included because the system needs it to function.

### Changelog — v1.0 → v1.1 (approved revisions)
1. Kept artisan phone + OTP and buyer email + password (no change).
2. Kept one role per account for MVP (no change).
3. Relaxed the "≤3 screens/taps" NFR — replaced with a qualitative minimal-typing, minimal-steps, low-digital-literacy usability requirement.
4. Standardized all API paths to the full `/api/v1/auth/...` form throughout the document (previously shortened to `/auth/...` in the endpoint table).
5. Token lifetimes and rotation policy are now explicitly marked as implementation decisions, not fixed product requirements.
6. Added an explicit, isolated mock/test OTP mechanism as an MVP functional requirement, so real SMS delivery is never a development blocker.
7. Reaffirmed ADMIN as an architectural role only — no admin UI or feature expansion in MVP (no change in substance, made more explicit).

---

## 1. Objective

Provide a single, minimal-friction identity and access layer that lets two distinct user types — artisans and B2B/institutional buyers — securely register, authenticate, and be authorized to use their respective parts of ShilpAI, on a React Native (Expo) cross-platform client backed by a REST API.

This module does not decide what an artisan or buyer *does* once logged in — that's Product Management, Artisan Profile, and B2B Market Linkage. Its only job is: who is this user, are they who they claim to be, and what role do they hold.

## 2. Problem Being Solved

`[CONFIRMED]` The PS states beneficiaries are held back by low digital literacy and language barriers, and the app must be intuitive enough for someone with no technical skill. `[PROPOSED]` Applied to authentication specifically, this means: the login mechanism itself cannot assume comfort with typing, remembering complex passwords, or navigating multi-step account-recovery flows. A phone-OTP-based path for artisans is the auth-layer answer to that confirmed requirement, distinct from a typical developer-grade email/password flow.

`[ASSUMPTION]` Buyers are institutional/procurement-facing users (per Master Product Definition v2, Section 2.2/9) and can be assumed to have normal digital literacy, so a conventional email/password flow is appropriate for them without adding accessibility-driven complexity that isn't needed for that persona.

## 3. Scope

**In scope:**
- Account registration for two roles: `ARTISAN`, `BUYER`
- Login (role-appropriate mechanism), logout, session/token management
- Password reset (buyers) and OTP re-verification (artisans)
- Role-based access control (RBAC) enforcement at the API layer
- Basic account state: active, suspended, deleted
- A minimal `ADMIN` role for backend moderation actions — no dedicated admin UI/app (per Master Product Definition v2, Section "Out of Scope" — no separate admin app), but the role and its permission checks must exist so future moderation hooks (e.g., suspending a listing or account) have something to authorize against.

**Out of scope (belongs to other PRDs or explicitly excluded):**
- Artisan craft category, location, bio, portfolio → PRD 02
- Buyer organization details (company name, GSTIN, procurement category, etc.) beyond the minimum needed to create an account → PRD 08
- Social/OAuth login → Phase 2, per Master Product Definition v2
- KYC/business verification for institutional buyer accounts → Phase 2
- Any UI/UX for admin moderation actions → not built in MVP; only the role and permission model exist

## 4. Target Users

| Role | Description | Primary device/context |
|---|---|---|
| Artisan | Marginalized micro-entrepreneur/artisan/weaver listing products (per PS Background) `[CONFIRMED persona, PROPOSED role name]` | React Native mobile app, variable connectivity, possibly low digital literacy |
| Buyer | B2B/institutional buyer or government e-marketplace-aligned procurement contact `[CONFIRMED persona per PS Challenge text]` | Mobile or web, assumed normal digital literacy `[ASSUMPTION]` |
| Admin | Internal moderation role, no dedicated UI in MVP `[ASSUMPTION — standard practice]` | Backend/API access only |

## 5. User Stories

- As an artisan with limited English/typing comfort, I want to sign up and log in using just my phone number and an OTP, so that I don't need to remember a password or type in a language I'm not comfortable with.
- As an artisan, I want to stay logged in across app restarts, so that I don't have to re-authenticate every time I open the app to add a product.
- As a B2B buyer, I want to register with my email and a password, so that I can access the buyer-side discovery and inquiry features.
- As a buyer, I want to reset my password if I forget it, so that I'm not permanently locked out.
- As a system, I want every API request to know which role is making it, so that an artisan can never access buyer-only inquiry data and vice versa.
- As an admin (backend-only), I want the ability to mark an account as suspended, so that abusive or fraudulent accounts can be disabled without deleting their data.

## 6. Functional Requirements

**FR-1** System shall support artisan registration via phone number + OTP verification. `[PROPOSED]`
**FR-2** System shall support buyer registration via email + password, with password confirmation and email format validation. `[ASSUMPTION]`
**FR-3** System shall issue a short-lived access token and a longer-lived refresh token upon successful authentication (JWT-based). `[ASSUMPTION — standard practice]`
**FR-4** System shall allow token refresh without requiring re-authentication, until the refresh token itself expires or is revoked.
**FR-5** System shall support logout that invalidates the current refresh token.
**FR-6** System shall support OTP resend with a minimum cooldown (e.g., 30 seconds) to prevent abuse.
**FR-7** System shall support password reset for buyer accounts via an emailed reset link/token.
**FR-8** System shall enforce role-based access control at the API layer: every protected endpoint declares which role(s) may call it, and the system rejects mismatched roles with 403.
**FR-9** System shall store a single account status field (`active`, `suspended`, `deleted`) and reject authentication for non-active accounts with a clear reason.
**FR-10** System shall prevent duplicate accounts on the same phone number (artisans) or email (buyers).
**FR-11** System shall rate-limit OTP requests and login attempts per phone/email/IP to mitigate brute-force and OTP-spam abuse.
**FR-12** System shall expose a minimal `/api/v1/auth/me` endpoint returning the authenticated user's id, role, and status, for the client to bootstrap session state.
**FR-13** System shall provide a mock/test OTP mechanism (e.g., a deterministic test code, or a non-production endpoint that returns the OTP directly instead of sending an SMS) so that development and testing are never blocked on real SMS delivery. This mechanism must be strictly isolated from production behavior — see Section 16 for isolation requirements. `[PROPOSED, per v1.1 revision]`

## 7. Non-Functional Requirements

- **Usability:** the artisan OTP flow must minimize typing (phone number and a 6-digit code only — no names, passwords, or free text), minimize the number of steps between app open and authenticated state, and avoid any language-dependent input, given the confirmed low-digital-literacy and language-barrier constraints. This is a qualitative requirement, not a fixed screen/tap count — usability should be validated with a real or representative low-literacy user before demo day, not just against a spec number. `[PROPOSED, tied to CONFIRMED requirement]`
- **Performance:** auth endpoints (login, OTP verify, token refresh) should respond in <500ms under normal load; this is a 2-person-team hackathon prototype, not a production SLA commitment.
- **Reliability:** OTP delivery depends on a third-party SMS provider — see Risks (Section 23) for fallback behavior.
- **Portability:** auth client logic must work identically across the Expo-managed iOS and Android builds (no platform-specific auth code paths) to respect the "cross-platform" requirement without doubling implementation effort.
- **Maintainability:** given the 2-person constraint, auth is built once as a shared backend service consumed by both artisan and buyer client flows — not two separate auth systems.

## 8. User Flow

**Artisan registration/login (OTP-based):**
1. Open app → select "I'm an Artisan"
2. Enter phone number
3. Receive OTP via SMS, enter OTP
4. On success: account created (if new) or logged in (if existing), redirected to Artisan Profile setup (PRD 02) if profile incomplete, otherwise to home

**Buyer registration/login (email/password):**
1. Open app or web → select "I'm a Buyer"
2. Enter email, organization contact name, password (+confirm)
3. Verify email is not already registered → create account
4. Login: email + password → on success, redirected to buyer discovery (PRD 08) or profile completion if required there

**Session persistence:**
- Access token stored in memory; refresh token stored in secure device storage (Expo SecureStore) — not AsyncStorage, given it's a credential. `[ASSUMPTION — standard security practice]`
- On app relaunch, client attempts silent refresh using the stored refresh token before falling back to the login screen.

**Password reset (buyers only):**
1. "Forgot password" → enter email
2. System emails a time-limited reset link/token
3. User sets new password → all existing refresh tokens for that account are revoked, forcing re-login on other devices

## 9. Inputs

- Artisan: phone number (E.164 format expected), OTP code
- Buyer: email, password, password confirmation, contact name
- Token refresh: refresh token (from secure storage)
- Password reset: email, reset token, new password

## 10. Outputs

- Access token (JWT, short-lived — exact duration is an implementation decision, not fixed by this PRD)
- Refresh token (opaque or JWT, longer-lived than the access token — exact duration and rotation policy are implementation decisions, see Section 11)
- User object: `{ id, role, status, createdAt }` — no profile fields here, those belong to PRD 02/08
- Standard error responses with machine-readable error codes (see Section 17)

## 11. Business Rules

- A phone number maps to exactly one artisan account. `[PROPOSED]`
- An email maps to exactly one buyer account. `[ASSUMPTION]`
- A single account cannot hold both `ARTISAN` and `BUYER` roles — role is chosen at registration and is not switchable by the user. `[PROPOSED — keeps RBAC simple for a 2-person team; revisit only if the PS or a real use case demands dual roles]`
- OTP codes are valid for a short window (e.g., 5 minutes) and single-use.
- Suspended accounts cannot authenticate but their data is retained (not deleted), so moderation is reversible.
- Refresh tokens must be revocable (server-side record, not pure stateless JWT) so that logout, password reset, and account suspension can actually take effect. Whether refresh tokens additionally rotate on every use, and the exact access/refresh token lifetimes, are implementation decisions left to whoever builds this — standard, sensible defaults (short access token, longer revocable refresh token) are expected, but this PRD does not mandate specific numbers or a specific rotation scheme. `[ASSUMPTION — standard practice, deliberately left flexible per v1.1 revision]`

## 12. AI/ML Requirements

Not applicable. Authentication is deterministic, rule-based, and explicitly should **not** involve AI/ML — flagging this here to be clear that no AI budget (cost, latency, model choice) needs to be allocated to this module, unlike PRDs 04, 05, 06, 07.

## 13. API Requirements

All endpoints use the full path prefix `/api/v1/auth/` consistently.

| Method | Endpoint | Purpose | Auth required |
|---|---|---|---|
| POST | `/api/v1/auth/artisan/otp/request` | Request OTP for a phone number | No |
| POST | `/api/v1/auth/artisan/otp/verify` | Verify OTP, create/login artisan | No |
| POST | `/api/v1/auth/buyer/register` | Register buyer account | No |
| POST | `/api/v1/auth/buyer/login` | Buyer email/password login | No |
| POST | `/api/v1/auth/token/refresh` | Exchange refresh token for new access token | Refresh token |
| POST | `/api/v1/auth/logout` | Invalidate current refresh token | Access token |
| POST | `/api/v1/auth/buyer/password/forgot` | Request password reset email | No |
| POST | `/api/v1/auth/buyer/password/reset` | Set new password using reset token | Reset token |
| GET | `/api/v1/auth/me` | Return current authenticated user's id/role/status | Access token |
| POST | `/api/v1/auth/artisan/otp/mock-request` *(non-production only)* | Issue a deterministic test OTP without sending a real SMS | No |

All protected endpoints across the whole system (not just this module) are expected to consume a standard middleware that validates the access token and attaches `{ userId, role }` to the request context — this is the contract other PRDs' APIs will depend on.

## 14. Data Requirements

Minimum fields needed to authenticate and authorize — nothing more:

**User (shared table/collection):**
- `id` (UUID, primary key)
- `role` (enum: `ARTISAN`, `BUYER`, `ADMIN`)
- `status` (enum: `active`, `suspended`, `deleted`)
- `createdAt`, `updatedAt`

**ArtisanCredential:**
- `userId` (FK)
- `phoneNumber` (unique, indexed)
- `phoneVerifiedAt`

**BuyerCredential:**
- `userId` (FK)
- `email` (unique, indexed)
- `passwordHash`
- `emailVerifiedAt` (nullable — email verification itself is `[PROPOSED, optional for MVP]`, see Future Scope)

**OtpCode** (short-lived, can be a cache/table with TTL):
- `phoneNumber`, `code` (hashed, not plaintext), `expiresAt`, `attempts`

**RefreshToken:**
- `id`, `userId`, `tokenHash`, `expiresAt`, `revokedAt` (nullable)

## 15. Database Considerations

- Single relational database (PostgreSQL, per the eventual stack recommendation) is sufficient — no need for a separate auth database or service for a 2-person team's MVP. `[PROPOSED — avoids overengineering]`
- OTP codes should live in a table with a TTL/expiry or a lightweight cache (e.g., Redis) if available; a plain table with an `expiresAt` column and a cleanup job is acceptable for MVP and avoids adding Redis as a new piece of infrastructure just for this.
- Store password and OTP hashes only — never plaintext. Use bcrypt/argon2 for passwords, a simple keyed hash (or bcrypt) for OTPs.
- Index `phoneNumber` and `email` for fast lookup; both are UNIQUE constraints, not just indexes, to enforce Business Rule (Section 11).

## 16. Security & Privacy

- Passwords hashed with bcrypt (or argon2), never logged, never returned in any API response.
- OTP codes are 6-digit, single-use, short-expiry, and rate-limited per phone number and per IP to prevent SMS-bombing abuse.
- JWT access tokens signed with a server-held secret (or asymmetric key pair), short expiry, no sensitive data in the payload beyond `userId` and `role`.
- Refresh tokens stored server-side (hashed) so they can be revoked (e.g., on logout, password reset, or suspicious activity) — a pure stateless-JWT refresh approach would make revocation impossible, which is unacceptable for account suspension to actually work.
- All auth endpoints served over HTTPS only; no auth traffic over plain HTTP even in development past the earliest local testing.
- Phone numbers and emails are treated as PII: not exposed in any public-facing API response (e.g., buyer discovery pages must never leak an artisan's phone number directly — that's the inquiry mechanism's job in PRD 08, not this one's).
- **Mock/test OTP isolation (FR-13):** the mock OTP path must be unreachable in production — gated behind an environment flag (e.g., `NODE_ENV`/`APP_ENV` check) that is off by default and never enabled in the deployed/demo build unless deliberately toggled for a controlled fallback demo. The mock path must never real-send an SMS, must never be reachable using a real user's phone number in a way that bypasses verification in production, and must be clearly logged/labeled as a non-production code path so it can't be mistaken for a security hole during review.

## 17. Error Handling

Standard error shape: `{ "error": { "code": "STRING_CODE", "message": "human-readable" } }`

| Scenario | Code | HTTP status |
|---|---|---|
| OTP expired | `OTP_EXPIRED` | 400 |
| OTP incorrect | `OTP_INVALID` | 400 |
| Too many OTP attempts | `OTP_RATE_LIMITED` | 429 |
| Phone/email already registered | `ACCOUNT_EXISTS` | 409 |
| Invalid credentials (buyer login) | `INVALID_CREDENTIALS` | 401 |
| Account suspended/deleted | `ACCOUNT_INACTIVE` | 403 |
| Expired/invalid refresh token | `TOKEN_INVALID` | 401 |
| Role mismatch on protected endpoint | `FORBIDDEN_ROLE` | 403 |
| Malformed/missing required field | `VALIDATION_ERROR` | 400 |

## 18. Edge Cases

- Artisan requests OTP, doesn't receive SMS (carrier delay/failure) → resend allowed after cooldown; UI should show "didn't receive it?" affordance, not force a full retry from scratch.
- Artisan changes phone number/loses SIM → no self-service phone-number change in MVP; flagged as Future Scope, since this needs identity re-verification design.
- Buyer registers with an email that exists but was never verified → allow re-registration attempt to resend verification rather than hard-blocking (avoids permanently locking out a user who mistyped and abandoned a first attempt) — `[PROPOSED]`.
- If refresh token rotation is implemented (see Section 11), a rotated-out token being reused (possible token theft indicator) should revoke the entire token family for that user as a precaution. If rotation is not implemented for MVP, this edge case does not apply, but revocation on logout/suspension must still work regardless. `[ASSUMPTION — standard practice, conditional on the implementation choice made per Section 11]`
- Concurrent OTP requests for the same number in quick succession → only the most recent OTP is valid; older ones are invalidated.
- User attempts to log in with a suspended account → clear, non-generic error message (`ACCOUNT_INACTIVE`), not a silent failure, so a legitimately confused artisan isn't left guessing.

## 19. Acceptance Criteria

- [ ] An artisan can register and log in using only a phone number and OTP, with no password involved anywhere in that flow.
- [ ] A buyer can register and log in using email and password, including password reset via email.
- [ ] Every protected API endpoint rejects requests from a mismatched role with `FORBIDDEN_ROLE`/403.
- [ ] A logged-out session's refresh token no longer works for token refresh.
- [ ] A suspended account cannot authenticate but its underlying data remains intact in the database.
- [ ] No plaintext password or OTP is ever present in logs, database columns, or API responses.
- [ ] The same auth client code path runs on both iOS and Android Expo builds without platform-specific branches.
- [ ] The mock/test OTP mechanism works in development/test environments and is verifiably unreachable when the production environment flag is set.
- [ ] The artisan login flow requires no typed input beyond a phone number and a 6-digit code, and involves no language-dependent text entry.

## 20. MVP Scope

Everything in Sections 6 and 13 above **is** the MVP — this module is intentionally small. Explicitly confirmed as MVP:
- Artisan OTP login, buyer email/password login, JWT access/refresh tokens, logout, password reset, RBAC middleware, account status enforcement.

## 21. Future Scope

- Email verification enforcement for buyers (currently optional/soft in MVP)
- Social/OAuth login options
- Phone number change / account recovery flows for artisans
- Multi-factor authentication for buyer accounts (institutional buyers may eventually need this for procurement-system trust)
- Admin UI for account moderation (currently role/permissions exist, but no interface)
- Dual-role accounts, if a real use case emerges (e.g., an artisan cooperative that is also a buyer)

## 22. Dependencies

- **Upstream:** none — this is the foundational module.
- **Downstream:** PRD 02 (Artisan Profile) requires an authenticated `ARTISAN` user to attach profile data to. PRD 03 (Product Management) requires the same for product ownership. PRD 08 (B2B Market Linkage) requires an authenticated `BUYER` user for the inquiry/RFQ mechanism. All API requirements elsewhere in the system depend on the RBAC middleware contract defined in Section 13.
- **External:** SMS/OTP delivery provider (e.g., an SMS gateway API) for artisan login; email delivery provider (e.g., SMTP/transactional email service) for buyer password reset.

## 23. Risks

- **SMS OTP delivery reliability/cost:** third-party SMS providers can be slow, rate-limited on trial/free tiers, or geographically inconsistent — a real risk for a live demo. Mitigated structurally by FR-13/Section 16's mock OTP mechanism, but the real-SMS path should still be tested with the chosen provider well before demo day so the mock path isn't the only one that's ever been exercised.
- **Expo + SecureStore learning curve:** if neither team member has used Expo's secure storage or JWT handling in React Native before, this can eat more time than expected in Week 1–2. Mitigation: timebox a short spike early to validate the auth flow end-to-end (even with dummy data) before building on top of it.
- **Over-scoping RBAC:** it would be easy to over-engineer a permissions system (granular scopes, policy engines, etc.) that a 2-person team doesn't need. Mitigation: this PRD deliberately limits RBAC to three flat roles — resist adding more granularity unless a concrete downstream PRD requires it.
- **Dual-role edge case surfacing late:** if a real B2B buyer turns out to also be an artisan cooperative (plausible given the PS's cooperative/cluster framing), the "one role per account" rule (Section 11) could become a real limitation. Mitigation: flagged explicitly in Future Scope rather than solved preemptively — don't build for a case that hasn't been confirmed as necessary.

## 24. Testing Requirements

- **Unit tests:** OTP generation/expiry logic, password hashing/verification, JWT issuance/validation, RBAC middleware role-matching logic.
- **Integration tests:** full registration → login → protected-endpoint-call flow for both artisan and buyer paths; token refresh flow; logout invalidation; password reset flow end-to-end.
- **Security-focused tests:** rate limiting on OTP request endpoint; rejection of expired/reused refresh tokens; rejection of role-mismatched requests on a sample protected endpoint.
- **Manual/device testing:** the real-SMS OTP flow must be manually tested on a real device with a real SIM at least once before demo day — SMS delivery behavior doesn't fully surface in emulators/simulators. The mock OTP path should be the default for day-to-day development so this is never a blocker.
- **Isolation testing:** a specific test must confirm the mock/test OTP endpoint is disabled/unreachable when the production environment flag is set, given its security sensitivity (Section 16).
- **Out of scope for this PRD's testing:** load/performance testing beyond basic response-time sanity checks — not a meaningful investment for a hackathon-scale prototype.

# PRD 02 — Artisan Profile

**Project:** ShilpAI (SIH26090)
**Module:** Artisan Profile
**Status:** Approved — v1.1
**Depends on:** 01 (Authentication & Users) — requires an authenticated `ARTISAN` user
**Depended on by:** 03 (Product Management — products are owned by a profile), 08 (B2B Market Linkage — buyers see profile info for sourcing context)

**Tagging convention:** `[CONFIRMED]` = stated in the official SIH26090 screenshot · `[PROPOSED]` = our design decision serving a confirmed requirement · `[ASSUMPTION]` = standard practice, no PS basis.

### Changelog — v1.0 → v1.1 (approved revisions)
1. Core scope unchanged: profile, craft category, state/district location, bio, optional photo, completeness, buyer-facing view.
2. Public-profile endpoint is now `BUYER`-authenticated only for MVP — not publicly accessible. Fully public/shareable profiles moved to Future Scope.
3. Objective and framing reworded: the profile provides *contextual information* to help buyers evaluate products and potential sourcing relationships. ShilpAI does not verify or guarantee artisan authenticity — that would be a verification feature, explicitly out of scope.
4. Explicitly clarified: profile completeness is guidance/nudging only and must never block product creation.
5. Location remains a static/seeded state → district reference dataset — no separate location service or external API.
6. Voice-to-text bio remains an optional, non-blocking dependency on PRD 06.
7. Profile photos remain explicitly separate from product-image AI processing (PRD 04).

---

## 1. Objective

Let an authenticated artisan build a minimal profile — who they are, what craft they practice, where they're based, and their story — that (a) gives Product Management something to attach listings to, and (b) gives B2B/institutional buyers contextual information to help them evaluate products and consider potential sourcing relationships, which matters more for institutional procurement than for anonymous retail.

This module does not verify or guarantee artisan authenticity, identity, or the accuracy of any profile claim — it presents self-reported information for buyer context, not a certification. Verification/badging is explicitly out of scope (Future Scope, Section 21). It also does not handle product listings, pricing, or catalog content — that's PRD 03/05/07 — nor buyer-side organization profiles — that's PRD 08.

## 2. Problem Being Solved

`[CONFIRMED]` The PS frames the app as a "virtual business manager" and explicitly names Heritage & Culture as the theme, with the Background text referencing government-run physical channels (Shilp Samagam, Surajkund Mela, Dilli Haat) that give artisans temporary, face-to-face market exposure. `[PROPOSED]` A digital profile is this module's answer to giving buyers the kind of contextual information they'd otherwise only get by meeting an artisan in person at one of those fairs — craft background, location, and story — without it, a listing is just a product with a price, and the PS's Heritage & Culture framing goes unaddressed. This is presented as context for the buyer's own evaluation, not as a system-issued guarantee of authenticity.

## 3. Scope

**In scope:**
- Profile creation/edit: name, craft category, location, short bio/story, profile photo
- Craft category taxonomy (a fixed, extensible list — not free text) since PRD 05 (catalog) and PRD 07 (pricing) both need a consistent category to work against
- Profile completeness state (used to gate/nudge product creation, not to block it)
- Public-facing profile view (what a buyer sees) vs. self-edit view

**Out of scope:**
- Product listings and inventory → PRD 03
- AI-generated descriptions of the artisan's craft → not requested by the PS for profiles; catalog AI (PRD 05) applies to products, not artisan bios
- Verification/badging (e.g., "verified artisan") → Phase 2, no PS basis for MVP
- Cooperative/group accounts (multiple artisans under one profile) → Phase 2; flagged as a real possibility given the PS's cluster/cooperative framing, but not built now (see PRD 01 Risks)
- Buyer-side profile/organization details → PRD 08

## 4. Target Users

Same as PRD 01: the `ARTISAN` role only. This PRD has no buyer-facing input surface, only a buyer-facing *read* surface (Section 8).

## 5. User Stories

- As a newly registered artisan, I want to set up my profile with minimal typing, so that I can get to listing products quickly rather than filling out a long form.
- As an artisan, I want to select my craft category from a list rather than typing it, so that I don't need to know the "correct" English term for my craft.
- As an artisan, I want to add a short story about myself or my craft, optionally by voice, so that I don't need to be comfortable writing in English to give buyers meaningful context. `[PROPOSED — ties to the confirmed language-barrier requirement]`
- As an artisan, I want to edit my profile later, so that incorrect information isn't permanent.
- As a B2B buyer, I want to see an artisan's craft category, location, and story before considering their products, so that I can evaluate authenticity and sourcing fit for myself.
- As the system, I want to know whether a profile is "complete enough," so I can gently nudge artisans toward filling in more detail without ever blocking them from using the app.

## 6. Functional Requirements

**FR-1** System shall allow an authenticated artisan to create a profile with: display name, craft category (single-select from taxonomy), location (state + district/city level, not precise geolocation), short bio (text, optionally via voice-to-text), profile photo (optional).
**FR-2** System shall allow the artisan to edit any profile field after creation.
**FR-3** System shall provide a fixed, extensible craft category taxonomy (e.g., Handloom & Weaving, Pottery & Ceramics, Wood Carving, Metalwork, Embroidery & Textile Art, Leatherwork, Jewelry & Ornaments, Other) rather than free-text category entry. `[PROPOSED]`
**FR-4** System shall compute a profile completeness flag (`incomplete` / `complete`) based on required fields (name, craft category, location — bio and photo are optional for MVP completeness, see Section 11).
**FR-5** System shall expose an artisan profile view (name, craft category, location, bio, photo, and a list/count of their published products — the latter populated by PRD 03, not this PRD) to authenticated `BUYER` users only. Not publicly accessible in MVP.
**FR-6** System shall support voice input for the bio field, reusing the STT capability defined in PRD 06, with manual text as the always-available fallback. `[PROPOSED, dependency noted in Section 22]`
**FR-7** System shall allow the artisan to upload/replace a single profile photo, with basic client-side size/format validation (not AI-processed — that's PRD 04's domain, and only for product images, not profile photos, per Section 3 scope).

## 7. Non-Functional Requirements

- **Usability:** profile setup must minimize typing and avoid requiring English literacy wherever possible — category selection is tap-based, location is a guided picker (state → district) rather than free text, and bio supports voice input. This mirrors the same low-digital-literacy usability requirement established in PRD 01 v1.1, applied here to profile setup specifically.
- **Performance:** profile read/write endpoints should respond in well under 1s under normal load — this is not a heavy-compute module.
- **Consistency:** the craft category taxonomy defined here (FR-3) is the single source of truth other modules must reference — PRD 05 and PRD 07 should consume this list, not define their own.

## 8. User Flow

**First-time profile setup (immediately after PRD 01 artisan OTP login, if profile is incomplete):**
1. Enter/confirm display name
2. Select craft category from a visual list (icon + label, not a dropdown of plain text) `[PROPOSED]`
3. Select location: state → district/city (two guided taps, not typed)
4. Optional: record or type a short bio
5. Optional: upload a profile photo
6. Save → profile marked `complete` if required fields are present → proceed to Product Management (PRD 03)

**Editing later:**
1. From profile view, tap edit
2. Same fields, pre-filled
3. Save → re-evaluates completeness flag

**Buyer viewing a profile (read-only, requires `BUYER` authentication; entry point owned by PRD 08):**
1. Authenticated buyer taps into an artisan's profile from a product or search result
2. Sees name, craft category, location, bio, photo, published product count/list

## 9. Inputs

- Display name (text)
- Craft category (selection from fixed taxonomy)
- Location (state, district/city — from a guided picker, not free text)
- Bio (text, or voice input transcribed via PRD 06's STT service)
- Profile photo (image file)

## 10. Outputs

- Artisan profile object: `{ userId, name, craftCategory, location: { state, district }, bio, photoUrl, completeness, createdAt, updatedAt }`
- **Public profile view** (buyer-facing, minus phone number, which lives in PRD 01's credential table and is never joined into this response). Same object structure as the self-view, restricted to `BUYER`-authenticated requests.

## 11. Business Rules

- A profile belongs to exactly one `ARTISAN` user (1:1), consistent with PRD 01's one-role-per-account rule.
- Required fields for `complete` status: name, craft category, location. Bio and photo are encouraged but not required — forcing them would conflict with the minimal-friction usability requirement, and an artisan should be able to list products even with a bare-minimum profile.
- **Profile completeness is guidance/nudging only.** It must never block or gate product creation (PRD 03) or any other artisan action — an `incomplete` profile is a signal for the UI to gently prompt the artisan to fill in more detail, not a permission check. `[PROPOSED, made explicit per v1.1]`
- Craft category is single-select for MVP — an artisan practicing multiple crafts selects their primary one; multi-category support is Future Scope, not needed to prove the core requirement.
- Location is state + district-level only, not precise GPS — sufficient for buyer context, avoids unnecessary precision/privacy exposure for an individual artisan's exact address. `[ASSUMPTION — reasonable privacy-conscious default]`

## 12. AI/ML Requirements

This PRD's only AI touchpoint is the optional voice-to-text bio field, which is a **consumer of PRD 06's speech-to-text service**, not a new AI capability defined here. No image AI, no NLP structuring, no pricing logic belongs to this module — profile photos are stored as-is (no enhancement), and bios are stored as plain transcribed/typed text with no AI-generated rewriting (that distinction matters: PRD 05's AI-generated descriptions apply to *products*, not to an artisan's personal bio, which should stay in the artisan's own words). No AI or system logic in this module verifies, scores, or certifies the truthfulness of any profile field — all profile content is self-reported by the artisan and presented to buyers as-is.

## 13. API Requirements

All endpoints use the `/api/v1/profile` prefix.

| Method | Endpoint | Purpose | Auth required |
|---|---|---|---|
| GET | `/api/v1/profile/me` | Get the authenticated artisan's own profile | `ARTISAN` |
| PUT | `/api/v1/profile/me` | Create/update the authenticated artisan's profile | `ARTISAN` |
| POST | `/api/v1/profile/me/photo` | Upload/replace profile photo | `ARTISAN` |
| GET | `/api/v1/profile/{artisanId}` | Get an artisan profile (buyer-facing read) | `BUYER` |
| GET | `/api/v1/profile/craft-categories` | List the fixed craft category taxonomy | No (public reference data) |

## 14. Data Requirements

**ArtisanProfile:**
- `userId` (FK to User from PRD 01, unique — 1:1)
- `name` (string)
- `craftCategory` (enum/FK to CraftCategory reference table)
- `locationState` (string, from a fixed state list)
- `locationDistrict` (string)
- `bio` (text, nullable)
- `photoUrl` (string, nullable — points to file storage, not the file itself)
- `completeness` (enum: `incomplete`, `complete`)
- `createdAt`, `updatedAt`

**CraftCategory (reference table):**
- `id`, `label`, `iconRef` — seeded once, extensible later without a schema change

## 15. Database Considerations

- `ArtisanProfile` lives in the same PostgreSQL database as the auth tables (PRD 01), joined via `userId` — no separate service, consistent with the 2-person-team, no-microservices direction set in PRD 01.
- Profile photo itself is stored in file storage (e.g., S3-compatible bucket or equivalent), with only the URL/reference stored in the database — same pattern PRD 04 will use for product images.
- `CraftCategory` as a small reference table (not a hardcoded enum in application code) so it can be extended without a deploy, while still being a fixed, curated list rather than free text.
- The state → district location data (FR-1) is a static, seeded reference dataset in the same database — not a call to an external location/geocoding API or a separate location service. This keeps the module dependency-free and avoids adding infrastructure a 2-person team doesn't need for MVP. `[PROPOSED, made explicit per v1.1]`

## 16. Security & Privacy

- The artisan profile view (`GET /api/v1/profile/{artisanId}`) requires `BUYER` authentication for MVP — it is not publicly accessible. This is a deliberate MVP decision to keep artisan-facing data behind an authenticated relationship rather than fully open on the internet; fully public/shareable profiles are Future Scope (Section 21), not built now.
- This endpoint must never expose the artisan's phone number — that data lives in PRD 01's `ArtisanCredential` table and is never joined into this endpoint's response, regardless of the requester's role.
- Profile photo uploads must be validated for file type/size before storage to prevent abuse (not a full malware-scanning pipeline — out of scope for a 2-person hackathon MVP, but basic MIME-type and size checks are not optional).
- Location precision is intentionally coarse (state/district) as a privacy-by-default choice, not just a UX one.

## 17. Error Handling

| Scenario | Code | HTTP status |
|---|---|---|
| Profile not found for given artisan ID | `PROFILE_NOT_FOUND` | 404 |
| Invalid craft category value | `INVALID_CRAFT_CATEGORY` | 400 |
| Missing required field on save | `VALIDATION_ERROR` | 400 |
| Photo upload exceeds size/format limits | `INVALID_PHOTO` | 400 |
| Attempt to edit another artisan's profile | `FORBIDDEN` | 403 |
| Non-`BUYER` (or unauthenticated) request to view an artisan profile | `FORBIDDEN_ROLE` | 403 |

## 18. Edge Cases

- Artisan skips profile setup entirely after login → allowed; profile stays `incomplete`, but the artisan is never hard-blocked from exploring the app or creating products. PRD 03 may choose to show a gentle completion nudge, but completeness is never a permission check anywhere in the system (see Section 11).
- Artisan selects "Other" for craft category → stored as-is; if "Other" usage becomes common, that's a signal to expand the taxonomy (Future Scope), not something this PRD needs to solve now.
- Voice-to-text bio produces garbled/incorrect text → artisan can always edit the transcribed text manually before saving; this PRD does not attempt to auto-correct transcription errors (that's PRD 06's concern, not this one's).
- Artisan uploads a very large photo file → rejected with `INVALID_PHOTO` and a clear size-limit message rather than a silent failure or slow upload.
- Two artisans genuinely share a very similar name → no deduplication logic needed; names are not a uniqueness constraint (phone number, from PRD 01, is the actual identity key).

## 19. Acceptance Criteria

- [ ] An authenticated artisan can create a profile using only tap-based selection for category and location, with no typing required except their name.
- [ ] Bio can be entered via voice or text.
- [ ] A profile with name, category, and location set is marked `complete`; one missing any of those three is `incomplete`.
- [ ] A `BUYER`-authenticated user can view an artisan's profile without seeing their phone number; a non-authenticated or non-`BUYER` request is rejected with `FORBIDDEN_ROLE`.
- [ ] Craft category values are constrained to the taxonomy — no free-text categories are stored.
- [ ] An artisan cannot edit another artisan's profile.
- [ ] An artisan with an `incomplete` profile can still create and publish products in PRD 03 — completeness is never a hard gate.

## 20. MVP Scope

Everything in Sections 6 and 13 is the MVP. Voice input for bio (FR-6) is included in MVP scope because it directly serves the confirmed language-barrier requirement, but it is a thin dependency on PRD 06 — if PRD 06's STT isn't ready when this module is built, text-only bio entry is an acceptable temporary fallback without blocking the rest of this PRD.

## 21. Future Scope

- Verified-artisan badges
- Cooperative/group profiles (multiple artisans under one entity)
- Multi-category craft selection
- Richer media (multiple photos, short video intro)
- Profile analytics (views, buyer interest) surfaced back to the artisan

## 22. Dependencies

- **Upstream:** PRD 01 (`ARTISAN` authenticated user required for all write operations).
- **Soft dependency:** PRD 06 (voice-to-text) for the optional bio voice input — not a hard blocker, see Section 20.
- **Downstream:** PRD 03 (products reference `ArtisanProfile` for ownership/display), PRD 08 (buyer-facing product and search views surface profile data for buyer context).

## 23. Risks

- **Craft category taxonomy is a real design artifact, not a throwaway list.** If it's too coarse, PRD 05/07 lose useful signal (e.g., pricing by category baseline); if it's too granular, artisans struggle to self-categorize. Mitigation: keep the MVP list short (8–10 categories) and treat "Other" usage as a signal to revisit, not a failure.
- **Voice bio depending on PRD 06 timing.** Mitigation already built into Section 20 — text fallback keeps this PRD unblocked regardless of PRD 06's build order.

## 24. Testing Requirements

- **Unit tests:** completeness-flag computation logic, craft category validation, location validation against the fixed state/district reference data.
- **Integration tests:** full create → edit → public-view flow; forbidden-edit-of-another-profile check; photo upload validation (valid and invalid file cases).
- **Manual testing:** run the tap-based category/location flow with someone unfamiliar with the app to sanity-check the low-digital-literacy usability requirement — this is the kind of thing that's easy to assume works and only actually validated by watching someone else use it.

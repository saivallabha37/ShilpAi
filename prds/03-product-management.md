# PRD 03 — Product Management

**Project:** ShilpAI (SIH26090)
**Module:** Product Management
**Status:** Approved — v1.1 (cross-PRD reconciliation pass)
**Depends on:** 01 (Authentication & Users), 02 (Artisan Profile — ownership + shared craft taxonomy)
**Depended on by:** 04 (AI Image Processing), 05 (AI Catalog Generation), 06 (Voice & Multilingual), 07 (AI Price Recommendation), 08 (B2B Market Linkage & Buyer Discovery)

**Tagging convention:** `[CONFIRMED]` = stated in the official SIH26090 screenshot · `[PROPOSED]` = our design decision serving a confirmed requirement · `[ASSUMPTION]` = standard practice, no PS basis.

---

## 0. Changes Made (v1.0 → v1.1)

This was a reconciliation pass, not a redesign. Scope, architecture, and feature set are unchanged.

1. **`rawDescription` is now explicitly nullable.** A `draft` may exist with no description at all. Voice is one optional input path into this single text field — never a separate required artifact, never a blocker. Manual text entry is always available (Sections 6, 11, 14).
2. **Voice/transcription removed from every readiness gate.** PRD 06 is confirmed as a *soft, optional* dependency: it writes into `rawDescription` before submission and has no status flag, no gate, and no bearing on `ready_for_review` (Sections 8, 11, 22).
3. **`ready_for_review` redefined as "all AI stages reached a terminal state."** Terminal means `done` **or** `failed`. Previously v1.0 said "once all three come back `done`," which contradicted PRD 04's explicit raw-image fallback and PRD 05's FR-11. No AI failure can now strand a product in `processing` (Sections 8, 11).
4. **Failure-vs-fallback behavior made exhaustive and unambiguous** — a new Section 11a table states, per AI stage, exactly what a `failed` status does and does not prevent. Short version: nothing blocks `ready_for_review`; publish requirements are independent of AI success (Section 11a).
5. **Stale-result protection given a concrete mechanism.** v1.0 described the race condition but left the fix undefined. v1.1 introduces monotonic `inputVersion` (product) and `sourceVersion` (image), stamped onto each dispatched job and re-checked on write-back; mismatched results are discarded (Sections 11b, 14, 18).
6. **Published-product editing split into minor vs. material edits** with defined server-side behavior for each. Listings are never silently taken down by an edit (Sections 8, 11c).
7. **Publish requirements restated precisely:** ≥1 image with a valid display representation (processed **or** raw) + artisan-set `price` + a non-empty description from any source (artisan-typed, artisan-edited, or AI-generated). Catalog AI failure is explicitly substitutable by artisan-entered content (Section 11).
8. **Data model corrected against PRDs 04 and 05.** `generatedDescription` removed from `Product` (it lives in PRD 05's `ProductCatalog`, and duplicating it would have created two sources of truth). `ProductImage` extended with the fields PRD 04 v1.1 actually writes: `thumbnailUrl`, `useRawImage`, `processingMetadata`, `qualityWarnings`, `processedAt` (Section 14).
9. **`effectiveImageUrl` defined as a derived resolution rule**, not a stored column, so PRD 04's `useRawImage` toggle and `failed` fallback resolve identically everywhere (Section 11a).
10. **API contract aligned** — ownership of `/catalog/*`, `/images/{imageId}/reprocess`, and `/images/{imageId}/use-raw` endpoints explicitly assigned to PRDs 05 and 04 rather than restated here (Section 13).

---

## 1. Objective

Give an authenticated artisan a way to create, edit, and manage product listings — the raw record of what they're selling, in their own words and images — and give the system a single, well-defined state machine that PRDs 04, 05, and 07 hook into to enhance that record with AI, and that PRD 08 reads from once a product is publish-ready.

This module owns the product entity, its lifecycle state, and raw CRUD operations. It performs **no AI processing itself** — no image enhancement, no NLP structuring, no transcription, no price computation, no discovery logic. Its job is to define the data structure, the state machine, and the integration contract those modules build on, and to make "digitize their inventory" `[CONFIRMED]` concrete.

## 2. Problem Being Solved

`[CONFIRMED]` The PS requires the app to help artisans **digitize their inventory** and **optimize their listings using AI**, naming photographing, pricing, and cataloging as the specific skills artisans lack. `[PROPOSED]` Before any AI can enhance a photo, structure a description, or recommend a price, there must be a product record to attach to and a clear signal for when that record is ready for processing, ready for review, or live. Without this module, PRDs 04/05/07 have nothing to operate on and PRD 08 has nothing to display.

## 3. Scope

**In scope:**
- Product CRUD (soft-delete/archive, never hard-delete)
- Raw artisan-entered fields: name, `rawDescription` (nullable), materials, production time, quantity, category
- Raw image upload, ordering, deletion — storage only, no processing
- Lifecycle state machine: `draft` → `processing` → `ready_for_review` → `published`, plus `unpublished` and `archived`
- Status-flag integration contract consumed by PRDs 04, 05, 07
- Input versioning for stale-result protection
- Artisan "my products" list with status visibility
- Buyer-facing read access to `published` products only

**Out of scope (owned elsewhere):**
- Image enhancement/background removal → PRD 04
- AI description, structured extraction, translation → PRD 05
- Speech-to-text and translation engines → PRD 06 (this module only stores the resulting text)
- Price computation → PRD 07 (this module stores the suggestion and the artisan's final price)
- Search, filter, discovery, buyer inquiry/RFQ → PRD 08
- Bulk upload, inventory variants → Phase 2

## 4. Target Users

- `ARTISAN` — creates and manages their own products.
- `BUYER` — reads `published` products, consistent with PRD 02 v1.1's buyer-authenticated access model.

## 5. User Stories

- As an artisan, I want to create a product with very few required fields, so that I can start a listing before I have good photos or a polished description.
- As an artisan, I want to describe my product by voice *or* by typing, so that neither literacy nor a failing microphone stops me.
- As an artisan, I want to add multiple photos, so that buyers see the product from several angles.
- As an artisan, I want to know my product's status in plain language, so I know whether buyers can see it.
- As an artisan, I want a failed AI step never to strand my listing, so that I can still publish.
- As an artisan, I want to fix a price or quantity on a live listing without it disappearing from the marketplace.
- As a buyer, I want full product details so I can evaluate it for sourcing.
- As the system, I want unambiguous readiness signals so PRDs 04/05/07 know what to act on and PRD 08 knows what to show.

## 6. Functional Requirements

**FR-1** System shall allow an authenticated artisan to create a product with: `name` (required), `rawDescription` (**optional/nullable** — typed directly, or written by PRD 06 transcription before submission), `categoryId` (defaults to the artisan's craft category from PRD 02, editable), `materials`, `productionTime`, `quantityAvailable` (all optional at `draft`).
**FR-2** System shall accept manual text entry for `rawDescription` at all times, in every state where the field is editable, regardless of whether voice input is available or functioning. `[PROPOSED — v1.1: makes the PRD 06 fallback explicit at the data layer]`
**FR-3** System shall allow the artisan to upload one or more raw images per product (max configurable, default 5), retaining originals unmodified per PRD 04 FR-7.
**FR-4** System shall track `processingStatus` per image (`pending` | `processing` | `done` | `failed`), written by PRD 04.
**FR-5** System shall track `catalogStatus` per product (`pending` | `processing` | `done` | `failed`), written by PRD 05.
**FR-6** System shall track `priceStatus` per product and store `suggestedPriceRange`, written by PRD 07.
**FR-7** System shall enforce the lifecycle state machine (Section 8) server-side and reject invalid transitions.
**FR-8** System shall transition a product from `processing` to `ready_for_review` when **all three AI stages have reached a terminal state** (`done` or `failed`) — never requiring success (Section 11).
**FR-9** System shall maintain a monotonic `inputVersion` per product and `sourceVersion` per image, incremented on any material edit, and shall discard AI write-backs whose stamped version no longer matches (Section 11b).
**FR-10** System shall classify edits to a `published` product as **minor** or **material** and apply the defined behavior for each (Section 11c).
**FR-11** System shall allow unpublish (`published` → `unpublished`) without data loss.
**FR-12** System shall allow archive (soft-delete) from any state; archived products vanish from artisan active lists and all buyer views but persist in the database.
**FR-13** System shall expose a "my products" list to the owning artisan, filterable by status.
**FR-14** System shall expose list/detail views of `published` products to authenticated `BUYER` users only.
**FR-15** System shall expose `effectiveImageUrl` per image as a derived value (Section 11a) so consumers never re-implement fallback resolution.

## 7. Non-Functional Requirements

- **Usability:** reaching `draft` requires only a product name. Everything else — images, description, materials, time, quantity — is deferrable. This is the low-friction principle from PRDs 01/02 applied to product creation.
- **Consistency:** `categoryId` resolves against PRD 02's shared `CraftCategory` reference table. No parallel taxonomy.
- **Performance:** CRUD endpoints respond well under 1s. Image upload returns immediately with `processingStatus = pending`; it never blocks on processing.
- **Data integrity:** all state transitions and edit classifications are enforced server-side. PRD 08's buyer visibility depends entirely on this module reporting status correctly.
- **Resilience:** no AI stage failure may leave a product permanently in `processing` or permanently unpublishable.

## 8. User Flow

**Creation:**
1. Artisan taps "Add Product," enters a name → product saved as `draft`
2. Artisan adds photos, and describes the product by voice (transcribed by PRD 06 into `rawDescription`) or by typing, or leaves it empty for now
3. Artisan submits → requires ≥1 image (Section 11); status → `processing`; `inputVersion` stamped; PRDs 04, 05, 07 dispatched asynchronously
4. Each AI stage reports back a terminal status (`done` or `failed`)
5. When **all three** are terminal, status → `ready_for_review`
6. Artisan reviews processed images (with per-image accept/use-raw per PRD 04 FR-8), generated catalog content (editable per PRD 05 FR-7), and the suggested price range; sets a final `price`
7. Artisan taps Publish → `published`, visible to buyers

**Voice is never a gate.** Transcription happens before submission, writes into `rawDescription`, and has no status flag. A product whose voice capture failed simply has a typed or empty description and proceeds identically.

**Editing a published product:**
- **Minor edit** (`price`, `quantityAvailable`): applied immediately, product stays `published`, no reprocessing, no version bump
- **Material edit** (images, `rawDescription`, `materials`, `productionTime`, `categoryId`, `name`): applied immediately, product **stays `published`** (the listing is never silently removed), `inputVersion`/`sourceVersion` bumped, affected AI statuses reset to `pending`, reprocessing dispatched. Buyers continue seeing the last-good content until new results land (Section 11c).

**Buyer view:** authenticated buyer opens a product detail (navigation owned by PRD 08) and sees `effectiveImageUrl` images, final catalog content, price, materials, production time, and a link to the artisan profile.

## 9. Inputs

- `name` (text, required)
- `rawDescription` (text, **nullable** — typed, or PRD 06-transcribed)
- `categoryId` (from PRD 02 taxonomy)
- `materials`, `productionTime`, `quantityAvailable` (all optional at draft)
- Images (file uploads, up to the configured max)
- `price` (numeric, artisan-set; optionally informed by PRD 07's `suggestedPriceRange`)

## 10. Outputs

```
{
  id, artisanId, name,
  rawDescription,            // nullable
  categoryId, materials, productionTime, quantityAvailable,
  images: [{
    id, order,
    rawImageUrl, processedImageUrl,   // processedImageUrl nullable
    thumbnailUrl,                     // nullable, PRD 04
    processingStatus, useRawImage, qualityWarnings, processedAt,
    effectiveImageUrl                 // DERIVED, see 11a
  }],
  catalogStatus, priceStatus,
  suggestedPriceRange,       // nullable { min, max, currency } — PRD 07
  price,                     // nullable until artisan sets it
  status,                    // draft | processing | ready_for_review | published | unpublished | archived
  inputVersion,
  createdAt, updatedAt, publishedAt
}
```

Catalog content (`structuredFields`, `finalDescription`, translations) is **not** duplicated here — it is served from PRD 05's `ProductCatalog` / `ProductTranslation`, joined at detail-read time.

## 11. Business Rules

- A product belongs to exactly one artisan (`artisanId`, immutable).
- **Draft:** requires `name` only.
- **Submit (`draft` → `processing`):** requires ≥1 uploaded image. `rawDescription` may be null — a photo alone is a legitimate starting point, and PRD 05 handles sparse input explicitly (its Section 18).
- **`ready_for_review`:** reached when `processingStatus` for every image, plus `catalogStatus`, plus `priceStatus`, are all terminal (`done` or `failed`). **Success is not required.**
- **Publish (`ready_for_review` → `published`) requires all three:**
  1. ≥1 image with a non-null `effectiveImageUrl` (Section 11a) — processed or raw both qualify
  2. `price` set by the artisan
  3. A non-empty description from **any** source: artisan-typed `rawDescription`, artisan-edited catalog text, or PRD 05's generated description. **Catalog AI failure is fully substitutable by artisan-entered content** — it never blocks publishing.
- The artisan always sets the final price. `suggestedPriceRange` is advisory; a price outside it is allowed without warning-gating.
- Only `published` products appear in any buyer-facing view.
- Archive is soft-delete only.
- Maximum images per product is a configuration value (default 5), not a hardcoded constant.

### 11a. AI failure vs. fallback — definitive table

| Stage | On `failed` | Blocks `ready_for_review`? | Blocks publish? | Fallback |
|---|---|---|---|---|
| Image (PRD 04) | Image keeps `rawImageUrl` only | **No** — `failed` is terminal | **No** | `effectiveImageUrl` resolves to raw image |
| Catalog (PRD 05) | No generated description/fields | **No** | **No** | Artisan-typed `rawDescription`, or artisan writes one at review |
| Price (PRD 07) | No `suggestedPriceRange` | **No** | **No** | Artisan sets `price` unaided (always required regardless) |

**`effectiveImageUrl` resolution rule** (derived, never stored):
```
if useRawImage == true            → rawImageUrl
else if processedImageUrl != null → processedImageUrl
else                              → rawImageUrl
```
An image therefore always has a valid representation as long as `rawImageUrl` exists. Publish is blocked only if the product has **zero images**, never because processing failed.

The only conditions that block publish are the three in Section 11 — all of which are within the artisan's control and none of which depend on an AI stage succeeding.

### 11b. Stale-result protection (concrete mechanism)

- `Product.inputVersion` — integer, starts at 1, incremented on any **material** edit to product-level AI inputs (`rawDescription`, `materials`, `productionTime`, `categoryId`, `name`).
- `ProductImage.sourceVersion` — integer, starts at 1, incremented when that image's binary is replaced.
- When a job is dispatched, the current version is stamped onto it (`jobInputVersion` / `jobSourceVersion`).
- On write-back, the worker's stamped version is compared to the row's current version. **Mismatch → result discarded, status left `pending`, reprocessing dispatched.** Match → result written, status set terminal.
- Deleting an image cancels its in-flight job by making the row absent; any late write-back for a missing `imageId` is discarded.

This is a single integer comparison at write time — no locking, no reconciliation logic, no queue infrastructure. It resolves PRD 03 v1.0 Section 18's race condition, PRD 04's re-upload-during-processing edge case, and PRD 05's regenerate-after-edit edge case with one mechanism.

### 11c. Minor vs. material edits on a `published` product

| Edit type | Fields | Behavior |
|---|---|---|
| **Minor** | `price`, `quantityAvailable` | Applied immediately. Stays `published`. No version bump, no reprocessing, no re-review. |
| **Material** | images (add/replace/delete), `rawDescription`, `materials`, `productionTime`, `categoryId`, `name` | Applied immediately. **Stays `published`.** Version bumped, affected AI statuses → `pending`, reprocessing dispatched. Buyers keep seeing last-good content until new results land; on success the new AI output is applied (the artisan chose to change the input); on failure the last-good content remains. |

Rationale for staying `published` through material edits: pulling a live listing off the marketplace because an artisan fixed a typo is worse for the artisan than briefly serving slightly stale AI-generated prose, and it avoids introducing a re-review state a 2-person team would have to build and explain. Artisan-edited catalog content is never auto-overwritten (PRD 05 Section 11); only AI-generated content refreshes.

A material edit on a `draft` / `ready_for_review` / `unpublished` product behaves the same minus the publish consideration: versions bump, statuses reset, product returns to `processing` until stages are terminal again.

## 12. AI/ML Requirements

This PRD defines **no AI/ML logic of its own.** It defines the contract:

- **PRD 04** reads images where `processingStatus = pending` (with `sourceVersion`); writes `processedImageUrl`, `thumbnailUrl`, `processingMetadata`, `qualityWarnings`, `processedAt`, and terminal `processingStatus`.
- **PRD 05** reads `rawDescription`, `name`, `categoryId`, `materials`, `productionTime` where `catalogStatus = pending` (with `inputVersion`); writes to its own `ProductCatalog`/`ProductTranslation` tables and sets terminal `catalogStatus` here.
- **PRD 06** writes into `rawDescription` **before** submission via the normal update endpoint. It has **no status flag and no gate** in this module — it is an input method, not a pipeline stage.
- **PRD 07** reads `categoryId`, `materials`, `productionTime`, plus PRD 02 artisan location, where `priceStatus = pending` (with `inputVersion`); writes `suggestedPriceRange` and terminal `priceStatus`.

Job pickup uses the shared database-backed job mechanism established in PRD 04 v1.1 (no Redis/RabbitMQ in MVP).

## 13. API Requirements

Prefix `/api/v1/products`.

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| POST | `/api/v1/products` | Create product (`draft`) | `ARTISAN` |
| GET | `/api/v1/products/mine` | Own products, filterable by status | `ARTISAN` |
| GET | `/api/v1/products/{id}` | Detail (owner: any status; buyer: `published` only) | `ARTISAN` (own) / `BUYER` |
| PUT | `/api/v1/products/{id}` | Update raw fields (classifies minor/material per 11c) | `ARTISAN` (owner) |
| POST | `/api/v1/products/{id}/images` | Upload image(s) | `ARTISAN` (owner) |
| DELETE | `/api/v1/products/{id}/images/{imageId}` | Remove image | `ARTISAN` (owner) |
| PATCH | `/api/v1/products/{id}/images/order` | Reorder images | `ARTISAN` (owner) |
| POST | `/api/v1/products/{id}/submit` | `draft` → `processing` | `ARTISAN` (owner) |
| POST | `/api/v1/products/{id}/publish` | `ready_for_review` → `published` | `ARTISAN` (owner) |
| POST | `/api/v1/products/{id}/unpublish` | `published` → `unpublished` | `ARTISAN` (owner) |
| POST | `/api/v1/products/{id}/archive` | any → `archived` | `ARTISAN` (owner) |
| GET | `/api/v1/products` | List `published` (filter/search logic owned by PRD 08) | `BUYER` |

**Endpoints owned by other PRDs, not restated here:** `/images/{imageId}/reprocess` and `/images/{imageId}/use-raw` (PRD 04 Section 13); `/catalog/regenerate`, `/catalog` (PUT), `/catalog/translations/retry` (PRD 05 Section 13). They share this prefix but their behavior is specified in their own documents.

## 14. Data Requirements

**Product**
- `id`, `artisanId` (FK)
- `name` (required), `rawDescription` (**nullable**)
- `categoryId` (FK → PRD 02 `CraftCategory`)
- `materials`, `productionTime`, `quantityAvailable` (all nullable)
- `catalogStatus`, `priceStatus` (enum: `pending` | `processing` | `done` | `failed`)
- `suggestedPriceRange` (nullable JSON `{ min, max, currency }` — PRD 07)
- `price` (nullable numeric — artisan)
- `status` (enum: `draft` | `processing` | `ready_for_review` | `published` | `unpublished` | `archived`)
- `inputVersion` (integer, default 1)
- `createdAt`, `updatedAt`, `publishedAt` (nullable)

**Removed in v1.1:** `generatedDescription`. It lives in PRD 05's `ProductCatalog.generatedDescription` / `finalDescription`; keeping a copy here would have created two sources of truth for the same text.

**ProductImage**
- `id`, `productId` (FK), `order`
- `rawImageUrl` (required), `processedImageUrl` (nullable), `thumbnailUrl` (nullable)
- `processingStatus` (enum as above)
- `useRawImage` (boolean, default false — PRD 04 FR-8)
- `processingMetadata` (nullable JSON — PRD 04)
- `qualityWarnings` (nullable JSON array — PRD 04 FR-11)
- `processedAt` (nullable), `sourceVersion` (integer, default 1)

`effectiveImageUrl` is **derived at read time**, not stored (Section 11a).

No new fields beyond those PRDs 04, 05, and 07 actually consume or produce.

## 15. Database Considerations

- `Product` and `ProductImage` share the PostgreSQL instance with PRD 01 auth and PRD 02 profile tables. No separate service.
- Images in the same object-storage bucket pattern as PRD 02 profile photos; only URLs in the database.
- Index `artisanId`, `status`, and `(status, updatedAt)` for artisan lists and buyer-facing published queries.
- Index `catalogStatus`, `priceStatus`, and `ProductImage.processingStatus` — workers poll on these.
- `categoryId` references PRD 02's shared taxonomy table; never duplicated.
- `inputVersion` / `sourceVersion` as plain integer columns — no optimistic-locking library required.
- Catalog and translation data live in PRD 05's tables, joined on detail reads only, keeping list queries lean.

## 16. Security & Privacy

- Buyer-facing endpoints require `BUYER` authentication, matching PRD 02 v1.1. Not public in MVP.
- Every write operation verifies `artisanId` against the authenticated user — ownership, not just role.
- Buyers never see `draft`, `processing`, `ready_for_review`, `unpublished`, or `archived` products, even with a valid product ID.
- Raw image uploads validated for MIME type and size at upload, consistent with PRD 02 and re-validated by PRD 04 before decoding.
- Artisan-supplied text is user-generated content; sanitize before rendering to buyers.

## 17. Error Handling

| Scenario | Code | HTTP |
|---|---|---|
| Submit with zero images | `MISSING_IMAGES` | 400 |
| Publish with no price | `PRICE_REQUIRED` | 400 |
| Publish with no description from any source | `DESCRIPTION_REQUIRED` | 400 |
| Publish with zero images / no valid `effectiveImageUrl` | `MISSING_IMAGES` | 400 |
| Invalid state transition | `INVALID_TRANSITION` | 400 |
| Non-owner write attempt | `FORBIDDEN` | 403 |
| Buyer requests non-published product | `PRODUCT_NOT_FOUND` | 404 |
| Image count over configured max | `IMAGE_LIMIT_EXCEEDED` | 400 |
| Invalid/missing field | `VALIDATION_ERROR` | 400 |
| Stale AI write-back (version mismatch) | *(internal)* | discarded, not surfaced to artisan |

## 18. Edge Cases

- **Edit during in-flight processing** → version bump invalidates the in-flight result on write-back (11b). No lost update, no stale overwrite.
- **Image processing fails** → `effectiveImageUrl` falls back to raw; product still reaches `ready_for_review` and publishes.
- **Catalog generation fails** → artisan publishes with typed `rawDescription`, or writes a description at review. `DESCRIPTION_REQUIRED` fires only if there is genuinely no text from any source.
- **Price recommendation fails** → artisan sets price unaided; no change to publish rules.
- **All three AI stages fail** → product still reaches `ready_for_review` and is publishable with raw image + typed description + artisan price. This is the worst-case path and it must work; it is the demo-day insurance policy.
- **Voice capture/transcription fails** → `rawDescription` stays null or partially typed; no status, no gate, no error state in this module. Artisan types instead.
- **Artisan deletes all images from a published product** → publish invariant broken; product auto-reverts to `draft` and is removed from buyer views. The one case where an edit does take a listing down, because the invariant cannot otherwise hold.
- **Artisan sets price far outside `suggestedPriceRange`** → allowed, unflagged.
- **Buyer requests a just-unpublished product** → `PRODUCT_NOT_FOUND`; status checked live, never served from an indefinite cache.
- **Late write-back for a deleted image** → discarded silently (11b).

## 19. Acceptance Criteria

- [ ] A product can be created as `draft` with only a name.
- [ ] `rawDescription` accepts null; a product can be submitted with images and no description.
- [ ] Manual text entry for `rawDescription` is available in every state where the field is editable, independent of voice availability.
- [ ] Submit is rejected with `MISSING_IMAGES` when zero images are attached.
- [ ] A product reaches `ready_for_review` when all AI stages are terminal, **including when all three are `failed`**.
- [ ] Publish succeeds with a `failed` image status, using the raw image via `effectiveImageUrl`.
- [ ] Publish succeeds with a `failed` catalog status when the artisan supplied a description.
- [ ] Publish succeeds with a `failed` price status once the artisan sets a price.
- [ ] Publish is rejected without a price, without any description, or with zero images.
- [ ] An AI write-back stamped with an outdated `inputVersion`/`sourceVersion` is discarded and does not overwrite newer artisan input.
- [ ] A minor edit (`price`, `quantityAvailable`) on a published product leaves it `published` with no reprocessing.
- [ ] A material edit on a published product leaves it `published`, bumps the version, and resets the affected AI statuses.
- [ ] Deleting the last image of a published product reverts it to `draft` and removes it from buyer views.
- [ ] Buyers see only `published` products; all other states return `PRODUCT_NOT_FOUND`.
- [ ] Only the owning artisan can perform any write operation.

## 20. MVP Scope

Sections 6 and 13 in full. The AI processing behind the status flags is out of scope here — PRDs 04/05/07 can be stubbed against this contract during parallel development, consistent with the Master Product Definition's Week 5–6 parallel-build plan. The all-stages-failed path (Section 18) must work before any AI module is integrated, since it is the system's baseline behavior.

## 21. Future Scope

- Bulk product upload
- Inventory variants (size, colour)
- Product-level analytics (views, inquiries) for the artisan
- A finer-grained re-review workflow if material-edit auto-refresh proves too blunt in practice
- Draft auto-save / offline-first creation for low-connectivity artisans
- Scheduled publish / unpublish

## 22. Dependencies

- **Upstream (hard):** PRD 01 (auth, roles, ownership), PRD 02 (artisan profile, shared craft taxonomy).
- **Upstream (soft, optional, non-blocking):** PRD 06 — writes transcribed text into `rawDescription` before submission. No status flag, no gate. **Product Management is fully functional with PRD 06 absent**; manual text entry is the always-available path (FR-2).
- **Downstream:** PRD 04, 05, 07 consume the status-flag and versioning contract; PRD 08 reads `published` products and joins PRD 05 catalog content for display.
- **Shared infrastructure:** the database-backed job mechanism defined in PRD 04 v1.1.

## 23. Risks

- **Stale-result races.** Mitigated concretely by 11b's version stamping — one integer comparison, no locking, no distributed coordination.
- **The all-failed path is easy to leave untested** because it only matters when things break. Mitigation: it is an explicit acceptance criterion and integration test, not an afterthought.
- **Material-edit auto-refresh could overwrite AI content an artisan liked.** Bounded by PRD 05 Section 11 (artisan-edited content is never auto-overwritten) — only AI-generated content refreshes. Flagged in Future Scope if it proves too blunt.
- **Taxonomy coupling to PRD 02** — mitigated by a single shared reference table.
- **Image count default (5)** may be wrong once PRD 04's real processing cost is known. Mitigation: configuration value, not a constant.
- **PRD 05 owns catalog text while this module owns the product** — a join, not a duplication. Mitigation: `generatedDescription` deliberately removed from `Product` (Section 14) so there is exactly one source of truth.

## 24. Testing Requirements

- **Unit:** state machine transitions (valid and invalid); terminal-status readiness computation including all-failed; publish precondition checks (image / price / description-from-any-source); `effectiveImageUrl` resolution across all three branches; minor-vs-material edit classification; version increment rules.
- **Integration:** create → submit → mocked AI terminal statuses → review → publish; the **all-three-failed** path end-to-end; stale write-back discarded after an edit; minor edit keeping a listing live; material edit keeping a listing live while resetting statuses; last-image deletion reverting a published product; buyer access restricted to `published`; non-owner writes rejected on every endpoint.
- **Contract tests against PRD 04/05/07 stubs:** verify field names, status enum values, and version stamping match exactly what those modules read and write — this is where cross-PRD drift would otherwise surface late.
- **Manual:** confirm artisan-facing status labels read as plain language, not engineering jargon, consistent with the low-digital-literacy principle from PRDs 01/02.

---

## Cross-PRD Compatibility Checklist

**Verified against finalized documents:**

| PRD | Status | Compatibility |
|---|---|---|
| **01 — Authentication & Users (v1.1)** | ✅ Verified | Roles `ARTISAN`/`BUYER` used exactly as defined. Ownership enforced via `artisanId` match, not role alone (PRD 01 FR-8 RBAC middleware contract). `FORBIDDEN`/403 semantics consistent. No auth logic duplicated here. |
| **02 — Artisan Profile (v1.1)** | ✅ Verified | `categoryId` FKs to PRD 02's shared `CraftCategory` table — no parallel taxonomy. Buyer-authenticated access model matches PRD 02's MVP decision (not public). Object-storage URL pattern reused. Profile completeness confirmed as **never** gating product creation (PRD 02 v1.1 revision #4) — no completeness check appears anywhere in this document. |
| **04 — AI Image Processing (v1.1)** | ✅ Verified | `ProductImage` now carries exactly PRD 04's write-back fields: `thumbnailUrl`, `useRawImage`, `processingMetadata`, `qualityWarnings`, `processedAt`. PRD 04 FR-8 (reject-to-raw) implemented via `useRawImage` in the `effectiveImageUrl` rule. PRD 04's "failure never blocks publishing" now enforced by Section 11a rather than merely asserted. PRD 04's re-upload-during-processing edge case resolved by `sourceVersion`. Shared database-backed job mechanism, no new queue infrastructure. `/images/{imageId}/reprocess` and `/use-raw` left owned by PRD 04. |
| **05 — AI Catalog Generation (v1.0)** | ✅ Verified | `generatedDescription` **removed** from `Product` — PRD 05's `ProductCatalog` is the single source of truth, resolving a genuine v1.0 duplication. `catalogStatus` contract unchanged. PRD 05 FR-11 (publish with raw description on failure) enforced by Section 11's description-from-any-source rule. PRD 05's regenerate-after-edit edge case resolved by `inputVersion`. PRD 05 Section 11 (artisan edits never auto-overwritten) respected by 11c's material-edit refresh rule. Catalog endpoints left owned by PRD 05. |

**Provisional — reconciled against specified contract, pending the PRD itself:**

| PRD | Status | Basis |
|---|---|---|
| **06 — Voice & Multilingual** | ⚠️ Provisional | Not yet written. Reconciled against the interface PRD 03 and PRD 05 already specify: PRD 06 writes transcribed text into `rawDescription` pre-submission, holds no status flag, and gates nothing. Manual text is the permanent fallback (FR-2). **Confirm when PRD 06 is written:** that it does not require a separate audio artifact stored on `Product`, and that its translation stage is invoked by PRD 05 rather than by this module. |
| **07 — AI Price Recommendation** | ⚠️ Provisional | Not yet written. Reconciled against the contract stated in PRD 03 v1.0 Section 12 and carried forward: reads `categoryId`, `materials`, `productionTime`, artisan location; writes `suggestedPriceRange` `{min, max, currency}` and terminal `priceStatus`. **Confirm when PRD 07 is written:** whether it needs a confidence field alongside the range (the Master Product Definition's "range with confidence" differentiator suggests it will) — that would add one nullable column here. |
| **08 — B2B Market Linkage & Buyer Discovery** | ⚠️ Provisional | Not yet written. Reconciled against the constraint used throughout: buyers read `published` products only, under `BUYER` authentication, joining PRD 05 catalog content for display. Search/filter logic stays in PRD 08. **Confirm when PRD 08 is written:** which fields it filters on (if it filters on PRD 05's extracted `structuredFields`, that JSONB needs indexing — noted in PRD 05 Section 15). |

**Open items requiring your decision:** none blocking. The two provisional items worth revisiting are PRD 07's possible confidence column and PRD 08's filter fields — both are additive and neither changes this document's architecture.

# PRD 04 — AI Image Processing

**Project:** ShilpAI (SIH26090)
**Module:** AI Image Processing
**Status:** Approved — v1.1
**Depends on:** 01 (Auth), 02 (Artisan Profile), 03 (Product Management — owns the image records and status flags this module writes to)
**Depended on by:** 08 (B2B Market Linkage — buyers see processed images), 05 (indirectly, if catalog generation ever uses image context — not in MVP)

**Tagging convention:** `[CONFIRMED]` = stated in the official SIH26090 screenshot · `[PROPOSED]` = our design decision serving a confirmed requirement · `[ASSUMPTION]` = standard practice, no PS basis.

### Changelog — v1.0 → v1.1 (approved revisions)
1. Main product image no longer force-cropped to square. Product aspect ratio is preserved and fitted (letterboxed/padded) into a standardized marketplace canvas. Square thumbnails still generated for grid/list views. 1024×1024 is an initial target canvas, subject to UI validation.
2. Default background changed from "white or very light gray" to a **neutral light background**.
3. ≤15s latency retained as a soft benchmark; p50/p95 measurement added to testing requirements.
4. Job mechanism explicitly remains lightweight/database-backed — Redis/RabbitMQ and similar are not MVP requirements.
5. Privacy claim reworded: the recommended self-hosted architecture avoids transmitting images to third-party AI services.
6. Added lightweight, non-ML pre-processing image-quality checks (dimensions, file size, optional extreme darkness/overexposure) that produce actionable artisan warnings.

---

## 1. Objective

Turn an artisan's raw phone photo — often poorly lit, cluttered background, inconsistent framing — into a clean, consistent, marketplace-ready product image, automatically and without requiring the artisan to have any photography skill, editing software, or technical knowledge.

This module operates only on product images (`ProductImage.rawImageUrl` from PRD 03). It does not touch artisan profile photos (explicitly excluded per PRD 02 v1.1 revision #7), and it does not generate images — only processes real photos the artisan took.

## 2. Problem Being Solved

`[CONFIRMED]` The PS names lack of technical skill required to *professionally photograph* products as a specific barrier, and states beneficiaries "often fail to capture high-quality images." `[CONFIRMED]` It also requires the app to "optimize their listings using AI." This module is the most direct, literal answer to a stated PS requirement of any module in ShilpAI — the mapping is one-to-one, not inferred.

`[PROPOSED]` The practical consequence: a B2B/institutional buyer scanning a catalog judges credibility heavily on image consistency. A grid of listings where backgrounds vary from a cluttered floor to a bedsheet to a workshop wall reads as unprofessional regardless of product quality. Normalizing images is what makes an artisan's product visually competitive alongside established sellers.

## 3. Scope

**In scope (MVP):**
- Lightweight, non-ML pre-processing quality checks (dimensions, file size, optional extreme darkness/overexposure) with actionable artisan warnings
- Background removal / replacement with a neutral light background
- Basic image enhancement: exposure/brightness normalization, contrast, white balance correction, mild sharpening
- Auto-crop to subject with consistent padding, preserving the product's natural aspect ratio
- Fit onto a standardized marketplace canvas at consistent resolution — no forced square cropping of the main image
- Format normalization and compression (web-appropriate output size)
- Generation of a square thumbnail variant for list/grid views
- Writing results back to PRD 03's `ProductImage.processedImageUrl` and `processingStatus`

**Out of scope:**
- AI image *generation* (creating product photos that don't exist) — explicitly excluded in Master Product Definition v2; undermines authenticity, which matters more given the Heritage & Culture theme
- Super-resolution / AI upscaling — see Section 12 for why this is deliberately cut from MVP
- Object/product recognition or auto-tagging from images — that would be a new AI capability; catalog structuring is PRD 05's job and works from text/voice, not vision
- Watermarking, branding overlays
- Video processing
- Profile photo processing (PRD 02 scope, explicitly unprocessed)

## 4. Target Users

- `ARTISAN` — indirect user; they upload a photo and receive a better one back. They never configure or tune the processing.
- `BUYER` — consumes the output (processed images in listings), never interacts with this module directly.

## 5. User Stories

- As an artisan, I want my product photo cleaned up automatically after I upload it, so that my listing looks professional without me knowing anything about photography or editing.
- As an artisan, I want to see the processed image before publishing, so that I can reject it if it looks wrong.
- As an artisan, I want to keep using my original photo if the automatic processing makes it worse, so that a bad AI result doesn't stop me from listing my product.
- As a buyer, I want product images in a catalog to look visually consistent, so that I can compare products without visual noise.
- As the system, I want to process images asynchronously, so that a slow processing step doesn't block the artisan's product creation flow.

## 6. Functional Requirements

**FR-1** System shall pick up `ProductImage` records with `processingStatus = pending` and process them asynchronously.
**FR-2** System shall perform background removal and composite the subject onto a neutral light background.
**FR-3** System shall apply deterministic enhancement: brightness/exposure normalization, contrast adjustment, white balance correction, mild sharpening.
**FR-4** System shall auto-crop to the detected subject with consistent padding while **preserving the product's natural aspect ratio**, then fit the result onto a standardized marketplace canvas (initial target 1024×1024, subject to UI validation) by padding rather than cropping. The main product image shall never be distorted or have product content cut off to force a square.
**FR-5** System shall generate a square thumbnail variant for grid/list display, where square framing is acceptable because thumbnails are navigational rather than evaluative.
**FR-11** System shall run lightweight, deterministic pre-processing quality checks before the main pipeline: minimum/maximum dimensions, file size, and optionally extreme darkness or overexposure (via simple histogram/mean-luminance thresholds). If an image is clearly unsuitable, the system shall surface an actionable warning to the artisan (e.g., suggesting a retake in better light) while still attempting processing. No ML-based image-quality model is used. `[PROPOSED, per v1.1]`
**FR-6** System shall write `processedImageUrl` and set `processingStatus = done` on success, or `processingStatus = failed` on error, per PRD 03's contract.
**FR-7** System shall retain the original raw image unmodified in storage — processing never overwrites the source.
**FR-8** System shall allow the artisan to reject a processed image and fall back to the raw image for that specific image (`useRawImage` flag), per PRD 03's principle that AI failure never blocks publishing.
**FR-9** System shall reprocess an image when PRD 03 resets its `processingStatus` to `pending` (e.g., after re-upload).
**FR-10** System shall enforce a processing timeout, after which the image is marked `failed` rather than left in `processing` indefinitely.

## 7. Non-Functional Requirements

- **Asynchronous by default:** artisan-facing upload returns immediately; processing happens in the background. The artisan is never made to wait on a spinner for AI to finish.
- **Latency target:** under ~15 seconds per image end-to-end under normal conditions. This is a soft benchmark, not an SLA — actual performance is measured as p50/p95 on the target deployment (see Sections 12 and 24) and the benchmark adjusted if real hardware says otherwise.
- **Graceful degradation:** any failure path must leave a usable raw image, never a broken listing.
- **Cost-bounded:** processing must not require per-image paid API calls at a rate that a student team can't sustain — drives the model recommendation in Section 12.
- **Deterministic where possible:** enhancement steps (brightness, contrast, resize) are classical image operations, not ML inference — cheaper, faster, and debuggable.

## 8. User Flow

1. Artisan uploads product photo(s) in PRD 03's create flow → images saved with `processingStatus = pending`, upload returns immediately
2. Artisan submits product → product enters `processing` state
3. This module picks up pending images, runs the pipeline (Section 12)
4. On success: `processedImageUrl` written, `processingStatus = done`
5. Product reaches `ready_for_review` (once catalog/price also complete, per PRD 03)
6. Artisan sees raw vs. processed side by side, and can accept (default) or reject → falls back to raw
7. On publish, buyer-facing views use `processedImageUrl` (or raw, if rejected/failed)

## 9. Inputs

- `ProductImage.rawImageUrl` (JPEG/PNG/WebP, from artisan's phone camera or gallery)
- Image metadata: dimensions, file size, MIME type
- No artisan-supplied processing parameters — this is fully automatic by design (any tuning UI would violate the low-digital-literacy principle)

## 10. Outputs

- `processedImageUrl` — standardized, background-cleaned, enhanced image at fixed dimensions
- `thumbnailUrl` — smaller variant for grids
- `processingStatus` — `done` or `failed`
- Optional `processingMetadata` (nullable): which steps ran, whether background removal confidence was low — useful for debugging and for deciding whether to surface a "we're not sure about this one" hint to the artisan `[PROPOSED]`

## 11. Business Rules

- The raw image is never deleted or overwritten — it is the permanent source of truth and the fallback.
- A `failed` processing status never blocks publishing (PRD 03, Section 18) — the raw image is used instead.
- The artisan always has final say: a processed image can be rejected in favor of the raw one.
- Processing is automatic and non-configurable by the artisan for MVP.
- Maximum images per product (5, per PRD 03) directly bounds this module's per-product processing cost.

## 12. AI/ML Requirements

### AI objective
Produce a clean, consistent, marketplace-standard product image from an unconstrained phone photo, with no human editing input.

### Model / task type
Two distinct kinds of work, deliberately separated:
- **Learned (ML):** foreground/background segmentation (salient object segmentation / image matting) — genuinely needs a model.
- **Deterministic (not ML):** brightness, contrast, white balance, sharpening, crop, resize, compression — classical image processing. Flagging this explicitly because calling the whole pipeline "computer vision" would overstate what's actually learned, and an evaluator asking "what's the model doing?" deserves a precise answer.

### Input data
Single RGB image, arbitrary resolution and aspect ratio, uncontrolled lighting and background.

### Processing pipeline
```
raw image
  → validate (format, size, dimensions)
  → quality checks (dimensions, file size, extreme dark/overexposure)
      └─► actionable warning to artisan if clearly unsuitable (non-blocking)
  → EXIF orientation correction
  → background segmentation (ML)  ──► alpha mask
  → composite subject onto neutral light background
  → auto-crop to subject bounding box + padding (aspect ratio preserved)
  → enhancement (exposure, contrast, white balance, sharpen)
  → fit onto standardized canvas (pad, do not crop or distort)
  → compress + encode (main + square thumbnail)
  → store, write back status to PRD 03
```

### Expected output
Main image fitted onto a standardized marketplace canvas (initial target 1024×1024, subject to UI validation) on a neutral light background, with the product's natural aspect ratio preserved via padding rather than cropping — a tall textile hanging and a wide serving platter both stay uncut. Plus a square thumbnail, both web-optimized.

### Model / API options

| Option | Type | Assessment |
|---|---|---|
| **rembg** (U²-Net / ISNet-general) | Open-source, self-hosted | **Recommended for MVP.** Runs on CPU, no per-call cost, well-maintained, purpose-built for exactly this task, works acceptably on craft objects (textiles, pottery, metalwork). |
| remove.bg API | Commercial API | Better edge quality on hair/fine detail, but per-image cost with a small free tier — unsustainable for demo volume, and adds an external dependency and network hop for a capability that's available offline. |
| SAM (Segment Anything) | Open-source, heavy | Overkill. Requires a prompt/point input, much heavier compute, and solves a more general problem than needed. |
| Custom-trained segmentation model | Custom ML | **Reject.** No dataset, no need — a 2-person team training a segmentation model to slightly beat a well-tested pretrained one is time spent for near-zero gain. |
| Real-ESRGAN / super-resolution | Open-source, heavy | **Cut from MVP.** GPU-hungry, slow on CPU, and marginal benefit — modern phone cameras already produce adequate resolution. Future Scope only. |
| Pillow / OpenCV | Classical library | Used for all non-ML steps. No model, no cost, fast, deterministic. |

**Recommendation:** rembg (pretrained, self-hosted) for segmentation + Pillow/OpenCV for everything else. Pretrained model, not API, not custom training — consistent with the Master Product Definition's AI principle.

### Evaluation metrics
Honest position: this is a subjective visual-quality task with no ground-truth dataset, so heavyweight metrics (IoU against annotated masks) aren't available to you without labeling work that isn't worth the time.

Practical MVP evaluation:
- **Manual rubric on a fixed test set** — assemble ~30–50 representative craft photos (varied lighting, backgrounds, product types) and score each processed output as acceptable / borderline / unacceptable. Track the acceptable rate; target ≥80%.
- **Failure rate** — % of images that error or time out. Target <5%.
- **Artisan rejection rate** (FR-8) — once live, the % of processed images artisans reject is the most honest real-world signal available.
- **Per-category breakdown** — segmentation quality varies a lot by craft (a solid pot segments cleanly; loose textile fringe or fine jewelry chains do not). Knowing *which* categories fail is more actionable than a single average.

### Fallback behavior
Layered, in order:
1. Segmentation confidence low or mask implausible (e.g., near-empty or near-full mask) → skip background removal, still apply enhancement/crop/resize
2. Any pipeline step errors → fall back to enhancement + resize only
3. Total failure or timeout → `processingStatus = failed`, raw image used for display
4. Artisan-initiated rejection at review (FR-8) → raw image used

At no point does a failure block the artisan from publishing.

### Latency considerations
rembg on CPU is typically a few seconds per image; classical steps are sub-second. The async design (Section 7) means this is invisible to the artisan during creation. Performance should be tracked as p50/p95 per-image processing time on the actual target deployment rather than as a single average, since tail latency is what causes a product to sit visibly stuck in `processing` during a demo. The real risk is a demo-day burst (multiple products processed at once) — mitigate with a simple database-backed job queue and a concurrency limit rather than unbounded parallel processing that could exhaust the server.

### Cost considerations
Self-hosted rembg is compute-only, no per-image charge — the decisive advantage over remove.bg for a student team with no budget. CPU inference avoids GPU hosting cost entirely. Storage cost is bounded by the 5-image-per-product cap plus raw+processed+thumbnail variants per image — worth noting that storing three variants per image triples storage vs. naive expectations.

### Privacy considerations
The recommended self-hosted architecture avoids transmitting product images to third-party AI services — a meaningful advantage over an external API, and a defensible point if a judge asks about data handling for a government-sponsored, marginalized-community-facing application. Images are product photos rather than personal data, but artisan workshop backgrounds can incidentally capture homes or people, which is a further argument for processing within your own infrastructure and for background removal being a privacy benefit as well as an aesthetic one. `[PROPOSED]`

### API vs pretrained vs custom
**Pretrained, self-hosted.** Not an API (cost, dependency, privacy), not custom-trained (no dataset, no justification).

### MVP vs future
- **MVP:** quality pre-checks with warnings, background removal, enhancement, aspect-ratio-preserving canvas fit, square thumbnail, fallbacks
- **Future:** super-resolution, multi-background options (white/lifestyle/contextual), shadow generation for realism, per-category tuned pipelines, batch reprocessing when the model improves

## 13. API Requirements

This module is primarily a background worker, not a request-driven API. Minimal endpoints:

| Method | Endpoint | Purpose | Auth required |
|---|---|---|---|
| POST | `/api/v1/products/{id}/images/{imageId}/reprocess` | Manually re-trigger processing for one image | `ARTISAN` (owner only) |
| POST | `/api/v1/products/{id}/images/{imageId}/use-raw` | Reject processed output, use raw image (FR-8) | `ARTISAN` (owner only) |

Everything else happens via the status-flag contract defined in PRD 03, Section 12 — this module reads `pending` images and writes results back. The pickup mechanism (queue vs. polling) is an implementation decision, consistent with PRD 03.

## 14. Data Requirements

Extends PRD 03's `ProductImage` — no new primary entity:
- `rawImageUrl` (existing, PRD 03)
- `processedImageUrl` (existing, PRD 03)
- `thumbnailUrl` (new, nullable)
- `processingStatus` (existing, PRD 03)
- `useRawImage` (new, boolean, default false — set by FR-8)
- `processingMetadata` (new, nullable JSON — steps run, segmentation confidence, failure reason)
- `qualityWarnings` (new, nullable array/JSON — e.g. `["too_dark", "low_resolution"]`, from FR-11; surfaced to the artisan as actionable guidance, never used to block)
- `processedAt` (new, nullable timestamp)

## 15. Database Considerations

- No new tables — additive columns on PRD 03's `ProductImage`, keeping the schema flat and the 2-person team out of join complexity.
- The job mechanism is a lightweight, database-backed job table (a simple `jobs` table with status and claim semantics). Redis, RabbitMQ, Celery brokers, or any other dedicated queue infrastructure are **explicitly not MVP requirements** — adding a broker for a 2-person team's image pipeline is operational overhead without corresponding benefit at this scale. If volume ever justifies a real broker, that's a Phase 2 migration, not an MVP decision.
- Storage layout: keep raw, processed, and thumbnail as separate keys under a predictable prefix per product, so cleanup on product archive is a single prefix delete.

## 16. Security & Privacy

- Image processing runs server-side on validated files only — MIME type and size validated at upload (PRD 03), re-validated here before decoding, since image decoders are a classic attack surface for malformed files.
- Processed images inherit the same access control as their parent product: only visible to the owning artisan (any status) or to `BUYER`-authenticated users (published products only), per PRD 03 Section 16.
- Self-hosted processing means no product imagery is transmitted to third-party services (see Section 12 privacy).
- Raw images are never exposed publicly if a processed version exists and is accepted — though both live in the same storage, buyer-facing responses should reference the appropriate URL, not enumerate all variants.

## 17. Error Handling

| Scenario | Code | Handling |
|---|---|---|
| Unsupported/corrupt image format | `IMAGE_DECODE_FAILED` | `processingStatus = failed`, raw retained |
| Image fails a quality pre-check (too small, too dark, overexposed) | *(warning, not error)* | Record in `qualityWarnings`, surface actionable guidance to artisan, continue processing anyway |
| Segmentation produces implausible mask | *(internal)* | Skip background removal, continue pipeline (Section 12 fallback 1) |
| Processing exceeds timeout | `PROCESSING_TIMEOUT` | `processingStatus = failed` |
| Storage write failure | `STORAGE_ERROR` | Retry once, then `failed` |
| Reprocess requested on non-owned image | `FORBIDDEN` | 403 |
| Reprocess requested while already `processing` | `ALREADY_PROCESSING` | 409 |

## 18. Edge Cases

- **Product photographed flat on a patterned cloth** (very common for textiles) — segmentation may struggle to separate a textile product from a textile background. This is the single most likely real-world failure mode for this specific problem domain. Mitigation: fallback 1 (skip removal, keep enhancement) plus per-category awareness in evaluation (Section 12). Worth explicitly testing with handloom/textile samples, not just pottery. `[PROPOSED — flagged because it's domain-specific and easy to miss until demo day]`
- Product with fine detail (jewelry chains, fringe, open weave) → edge quality degrades; acceptable for MVP, noted in evaluation breakdown.
- Multiple products in one photo → segmentation treats them as one subject; MVP does not attempt to split. Artisan guidance ("one product per photo") is a UX answer, not a technical one.
- Extremely dark or blown-out photo → flagged by the FR-11 quality check with an actionable warning ("this photo looks very dark — try again near a window or in daylight"). Enhancement is still attempted, but honest position is that this module improves photos, it does not rescue unusable ones — telling the artisan early beats silently producing a poor listing.
- Extreme aspect ratios (a very long woven stole, a narrow carved figure) → preserved, not cropped, per FR-4; the standardized canvas pads the remaining space. Worth confirming during UI validation that heavily padded images still look acceptable in the product detail view, since this is exactly the case where a square crop would have been visually tidier but lossy.
- Very large image from a modern phone (12MP+) → downscale before segmentation to bound processing time, not after.
- Image re-uploaded while previous processing is in flight → PRD 03's status reset handles this; in-flight result must be discarded, not written over newer input (PRD 03, Section 18 race condition).
- Artisan rejects processed image, then re-uploads a different photo → `useRawImage` should reset to false for the new image, not persist from the old one.

## 19. Acceptance Criteria

- [ ] A raw phone photo with a cluttered background produces a processed image on a neutral light background fitted to the standardized canvas.
- [ ] The product's aspect ratio is preserved in the main image — no product content is cropped away and no distortion is introduced to force a square.
- [ ] A square thumbnail variant is generated alongside the aspect-ratio-preserved main image.
- [ ] An image failing a quality pre-check (too dark, too small) produces an actionable artisan-facing warning without blocking processing or publishing.
- [ ] The raw image remains retrievable and unmodified after processing.
- [ ] A processing failure sets `processingStatus = failed` and the product remains publishable using the raw image.
- [ ] An artisan can reject a processed image and the listing then displays the raw image.
- [ ] Processing does not block the artisan's upload or product-creation flow at any point.
- [ ] On a fixed test set of ≥30 representative craft photos, ≥80% of outputs are rated acceptable by manual review, with results broken down by craft category.
- [ ] Images stuck in `processing` beyond the timeout are automatically marked `failed`.

## 20. MVP Scope

Sections 6 and 12's MVP column define it: deterministic quality pre-checks with artisan warnings, background removal, deterministic enhancement, aspect-ratio-preserving canvas fit, square thumbnail, layered fallbacks, artisan reject-to-raw. Self-hosted rembg + Pillow/OpenCV, CPU-only, asynchronous, database-backed job queue.

## 21. Future Scope

- Super-resolution / upscaling for low-resolution source photos
- Multiple background styles (pure white for catalog, contextual/lifestyle for storytelling — the latter fits the Heritage & Culture theme well but is not MVP)
- Realistic shadow generation for composited subjects
- Per-craft-category tuned pipelines (different handling for textiles vs. metalwork)
- In-app camera guidance (framing overlay, lighting hints) — arguably higher real-world value than better post-processing, worth considering early in Phase 2
- Batch reprocessing of existing listings when the pipeline improves

## 22. Dependencies

- **Upstream:** PRD 03 (image records, status flags, product lifecycle), PRD 01/02 (ownership and auth).
- **Downstream:** PRD 08 (buyer-facing display of processed images and thumbnails).
- **External/technical:** rembg + its pretrained model weights (bundled at deploy time, not downloaded at runtime — a runtime model download is a demo-day failure waiting to happen), Pillow/OpenCV, file storage, background job mechanism.

## 23. Risks

- **Textile-on-textile segmentation failure** (Section 18) is a domain-specific risk that generic background-removal benchmarks won't warn you about, and handloom/weaving is explicitly named in the PS's beneficiary description. Mitigation: test with real textile photos early, accept fallback 1 as the answer, and don't promise perfect results for that category.
- **Model weights and deployment size** — rembg models add meaningful size to a container image and memory footprint. Mitigation: pick one model (ISNet-general or U²-Net), bundle it, don't ship multiple.
- **CPU inference on a small free-tier host may be slower than expected.** Mitigation: benchmark on the actual target deployment early, not on a laptop; the 15-second target may need adjusting, and it's better to know in week 5 than week 10.
- **Over-processing looks worse than under-processing.** Aggressive sharpening or contrast on an already-decent photo degrades it. Mitigation: tune enhancement conservatively, and let the artisan-rejection rate be the signal.
- **Scope creep toward "make the photo beautiful."** There's a real temptation to add generation, relighting, or styling. Mitigation: the authenticity argument (Section 3) is the principled reason to hold the line, not just effort.

## 24. Testing Requirements

- **Unit tests:** EXIF orientation handling, crop/padding math, aspect-ratio-preserving canvas fit (including extreme tall and wide inputs), square thumbnail generation, quality pre-check thresholds (dimensions, file size, darkness/overexposure), mask plausibility check (the fallback-1 trigger), timeout enforcement.
- **Latency measurement:** record per-image end-to-end processing time and report **p50 and p95** on the actual target deployment, not a developer laptop. The ≤15s figure is a benchmark to validate or revise against these numbers, not a spec to assert.
- **Integration tests:** end-to-end pending → done status transition writing back to PRD 03; failure path leaving raw image usable; `use-raw` endpoint behavior; reprocess-while-processing rejection.
- **Fixed visual test set:** ~30–50 real craft photos across categories, processed and manually rated per the Section 12 rubric. This is the primary quality gate and should be assembled early — it doubles as demo material.
- **Adversarial/malformed input tests:** corrupt file, mislabeled MIME type, zero-byte file, enormous dimensions — all should fail cleanly as `failed`, never crash the worker.
- **Load sanity check:** submit several products' worth of images at once and confirm the database-backed queue's concurrency limit holds rather than exhausting memory, and that p95 latency under burst stays tolerable — specifically a demo-day scenario.

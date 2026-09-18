# ShilpAI PRD 05–08 Cross-PRD Audit

## 1. Cross-PRD conflicts

- Product lifecycle/status remains owned by PRD 03. PRDs 05–08 do not introduce a competing product state machine.
- Voice and image processing are parallel inputs to the catalog flow.
- Voice is optional and cannot block product creation.
- PRD 05 consumes both native and translated transcripts.
- PRD 07 owns recommendation calculations; PRD 05 does not generate prices.
- PRD 08 owns inquiry status; inquiry read tracking is separate from business status.
- Public catalog visibility in PRD 08 is `[PROPOSED]`, not treated as a confirmed SIH requirement.

## 2. Required changes to PRDs 01–04

No rewrite of locked PRDs is required by these four documents.

One implementation-time check remains important: any field extension to PRD 03 must be explicitly treated as `[EXISTING ENTITY EXTENSION]` and must use the exact existing field/entity names.

## 3. New OPEN decisions

1. LLM provider for PRD 05.
2. STT/translation provider for PRD 06.
3. Exact supported audio duration/file-size limits.
4. Exact price-guidance formula and configurable assumptions.
5. Buyer catalog visibility model.
6. Inquiry rate-limit thresholds.
7. Inquiry product-context snapshot strategy.
8. Exact contact-consent UX.
9. Retention period for raw audio/transcripts.
10. Final object-storage provider.

## 4. Shared entities

- `User` / roles from PRD 01.
- `ArtisanProfile` from PRD 02.
- `CraftCategory` from PRD 02.
- `Product` from PRD 03.
- `ProductImage` from PRD 03/04.
- Voice recording representation from PRD 06.
- Product catalog fields from PRD 05.
- Price recommendation representation from PRD 07.
- Buyer profile/inquiry representations from PRD 08.

## 5. Shared APIs

- `/api/v1/auth/...`
- `/api/v1/products/...`
- `/api/v1/market/...`
- `/api/v1/inquiries/...`

Exact route names must be reconciled with locked PRDs before implementation.

## 6. Shared state machines

### Product

Owned by PRD 03. Downstream modules must respect its exact states.

### AI image processing

Owned by PRD 04 and remains asynchronous.

### Voice processing

Module-local processing status; failure is non-blocking.

### Catalog generation

Module-local processing status; invalid output falls back gracefully.

### Inquiry

```text
SUBMITTED → ACCEPTED → COMPLETED
SUBMITTED → DECLINED
```

Read state is independent:

```text
isViewed=false → true
```

## 7. Security concerns

- RBAC must be enforced server-side.
- Artisan ownership checks must apply to all product/AI operations.
- Buyer inquiry access must be ownership-checked.
- Artisan phone numbers must never leak through public catalog/profile endpoints.
- Contact details require explicit consent.
- AI provider keys remain server-side.
- Prompt injection from transcripts must not override system instructions.
- Uploaded audio/images require server-side validation.
- Public endpoints must not expose raw/private media variants.

## 8. Implementation risks

- LLM hallucination in catalog fields.
- Speech transcription/translation quality for mixed-language speech.
- CPU load from self-hosted image processing.
- AI provider rate limits/cost.
- Scope creep into full e-commerce.
- Inconsistent field names if PRD 03 is not treated as the schema authority.
- Overly ambitious ML matching without real training data.

## 9. Do NOT implement in MVP

- Microservices.
- Redis/Kafka/RabbitMQ solely for these modules.
- Complex learned recommendation models.
- Automatic pricing.
- Payment gateway.
- Cart/checkout.
- Logistics/shipping integration.
- AI-generated product images.
- Authenticity/certification verification.
- Guaranteed market/buyer matching.
- Full Indian-language coverage.
- Government marketplace integration without an actually available/authorized API.

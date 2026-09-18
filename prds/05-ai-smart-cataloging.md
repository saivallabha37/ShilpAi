# PRD 05 — AI Smart Cataloging

**Project:** ShilpAI  
**SIH Problem Statement:** SIH26090 — AI-Driven Market Linkage and Smart Cataloging Mobile Application for Marginalized Artisans  
**Module:** 05 — AI Smart Cataloging  
**Status:** Final Draft v1.1  
**Scope:** MVP  
**Dependencies:** PRD 01, PRD 02, PRD 03, PRD 04, PRD 06  
**Downstream:** PRD 07, PRD 08

> **Tagging convention:** `[CONFIRMED]` = established project/PS requirement; `[PROPOSED]` = product/engineering decision; `[ASSUMPTION]` = reasonable implementation assumption; `[OPEN]` = decision to finalize during implementation.

---

## 1. Objective

Enable an artisan to turn simple product information—typed text, explicit attributes, and optionally voice-derived transcripts—into a structured, professional, discovery-friendly product catalog with minimal manual data entry.

The module must reduce the effort required to create a marketplace-ready listing while preserving factual accuracy and artisan control.

## 2. Problem Being Solved

The problem statement identifies lack of technical skills for professional cataloging and presentation as a barrier to connecting marginalized artisans with larger buyers. Smart Cataloging addresses the information-structuring part of that barrier.

The system should transform imperfect, short, or multilingual input into useful structured fields without inventing facts.

## 3. Scope

### In scope — MVP

- Generate a professional, discovery-friendly listing title.
- Extract explicitly supported product attributes.
- Structure product information into a validated schema.
- Generate a concise product description grounded in supplied information.
- Generate discovery tags from supported information.
- Consume raw/native and translated transcripts from PRD 06.
- Consume typed descriptions and explicit product attributes from PRD 03.
- Consume the selected craft category from PRD 02.
- Allow artisan review and editing.
- Store AI output and confidence/processing metadata as an extension of the existing product model where required.
- Provide graceful fallback to manually entered data if AI generation fails.

### Out of scope — MVP

- Product authenticity verification.
- Certification/GI-tag verification.
- Historical or geographical fact generation.
- Automatic pricing.
- Automatic marketplace publishing without artisan review.
- Complex recommendation models.
- AI-generated product imagery.
- Automatic invention of missing product specifications.

## 4. Target Users

### Primary

**ARTISAN:** creates and reviews product listings.

### Secondary

**BUYER:** consumes the resulting structured product information through PRD 08.

## 5. User Stories

- As an artisan, I want to provide a short description instead of filling a long form.
- As an artisan, I want the system to structure my product information automatically.
- As an artisan, I want to see and edit the generated fields before publishing.
- As an artisan, I want missing information to remain blank rather than being guessed.
- As a buyer, I want product information presented consistently so I can compare potential sourcing options.
- As the system, I want every generated field to be traceable to supplied input.

## 6. Functional Requirements

**FR-1** The system shall accept the following inputs where available:
- typed description;
- explicit product attributes;
- selected craft category;
- raw/native transcript from PRD 06;
- translated transcript from PRD 06.

**FR-2** The system shall generate a professional, discovery-friendly listing title.

**FR-3** The system shall generate structured attributes including, where supported:
- `primaryMaterial`;
- `craftTechnique`;
- `dimensions`;
- `colorPalette`;
- `careInstructions`;
- `quantity`;
- `tags`;
- `description`.

**FR-4** Missing facts shall be represented as `null`, an empty value, or another schema-defined absence value rather than guessed.

**FR-5** The system shall preserve source provenance for generated values where practical, such as `aiGenerated`, `sourceType`, or processing metadata. `[PROPOSED]`

**FR-6** The system shall allow the artisan to edit every AI-generated user-facing field.

**FR-7** Artisan-edited values shall override AI-generated values and shall not be silently replaced by later AI regeneration.

**FR-8** AI generation shall be asynchronous where implementation latency makes synchronous generation undesirable. `[PROPOSED]`

**FR-9** The system shall validate the model response before persistence.

**FR-10** If generation fails, the product remains usable through typed/manual input.

**FR-11** The system shall never require successful voice processing for catalog generation when typed information is available.

## 7. Non-Functional Requirements

- **Accuracy:** factual grounding takes precedence over completeness.
- **Usability:** generated information must be easy to review on a mobile-first interface.
- **Traceability:** AI-generated values should be distinguishable from artisan-entered values.
- **Performance:** p50 and p95 generation latency should be measured. Exact latency target is `[OPEN]` and must not block product creation.
- **Reliability:** failed AI calls must not corrupt the product draft.
- **Cost:** use a small/efficient model or managed LLM appropriate for a student MVP.
- **Determinism:** schema validation and business rules must be deterministic even if model output is not.

## 8. User Flow

1. Artisan creates/edits a product in PRD 03.
2. Artisan enters typed information and/or uses PRD 06 voice input.
3. Product images may be processed independently through PRD 04.
4. Available product inputs are sent to Smart Cataloging.
5. LLM produces structured candidate output.
6. Application parses the response.
7. JSON Schema validation runs.
8. If valid, output is accepted.
9. If invalid, the system retries with a constrained repair request.
10. If still invalid, the system falls back gracefully to manually entered values.
11. Artisan reviews the generated fields.
12. Artisan edits/accepts values.
13. Final reviewed catalog values are persisted.
14. PRD 07 may use structured product information for price guidance.
15. PRD 08 consumes the reviewed/published catalog.

## 9. Inputs

| Input | Source | Required |
|---|---|---|
| Product ID | PRD 03 | Yes |
| Typed description | PRD 03 | Optional |
| Explicit attributes | PRD 03 | Optional |
| Selected craft category | PRD 02 | Expected |
| Raw/native transcript | PRD 06 | Optional |
| Translated transcript | PRD 06 | Optional |
| Product image references | PRD 03/04 | Optional for this module |

The raw/native transcript is a first-class source and must not be discarded in favor of English translation.

## 10. Outputs

Example catalog object:

```json
{
  "title": "Blue Vase",
  "primaryMaterial": null,
  "craftTechnique": null,
  "dimensions": null,
  "colorPalette": ["Blue"],
  "careInstructions": null,
  "quantity": null,
  "description": "A blue vase.",
  "tags": ["blue", "vase"]
}
```

The exact persisted field names must follow PRD 03. New fields are `[EXISTING ENTITY EXTENSION]` only where required.

## 11. Business Rules

1. The model must not infer a material from an object's appearance or common association.
2. The model must not convert a craft category into a claimed technique.
3. The model must not infer dimensions from an image.
4. The model must not invent certifications, GI tags, geographical claims, historical claims, purity, quantities, care instructions, or pricing.
5. A claim is allowed only when supported by artisan-provided inputs or an explicitly supplied trusted reference input.
6. If the artisan says “blue vase,” the output may say “Blue Vase,” but must not claim “ceramic,” “clay,” or “handcrafted” unless supported.
7. Artisan edits have precedence over AI values.
8. AI output is advisory until reviewed.
9. The module does not publish a product by itself.
10. Re-generation must not erase artisan edits unless the artisan explicitly chooses to regenerate/replace them.

## 12. AI/ML Requirements

### 12.1 AI task

The primary AI task is structured information extraction and controlled text generation from artisan-provided information.

### 12.2 Grounding principle

The model prompt must explicitly instruct:

- use only supplied information;
- leave unsupported fields null;
- do not infer hidden attributes;
- do not invent facts to make the listing sound professional;
- do not treat translation as a stronger source than the original transcript;
- do not generate price information.

### 12.3 Output validation

The system shall use:

**LLM → JSON parsing → JSON Schema validation → accept/retry → fallback**

The LLM itself is not considered a guarantee of valid JSON.

### 12.4 Example

**Input:** `Blue vase.`

**Output:**

```text
title: "Blue Vase"
primary_material: null
craft_technique: null
dimensions: null
color_palette: ["Blue"]
care_instructions: null
```

No clay, ceramic, glass, metal, or other material may be inferred.

### 12.5 Provider

LLM provider is `[OPEN]`.

A provider adapter should isolate the application from a specific vendor. `[PROPOSED]`

## 13. API Requirements

All endpoints must use the project's `/api/v1/` convention.

Suggested endpoints:

- `POST /api/v1/products/{productId}/catalog/generate`
- `GET /api/v1/products/{productId}/catalog`
- `PATCH /api/v1/products/{productId}/catalog`
- `POST /api/v1/products/{productId}/catalog/regenerate`

Exact authorization and product status rules must follow PRD 03.

### Error codes

- `VALIDATION_ERROR`
- `CATALOG_GENERATION_FAILED`
- `CATALOG_SCHEMA_INVALID`
- `FORBIDDEN`
- `PRODUCT_NOT_FOUND`

## 14. Data Requirements

The module needs:

- generated structured fields;
- generation status;
- optional generation metadata;
- optional model/provider metadata;
- artisan-edited values;
- timestamps.

Do not create duplicate product entities.

## 15. Database Considerations

Where the locked PRD 03 model permits extension:

- `[EXISTING ENTITY EXTENSION]` `Product.structuredAttributes` — nullable JSON/JSONB for generated structured fields.
- `[EXISTING ENTITY EXTENSION]` `Product.catalogConfidence` — nullable numeric confidence indicator, if retained.

These are extensions, not replacements for PRD 03's existing fields.

A separate catalog table is not required for MVP unless the locked PRD 03 schema makes it necessary.

## 16. Security & Privacy

- Only the owning artisan may edit their catalog.
- Buyers may see only fields exposed by PRD 08.
- Never expose internal prompts, provider credentials, or private transcripts unnecessarily.
- API keys must be server-side only.
- User-generated text must be treated as untrusted input.
- Prompt injection text inside a transcript must not override system instructions.
- Logs must avoid unnecessary sensitive user content.

## 17. Error Handling

| Scenario | Response |
|---|---|
| Missing product | `404 PRODUCT_NOT_FOUND` |
| Unauthorized edit | `403 FORBIDDEN` |
| Invalid input | `400 VALIDATION_ERROR` |
| LLM unavailable | Preserve manual values; mark generation failed |
| Invalid JSON | Retry once; then fallback |
| Schema validation failure | Retry once; then fallback |
| Empty input | Ask for typed information; do not fabricate |
| Provider timeout | Mark processing failure and keep draft usable |

## 18. Edge Cases

- Very short input such as “blue vase.”
- Mixed-language input.
- Native transcript and translated transcript disagree.
- Transcript contains irrelevant speech.
- Artisan explicitly says “I don't know the material.”
- Model returns extra fields.
- Model returns unsupported claims.
- Artisan edits a field after generation.
- Regeneration occurs after manual edits.
- AI service is temporarily unavailable.

When native and translated text conflict, preserve the native source and surface uncertainty for artisan review rather than silently choosing an invented interpretation.

## 19. Acceptance Criteria

- [ ] A product can be cataloged from typed information alone.
- [ ] Voice is optional.
- [ ] Raw and translated transcripts can both be consumed.
- [ ] Unsupported facts remain null.
- [ ] The “Blue vase” example does not infer material.
- [ ] JSON is parsed and schema-validated before persistence.
- [ ] Invalid model output is retried and then handled gracefully.
- [ ] Artisan edits persist and override AI values.
- [ ] AI failure never destroys the product draft.
- [ ] Pricing is not generated by this module.
- [ ] Product status changes follow PRD 03 rather than a new catalog state machine.

## 20. MVP Scope

- Structured catalog generation.
- Grounded title/description.
- Attribute extraction.
- Tags.
- Schema validation.
- Artisan review/edit.
- Manual fallback.
- Integration with PRD 06 transcripts.

## 21. Future Scope

- More languages.
- Image-assisted attribute extraction.
- Historical/craft knowledge retrieval using verified sources.
- Human/organization verification workflows.
- Advanced semantic search embeddings.
- Buyer-personalized catalog enrichment.

## 22. Dependencies

- PRD 01 — Authentication & Users
- PRD 02 — Artisan Profile & Craft Identity
- PRD 03 — Product / Inventory Management
- PRD 04 — AI Image Processing
- PRD 06 — Voice & Multilingual Accessibility
- PRD 07 — Price Guidance
- PRD 08 — B2B Market Linkage

## 23. Risks

| Risk | Mitigation |
|---|---|
| Hallucinated attributes | Strict grounding + schema + review |
| Invalid JSON | Parser + schema validation + retry |
| Provider outage | Manual fallback |
| Prompt injection | Fixed system instructions + structured inputs |
| Excessive token cost | Compact prompts and bounded input |
| Over-automation | Artisan review remains mandatory |

## 24. Testing Requirements

- Unit tests for schema validation and merge/override rules.
- Prompt contract tests using fixed examples.
- Hallucination regression tests.
- Mixed-language test cases.
- Invalid JSON tests.
- Provider timeout/error tests.
- Artisan-edit precedence tests.
- End-to-end product creation test.
- Security tests for authorization and prompt injection.

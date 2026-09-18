# PRD 08 — B2B Market Linkage & Buyer Discovery

**Project:** ShilpAI  
**SIH Problem Statement:** SIH26090  
**Module:** 08 — B2B Market Linkage & Buyer Discovery  
**Status:** Final Draft v1.1  
**Scope:** MVP  
**Dependencies:** PRD 01, PRD 02, PRD 03, PRD 04, PRD 05, PRD 07  
**Downstream:** None

> This module is a **B2B market-linkage layer**, not a consumer e-commerce system.

> Tags: `[CONFIRMED]`, `[PROPOSED]`, `[ASSUMPTION]`, `[OPEN]`

---

## 1. Objective

Help authenticated buyers discover relevant artisan products and initiate structured B2B inquiries without requiring ShilpAI to become a full checkout, payment, logistics, or shipping platform.

## 2. Problem Being Solved

The SIH problem statement calls for connecting artisans with larger B2B buyers and government e-marketplaces. This module provides the discovery and inquiry bridge needed for that linkage.

The MVP does not attempt to replace procurement, payment, fulfillment, or logistics systems.

## 3. Scope

### In scope — MVP

- Product catalog browsing.
- Product detail pages.
- Craft/category filtering.
- Region/location filtering.
- Price filtering where appropriate.
- Buyer authentication for actions.
- Buyer organization/profile basics.
- Structured B2B inquiry.
- Quantity requirement.
- Requirements/specifications.
- Inquiry inbox for artisans.
- Accept/decline/complete inquiry lifecycle.
- Read/view tracking separate from business status.
- Consent-controlled contact disclosure.

### Out of scope — MVP

- Cart.
- Checkout.
- Payment gateway.
- Escrow.
- Logistics.
- Shipping platform.
- Full order management.
- Consumer marketplace.
- Complex personalized ML recommendations.
- Automatic GeM/ONDC integration unless a real supported API and access are available.

## 4. Target Users

### Buyer

A business/institution looking for products or artisan sourcing relationships.

### Artisan

An artisan receiving and responding to B2B inquiries.

## 5. User Stories

- As a buyer, I want to browse published products.
- As a buyer, I want to filter by craft/category and region.
- As a buyer, I want to inspect product details before contacting an artisan.
- As a buyer, I want to submit a structured bulk inquiry.
- As an artisan, I want to receive inquiries in one place.
- As an artisan, I want to accept or decline an inquiry.
- As an artisan, I want control over when direct contact information is shared.
- As a buyer, I want to know whether my inquiry has been viewed/accepted.

## 6. Functional Requirements

**FR-1** The system shall expose published product listings through the buyer catalog.

**FR-2** `[PROPOSED]` Public browsing may be enabled for published product listings.

**FR-3** `[PROPOSED]` Buyer actions such as inquiry submission require authentication and the BUYER role.

**FR-4** Buyers shall be able to search/filter by supported structured fields.

**FR-5** Buyers shall be able to view product details.

**FR-6** Buyers shall be able to submit an inquiry containing:
- product reference(s);
- requested quantity;
- requirements/specifications;
- target location/delivery context where applicable;
- optional message;
- buyer contact context.

**FR-7** Artisan shall see received inquiries.

**FR-8** Artisan shall be able to accept or decline an inquiry.

**FR-9** Accepted inquiries may progress to `COMPLETED`.

**FR-10** Read state shall be tracked independently using fields such as `isViewed` and `viewedAt`.

**FR-11** Personal phone numbers shall not be automatically exposed.

**FR-12** Direct contact details may be enabled after acceptance and explicit consent.

**FR-13** The system shall prevent unauthorized users from accessing another user's private inquiry data.

## 7. Non-Functional Requirements

- **Mobile-first:** buyer and artisan flows should work on phone-sized screens.
- **Search performance:** standard catalog queries should remain responsive under expected MVP load.
- **Privacy:** personal contact details are protected by default.
- **Explainability:** any matching signal must be understandable.
- **Scalability:** use indexed PostgreSQL queries rather than a separate search cluster for MVP.
- **Reliability:** inquiry creation must be transactional.

## 8. User Flow

### Buyer discovery

1. Buyer opens catalog.
2. Buyer searches/filters.
3. Buyer opens a published product.
4. Buyer reviews artisan/product context.
5. Buyer signs in if necessary to contact.
6. Buyer submits structured inquiry.

### Artisan response

1. Artisan receives inquiry.
2. Inquiry starts in `SUBMITTED`.
3. Artisan opens it; read fields are updated independently.
4. Artisan accepts or declines.
5. If accepted, contact exchange may be enabled according to consent.
6. Work can later be marked `COMPLETED`.

### Important state separation

**Business status:**

```text
SUBMITTED
   ├──> ACCEPTED
   │       └──> COMPLETED
   └──> DECLINED
```

**Read tracking:**

```text
isViewed: false → true
viewedAt: null → timestamp
```

Viewing an inquiry does not change its business status.

## 9. Inputs

### Search/filter

- query;
- craft category;
- product attributes;
- region;
- price where appropriate.

### Inquiry

- buyer ID;
- product ID(s);
- quantity;
- requirements;
- optional message;
- delivery/location context;
- contact-consent state.

## 10. Outputs

### Catalog result

- product information allowed by PRD 03;
- processed/appropriate product image;
- structured catalog information;
- artisan context allowed by PRD 02/08;
- price information allowed by product policy.

### Inquiry

```json
{
  "id": "uuid",
  "buyerId": "uuid",
  "artisanId": "uuid",
  "status": "SUBMITTED",
  "isViewed": false,
  "viewedAt": null,
  "quantity": 50,
  "requirements": "Bulk requirement details",
  "contactConsent": false
}
```

Exact existing entity names must be reconciled with PRD 03 before implementation.

## 11. Business Rules

1. Only published products are discoverable in the marketplace surface.
2. Buyer inquiry actions require appropriate authentication.
3. An inquiry belongs to one buyer and one artisan, with one or more referenced products as permitted.
4. Business status is independent from read/view status.
5. Valid business statuses are:
   - `SUBMITTED`;
   - `ACCEPTED`;
   - `DECLINED`;
   - `COMPLETED`.
6. Viewing an inquiry only changes read tracking.
7. Phone numbers are not automatically returned in public product/profile responses.
8. Before acceptance, communication occurs through the inquiry data available in the application.
9. After acceptance, direct contact options may be enabled only according to explicit consent.
10. No transaction/payment is completed by this module.
11. No buyer is guaranteed a response or supply.
12. No artisan is guaranteed a sale or income improvement.

## 12. AI/ML Requirements

### 12.1 MVP matching

Use explainable structured matching rather than a complex learned recommender.

Potential matching signals:

- craft/category;
- product attributes;
- buyer requirements;
- quantity;
- location;
- price where appropriate.

### 12.2 Matching score

If a score is implemented, any weights are `[PROPOSED]` configurable MVP heuristics, not scientifically validated weights.

Do not present arbitrary weights as trained or statistically proven.

### 12.3 No complex ML

A learned recommendation model should not be built without a representative real dataset containing buyer requirements and successful outcomes.

For MVP, deterministic filtering/ranking is sufficient.

## 13. API Requirements

Suggested endpoints:

### Catalog

- `GET /api/v1/market/products`
- `GET /api/v1/market/products/{productId}`

### Buyer

- `GET /api/v1/buyer/profile`
- `PATCH /api/v1/buyer/profile`

### Inquiries

- `POST /api/v1/inquiries`
- `GET /api/v1/inquiries`
- `GET /api/v1/inquiries/{inquiryId}`
- `PATCH /api/v1/inquiries/{inquiryId}/status`
- `POST /api/v1/inquiries/{inquiryId}/view`
- `POST /api/v1/inquiries/{inquiryId}/contact-consent`

Exact routes should be reconciled with the locked authentication/product conventions before coding.

## 14. Data Requirements

### Buyer profile `[PROPOSED]`

- user ID;
- organization/business name;
- organization type;
- location;
- contact email;
- optional sourcing preferences.

### Inquiry `[PROPOSED]`

- inquiry ID;
- buyer ID;
- artisan ID;
- product IDs;
- quantity;
- requirements;
- message;
- business status;
- `isViewed`;
- `viewedAt`;
- contact-consent state;
- created/updated timestamps.

Do not duplicate the User entity from PRD 01.

## 15. Database Considerations

Use PostgreSQL in the same modular monolith.

Recommended indexes:

- product published/status + category;
- product location;
- product price where filtering is supported;
- inquiry artisan ID + status;
- inquiry buyer ID + status;
- inquiry created timestamp.

A full-text/search engine is not required for MVP.

## 16. Security & Privacy

- Enforce RBAC from PRD 01.
- Verify buyer identity before inquiry creation.
- Verify inquiry ownership for reads and updates.
- Never expose artisan phone number through public catalog APIs.
- Avoid exposing phone number in search results, product JSON, or artisan profile JSON.
- Contact information disclosure must be an explicit authorization path.
- Rate-limit inquiry creation to reduce spam/abuse. Exact threshold `[OPEN]`.
- Validate quantity and input lengths.
- Sanitize/escape user-generated inquiry content.
- Keep private inquiry data out of public endpoints.

## 17. Error Handling

| Scenario | Response |
|---|---|
| Unauthenticated action | `401 UNAUTHORIZED` |
| Wrong role | `403 FORBIDDEN` |
| Product not found | `404 PRODUCT_NOT_FOUND` |
| Product not published | `400 PRODUCT_NOT_AVAILABLE` |
| Invalid quantity/requirements | `400 VALIDATION_ERROR` |
| Duplicate active inquiry | `409 DUPLICATE_INQUIRY` `[PROPOSED]` |
| Invalid status transition | `409 INVALID_INQUIRY_STATUS` |
| Unauthorized inquiry access | `403 FORBIDDEN` |
| Rate limit exceeded | `429 RATE_LIMITED` |

## 18. Edge Cases

- Buyer requests quantity greater than an artisan's displayed capacity.
- Buyer sends multiple inquiries for the same product.
- Artisan declines an inquiry and buyer attempts to reopen it.
- Inquiry is viewed but never accepted.
- Contact consent is withdrawn before direct contact.
- Product becomes unpublished after inquiry submission.
- Product is deleted/archived after inquiry.
- Buyer account becomes inactive.
- Artisan has no phone/contact option configured.
- Matching fields are missing.

The inquiry should retain enough historical product context to remain understandable, without duplicating the entire Product entity. Exact snapshot strategy is `[OPEN]`.

## 19. Acceptance Criteria

- [ ] Published products can be browsed.
- [ ] Buyer filtering works on supported structured fields.
- [ ] Buyer actions require authentication.
- [ ] Buyer can submit a structured B2B inquiry.
- [ ] Artisan can view incoming inquiries.
- [ ] Inquiry business status uses `SUBMITTED`, `ACCEPTED`, `DECLINED`, `COMPLETED`.
- [ ] Read state uses separate `isViewed`/`viewedAt` fields.
- [ ] Viewing does not imply acceptance.
- [ ] Phone numbers are not present in public catalog responses.
- [ ] Direct contact is consent-controlled.
- [ ] No cart, checkout, payment, logistics, or shipping platform exists in MVP.
- [ ] Matching is explainable and does not claim statistical validation.
- [ ] No complex ML recommender is required.

## 20. MVP Scope

- Product discovery.
- Search/filter.
- Buyer authentication.
- Buyer profile basics.
- B2B inquiry.
- Artisan inquiry inbox.
- Accept/decline/complete lifecycle.
- View tracking.
- Contact-consent gate.

## 21. Future Scope

- Government e-marketplace integration where official APIs/access are available.
- Personalized buyer recommendations using real interaction data.
- Order management.
- Sample requests.
- Payments.
- Logistics.
- Bulk procurement workflows.
- Cooperative/group buyer accounts.
- Advanced analytics.

## 22. Dependencies

- PRD 01 — authentication/RBAC.
- PRD 02 — artisan profile/craft taxonomy.
- PRD 03 — published products.
- PRD 04 — processed product imagery.
- PRD 05 — structured catalog.
- PRD 07 — price guidance.

## 23. Risks

| Risk | Mitigation |
|---|---|
| Phone-number harvesting | Consent-controlled disclosure |
| Spam inquiries | Authentication + rate limiting |
| Empty marketplace | Seed/demo data and strong search UX |
| Fake matching confidence | Explainable rules only |
| Scope expansion into e-commerce | Explicit MVP exclusion |
| Product changes after inquiry | Preserve minimal inquiry context |

## 24. Testing Requirements

- Catalog authorization tests.
- Search/filter tests.
- Inquiry validation tests.
- Inquiry state-transition tests.
- Read-state tests.
- Contact-disclosure security tests.
- Phone-number leakage tests across every public endpoint.
- RBAC tests for artisan/buyer access.
- Rate-limit tests.
- End-to-end buyer → inquiry → artisan → accept → consent flow.
- Regression test proving no cart/payment/logistics functionality is required for MVP.

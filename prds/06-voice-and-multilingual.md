# PRD 06 — Voice & Multilingual Accessibility

**Project:** ShilpAI  
**SIH Problem Statement:** SIH26090  
**Module:** 06 — Voice & Multilingual Accessibility  
**Status:** Final Draft v1.1  
**Scope:** MVP  
**Dependencies:** PRD 01, PRD 02, PRD 03  
**Downstream:** PRD 05

> Tags: `[CONFIRMED]`, `[PROPOSED]`, `[ASSUMPTION]`, `[OPEN]`

---

## 1. Objective

Reduce language and typing barriers for artisans by allowing product information to be recorded in a supported language, transcribed into text, optionally translated, reviewed by the artisan, and then consumed by Smart Cataloging.

The module is an **input/accessibility layer**, not the catalog-structuring engine.

## 2. Problem Being Solved

The SIH problem statement identifies language barriers and limited technical skills as barriers to digital commerce. Voice input lets an artisan describe a product naturally instead of typing a long English description.

## 3. Scope

### In scope — MVP

- Voice recording.
- Audio upload.
- Speech-to-text.
- Language detection where supported.
- Translation to a working language where required.
- Native/raw transcript preservation.
- Artisan review/edit.
- Manual typing fallback.
- Processing status/progress.
- Provider adapter.

### Out of scope — MVP

- Catalog field extraction.
- AI product descriptions.
- Text-to-speech read-back.
- Support for every Indian language/dialect.
- Voice-based price setting.
- Voice-based buyer communication.
- Continuous conversational assistant.

## 4. Target Users

**ARTISAN:** records product information using their preferred supported language.

## 5. User Stories

- As an artisan, I want to speak instead of typing.
- As an artisan, I want my original transcript preserved.
- As an artisan, I want to review and correct the transcript.
- As an artisan, I want translation to help downstream catalog generation.
- As an artisan, I want to type manually if voice fails.
- As the system, I want voice processing failures to remain non-blocking.

## 6. Functional Requirements

**FR-1** The system shall allow an artisan to start and stop a voice recording.

**FR-2** The system shall upload the recording securely.

**FR-3** The system shall process the audio asynchronously.

**FR-4** The system shall produce a native/raw transcript when transcription succeeds.

**FR-5** The system may detect the input language. `[PROPOSED]`

**FR-6** The system may produce a translated transcript for downstream processing. `[PROPOSED]`

**FR-7** The raw/native transcript shall remain available even when translation succeeds.

**FR-8** The artisan shall be able to edit the transcript.

**FR-9** The artisan shall always have a **“Type manually instead”** path.

**FR-10** Failure of recording, upload, transcription, or translation shall never prevent product creation.

**FR-11** The module shall expose processing status to the client.

**FR-12** Catalog structuring remains PRD 05's responsibility.

## 7. Non-Functional Requirements

- **Asynchronous:** long audio must not block the product-creation UI.
- **Progress feedback:** show recording/upload/processing state.
- **Latency:** measure p50 and p95; exact target is `[OPEN]`.
- **Reliability:** failures must fall back to typed input.
- **Accessibility:** UI should minimize typing and avoid unnecessary English dependence.
- **Cost:** audio length and provider calls should be bounded.
- **Privacy:** audio and transcripts should be retained only as long as product functionality requires, subject to project retention policy `[OPEN]`.

There is no hard promise such as “60-second audio must finish within 8 seconds p90.”

## 8. User Flow

1. Artisan opens product creation.
2. Artisan chooses **Speak** or **Type manually**.
3. Artisan records audio.
4. Audio is uploaded.
5. UI shows processing status.
6. Speech-to-text runs.
7. Native transcript is stored.
8. Translation runs if required.
9. Translated transcript is stored separately.
10. Artisan reviews and edits.
11. Artisan accepts the text or switches to manual typing.
12. PRD 05 consumes the available text sources.

## 9. Inputs

- Audio recording.
- Selected/declared language if provided.
- Product ID.
- Optional typed correction.

MVP proposed language set:

- Hindi
- Telugu
- Indian English

This is not a claim of complete Indian-language coverage.

## 10. Outputs

Suggested voice record:

```json
{
  "productId": "uuid",
  "rawTranscript": "native-language transcript",
  "translatedTranscript": "translated transcript",
  "detectedLanguage": "te",
  "isArtisanEdited": true,
  "status": "COMPLETED"
}
```

Exact status names should be kept module-local unless a shared job status is already established elsewhere.

## 11. Business Rules

1. Native transcript is a first-class source.
2. Translation never replaces the original transcript.
3. Artisan edits take precedence over generated text.
4. Voice is optional.
5. Manual typing is always available.
6. Failed translation must not erase a successful native transcript.
7. Failed transcription must not prevent product creation.
8. The module does not decide product attributes.
9. The module does not generate prices.
10. The module does not publish products.

## 12. AI/ML Requirements

### 12.1 Processing chain

**Audio → STT → native transcript → translation → artisan review**

### 12.2 Provider abstraction

Provider selection is `[OPEN]`.

Potential providers include:

- Bhashini;
- Whisper;
- Gemini/audio-capable provider;
- another compatible speech provider.

A provider adapter is `[PROPOSED]` so that the implementation can change without changing the product API.

### 12.3 Validation

The system should validate:

- audio type;
- audio size;
- maximum duration;
- provider response;
- transcript non-emptiness.

Exact duration/file limits are `[OPEN]` and should be selected during implementation.

### 12.4 Translation

Translation should preserve meaning and should not add facts. It is a language transformation, not an opportunity to enrich the product description.

## 13. API Requirements

Suggested endpoints:

- `POST /api/v1/products/{productId}/voice`
- `GET /api/v1/products/{productId}/voice/{voiceId}`
- `PATCH /api/v1/products/{productId}/voice/{voiceId}`
- `POST /api/v1/products/{productId}/voice/{voiceId}/retry`

All endpoints must follow PRD 01 authorization and PRD 03 product ownership rules.

## 14. Data Requirements

A `VoiceRecording` representation is `[PROPOSED]` and should contain:

- `id`;
- `productId`;
- `audioUrl` or storage reference;
- `rawTranscript`;
- `translatedTranscript`;
- `detectedLanguage`;
- `isArtisanEdited`;
- processing status;
- provider metadata where safe;
- timestamps.

## 15. Database Considerations

A lightweight `VoiceRecording` table is reasonable because audio processing has its own lifecycle and metadata.

Do not duplicate product information in this table.

Audio should be stored in object storage; database stores references and processing metadata.

## 16. Security & Privacy

- Require authenticated artisan access.
- Verify product ownership before upload/read/edit.
- Validate MIME type, size, and duration server-side.
- Keep provider credentials server-side.
- Do not expose private audio URLs publicly.
- Avoid logging raw audio or full transcripts unless required.
- If third-party providers are used, clearly document that audio/transcripts may be transmitted to that provider. `[PROPOSED]`

## 17. Error Handling

| Scenario | Handling |
|---|---|
| Unsupported audio | `400 INVALID_AUDIO` |
| Too large/long | `400 AUDIO_LIMIT_EXCEEDED` |
| Upload failure | Retry/fallback to typing |
| STT failure | Keep product usable; manual typing |
| Translation failure | Preserve native transcript |
| Provider timeout | Mark failed and allow retry |
| Unauthorized access | `403 FORBIDDEN` |
| Missing product | `404 PRODUCT_NOT_FOUND` |

## 18. Edge Cases

- Strong accent or background noise.
- Code-switching between Telugu and English.
- Very short audio.
- Silence.
- Multiple products mentioned in one recording.
- Artisan changes their mind and types instead.
- Native transcript is good but translation is poor.
- Artisan edits only part of the transcript.
- Same product has multiple voice recordings.

For MVP, the latest accepted voice input can be the active source, while prior recordings remain optional history.

## 19. Acceptance Criteria

- [ ] Artisan can record audio.
- [ ] Audio is processed asynchronously.
- [ ] Native transcript is stored separately.
- [ ] Translation is stored separately when successful.
- [ ] Artisan can edit the text.
- [ ] Manual typing is always available.
- [ ] Voice failure never blocks product creation.
- [ ] PRD 05 can consume both transcript forms.
- [ ] No catalog structuring is implemented here.
- [ ] No price generation is implemented here.
- [ ] p50/p95 processing latency can be measured.

## 20. MVP Scope

- Recording.
- Upload.
- STT.
- Translation.
- Transcript review/edit.
- Hindi/Telugu/Indian English proposed support.
- Manual fallback.
- Provider adapter.

## 21. Future Scope

- Additional Indian languages.
- Better code-switching.
- Text-to-speech.
- Voice navigation.
- Voice-assisted buyer inquiries.
- Offline/low-connectivity audio queuing.
- Human correction workflow.

## 22. Dependencies

- PRD 01 — authentication.
- PRD 02 — artisan/product context.
- PRD 03 — product creation.
- PRD 05 — catalog consumption.
- Object storage.
- Speech/translation provider `[OPEN]`.

## 23. Risks

| Risk | Mitigation |
|---|---|
| Poor transcription | Review/edit + manual fallback |
| Translation changes meaning | Preserve native transcript |
| Provider outage | Manual typing |
| Cost growth | Duration limits + provider adapter |
| Privacy exposure | Private storage + minimal logs |
| Scope creep | Keep catalog logic in PRD 05 |

## 24. Testing Requirements

- Unit tests for recording metadata validation.
- STT provider adapter tests with mocks.
- Translation adapter tests.
- Native/translated transcript persistence tests.
- Failure fallback tests.
- Authorization tests.
- Mixed-language test cases.
- Long-audio asynchronous processing test.
- End-to-end product creation test proving voice failure is non-blocking.

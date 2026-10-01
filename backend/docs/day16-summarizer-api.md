# Day 16 — AI-assisted Post Summarizer (Groq)

## Endpoint
`POST /posts/:id/summarize`
- Auth: JWT required. No request body.
- Success (200): `{ summary, tags, source, truncated }`
  - `summary`: 1-600 characters, whitespace collapsed, clamped with "..." if longer
  - `tags`: 0-8 lowercase strings, each at most 30 characters, unique (longer tags are dropped)
  - `source`: `mock` or `model`
  - `truncated`: true when the post body was cut before summarizing

## Errors
- 400 invalid post id
- 404 post missing or soft-deleted
- 422 body shorter than 80 characters after redaction (not retryable)
- 429 Groq rate limit reached (retryable)
- 502 model output is not valid JSON or fails schema validation, or Groq rejected the JSON (retryable)
- 503 network failure, auth failure, or non-2xx from Groq (retryable)
- 504 Groq did not answer within `SUMMARIZER_TIMEOUT_MS` (retryable)

## Input length behavior
- Body under 80 characters: rejected with 422.
- Body over 4000 characters: first 4000 characters are summarized and `truncated: true` is returned.
- Post bodies are capped at 5000 characters by the posts API, so truncation affects at most the last 1000.

## Provider: Groq
Requests go to Groq's OpenAI-compatible chat completions endpoint with `response_format: { type: "json_object" }` (JSON mode, supported across Groq models), `temperature: 0` and a token cap. JSON mode only guarantees valid JSON, not our schema, so the backend validates the result with `SummaryResultDto` and returns 502 if it does not match.

## Privacy
Only the post title and body are sent. Author id, name, email, avatar, tokens and every other user field are never sent. Emails and phone-like numbers (9+ digits) inside the text are replaced with `[email]` and `[phone]` first. Control characters are stripped.

## Prompt injection
Post text is untrusted. It is wrapped in `<post>` tags, the system prompt says to ignore instructions inside it, delimiter tags inside the text are removed, and the output is validated against a strict schema so free-form text cannot leak through.

## Configuration (backend/.env)
- `GROQ_API_KEY`: set means Groq is used. Empty or missing means the deterministic mock is used.
- `GROQ_MODEL`: default `openai/gpt-oss-20b`. Any Groq chat model id works.
- `GROQ_API_URL`: default `https://api.groq.com/openai/v1/chat/completions`.
- `SUMMARIZER_TIMEOUT_MS`: default 10000.
- `SUMMARIZER_MOCK_FAILURE`: `timeout`, `malformed` or `unavailable` simulates that failure in mock mode (testing only).

## Mock summarizer
Summary is the first two sentences of the body (max 300 characters). Tags are the top 5 words of 4+ letters, excluding stopwords and numbers, scored by frequency with title words weighted 3x, ties broken alphabetically. Same input always gives the same output.

## Limitations
- The mock only extracts text; it does not understand meaning.
- The model can still produce a wrong or biased summary, which is why the UI labels it as AI generated.
- Posts over 4000 characters are only partially summarized.
- No caching: every click is a new Groq call, so the free tier rate limit applies.
- Redaction is regex based, so unusual contact formats can slip through.

## Fallback
If Groq fails, the post and comments stay fully usable. The UI shows an error and a Retry button for retryable errors (429/502/503/504/network), and only a message for 422/404. Without `GROQ_API_KEY` the mock keeps the feature working.
# AIRWISE AI Security & Privacy Practices

1. **Server-Side Secrets**: `GEMINI_API_KEY` is accessed strictly on the Node.js server (`server/geminiAssistant.ts`) and never bundled into client assets or returned in API responses.
2. **Input & Output Validation**: Every backend route validates query parameters and JSON payloads with Zod (`src/lib/validation.ts`). AI responses are parsed and validated against `AssistantOutputSchema` before reaching the client.
3. **Prompt Injection Defense**: User assistant prompts pass through `sanitizeUserPrompt()` to strip control characters and block instruction-override or secret-exfiltration patterns. User questions are enclosed in explicit data delimiters.
4. **No Code Execution**: AIRWISE AI never evaluates or executes AI-generated strings.
5. **Rate Limiting & Payload Caps**: Express enforces sliding-window per-IP rate limits on search, telemetry, and AI routes and caps JSON request bodies at `64kb`.
6. **HTTP Security Headers & CORS**: Disables `x-powered-by`, sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, and `Permissions-Policy: geolocation=(self)`, and restricts CORS to localhost and configured `APP_URL`.
7. **Privacy Minimization**: No personal identifiers, street addresses, or medical records are stored. Geolocation is requested only on explicit user action, and preferences remain in local browser storage with one-click reset.

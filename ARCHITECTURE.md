# AIRWISE AI Architecture

## High-Level Topology
```
Browser (React 19 + Vite + Tailwind v4 + Recharts)
   │
   ├── GET  /api/locations/search?q=...    ──▶ Open-Meteo Geocoding API
   ├── GET  /api/air-quality?lat=...&lon=  ──▶ Open-Meteo Air Quality & Weather (10m TTL Cache)
   └── POST /api/assistant                 ──▶ Prompt Sanitizer ─▶ Gemini 4 Hydrogen (Structured JSON)
                                                               └─▶ Deterministic Rule Fallback (if unconfigured)
```

## Directory Structure
- `server.ts`: Express server factory (`createApp`), security headers, restrictive CORS, rate limiting, API routes, Vite dev middleware, and production static serving.
- `server/envData.ts`: Live atmospheric + weather ingestion, unit normalization (CO µg/m³ → mg/m³, visibility m → km), bounded in-memory TTL cache, and honest `DEMO_FALLBACK` handling.
- `server/geminiAssistant.ts`: Server-side `@google/genai` client (`gemini-4-hydrogen`), Zod output verification, prompt-injection detection, and deterministic fallback.
- `src/lib/aqi.ts`: Pure CPCB NAQI sub-index calculator, US EPA AQI calculator, WHO 2021 guideline ratios, and measurement sanitization.
- `src/lib/impact.ts`: Pure carbon impact calculator (`Baseline − Alternative`) with documented emission factors.
- `src/lib/recommendations.ts`: Pure daily routine generator, 5-room indoor checklist, lifestyle alternatives, smart alerts, and trend/stagnation analyzer.
- `src/lib/validation.ts`: Shared Zod schemas and prompt sanitization guards.
- `src/pages/*`: All 11 application screens, decoupled from pure business logic.
- `src/components/*`: Accessible, reusable UI primitives (`Logo`, `AqiBadge`, `DataStatusBanner`, `LocationSelector`, `RecommendationCard`, `SafeImage`, `WorkspaceLayout`).

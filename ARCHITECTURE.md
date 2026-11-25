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
- `server.ts`: Express server factory (`createApp`), security headers, restrictive CORS/origin normalization, rate limiting, API routes, Vite dev middleware, and production static serving.
- `server/envData.ts`: Live atmospheric + weather ingestion, unit normalization (CO µg/m³ → mg/m³, visibility m → km), bounded in-memory TTL cache, and honest `DEMO_FALLBACK` handling.
- `server/geminiAssistant.ts`: Server-side `@google/genai` client (`gemini-4-hydrogen`), Zod output verification, prompt-injection detection, transient retry, and deterministic fallback.
- `src/lib/aqi.ts`: Pure CPCB NAQI sub-index calculator, US EPA AQI calculator, WHO 2021 guideline ratios, and measurement sanitization.
- `src/lib/exposure.ts`: Personal 24-hour PM2.5 inhalation dose simulator, optimal natural ventilation window finder, and live city-to-city comparison engine.
- `src/lib/impact.ts`: Pure carbon impact calculator (`Baseline − Alternative`) with documented emission factors.
- `src/lib/recommendations.ts`: Daily routine generator, Markdown routine exporter, 5-room indoor checklist, lifestyle alternatives, smart alert generation/filtering, and trend/stagnation analyzer.
- `src/lib/airQualityClient.ts` & `src/lib/assistantClient.ts`: Shared frontend HTTP clients, UUID message IDs, and Markdown session exporter.
- `src/lib/validation.ts`, `src/lib/format.ts`, `src/lib/download.ts`, `src/lib/map.ts`, `src/lib/statusStyles.ts`: Shared Zod schemas, prototype-pollution guards, safe option/CSV/XML formatters, map projection helpers, and shared semantic status styles.
- `src/hooks/useAirwiseState.ts` & `src/hooks/useTabNavigation.ts`: Debounced validated local state persistence and keyboard-accessible ARIA tablist navigation.
- `src/pages/*`: All 11 application screens, decoupled from pure business logic and lazy-loaded behind `ErrorBoundary`.
- `src/components/*`: Accessible, reusable UI primitives (`Logo`, `AqiBadge`, `DataStatusBanner`, `LocationSelector`, `AirQualityMap`, `CityComparisonCard`, `ExposureSimulatorCard`, `AssistantReplyCard`, `DashboardAqiSummary`, `DashboardTrendsSection`, `PollutantGrid`, `AccessibleHourlyTable`, `RecommendationCard`, `SafeImage`, `WorkspaceLayout`).


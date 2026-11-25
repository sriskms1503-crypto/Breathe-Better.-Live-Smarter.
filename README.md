# AIRWISE AI — Urban Air Quality & Environmental Intelligence Assistant

AIRWISE AI is a full-stack, privacy-first environmental protection platform that transforms live air-quality and meteorological data into practical everyday decisions for families, individuals, and neighborhoods.

## 1. Project Overview
AIRWISE AI answers five everyday questions with transparent, science-backed clarity:
1. How safe is the air around me?
2. What should my family do today?
3. How can I protect indoor air quality?
4. Which daily habits can reduce pollution exposure?
5. How much environmental impact can my choices create?

Every recommendation explicitly states what action to take, why it matters, when to act, expected benefits, estimated environmental impact, and confidence/limitations.

## 2. Problem Statement
Urban air pollution and winter smog episodes expose households to fine particulate matter (PM2.5, PM10) and traffic-related gases (NO2, CO, O3). Ordinary families struggle to interpret conflicting AQI scales (CPCB NAQI vs US EPA AQI vs WHO guidelines) or translate raw numbers into actionable indoor protection, daily schedules, and low-emission lifestyle habits.

## 3. Solution
AIRWISE AI pairs live server-side atmospheric and weather telemetry with a Gemini-powered contextual assistant (`gemini-4-hydrogen`), a voluntary 8-group household profile, a 5-room indoor air optimizer, a dynamic morning-to-night routine planner, and a documented carbon impact calculator.

## 4. Key Features
- **Landing Overview**: Editorial overview with live AQI preview and direct workspace entry.
- **Smart AQI Dashboard**: Permission-based geolocation, manual global/Indian city search, CPCB NAQI (6 official categories) vs US EPA AQI vs WHO 2021 guideline comparisons, 6 pollutants, weather metrics, Recharts trend/distribution charts, and accessible table alternatives.
- **AI Family Assistant**: Natural language Q&A grounded in current location telemetry, separating measured facts from estimates and avoiding unsupported medical claims.
- **Smart Daily Routine Planner**: Dynamic Morning, Afternoon, Evening, and Night guidance tailored to household groups and weather dispersion.
- **Indoor Air Quality Optimizer**: Ventilation decision advisor, HEPA/humidity guidance, and interactive 5-room checklist (Bedroom, Living room, Kitchen, Children's room, Workspace) with explicit limitations.
- **Low-Emission Lifestyle Engine**: Transport, Energy, and Household habit alternatives with documented calculation methodology and confidence levels.
- **Environmental Impact Calculator**: Interactive `Baseline - Alternative` CO2e calculator across daily, weekly, monthly, annual, household, and 100-home community projections.
- **Pollution Insights & Early Warning**: Trend direction, peak/cleanest windows, and wind/humidity stagnation risk derived strictly from provider feeds.
- **Community Hub**: Weekly neighborhood challenges, collective carbon estimates, and privacy-safe shareable SVG/text awareness cards.
- **Smart Notification Center**: Configurable alerts for severe AQI, rising PM2.5, safe ventilation windows, filter maintenance, and sustainability goals.
- **Settings & Privacy**: Voluntary household profile configuration, JSON preferences export, and one-click local data reset.

## 5. Technology Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, Lucide Icons
- **Backend**: Node.js, Express, TypeScript, Zod validation
- **AI**: `@google/genai` (`gemini-4-hydrogen`) executed strictly server-side with structured JSON schemas
- **Environmental Data**: Open-Meteo Air Quality API, Open-Meteo Weather Forecast API, Open-Meteo Geocoding API

## 6. Architecture
See [ARCHITECTURE.md](./ARCHITECTURE.md) for module layout, data flow, and caching details.

## 7. Installation
```bash
npm install
```

## 8. Environment Configuration
Copy `.env.example` to `.env` and supply your server-side Gemini API key if using live Gemini AI responses:
```env
GEMINI_API_KEY="your_server_side_gemini_key"
APP_URL="http://localhost:3000"
PORT=3000
```
*Note: Environmental air-quality and weather feeds require no external API key.*

## 9. Running Instructions
Development (Express + Vite middleware on port 3000):
```bash
npm run dev
```
Production build & start:
```bash
npm run build
npm start
```

## 10. Testing Instructions
Run unit and backend API integration tests using Node's native test runner via `tsx`:
```bash
npx tsx --test src/lib/aqi.test.ts src/lib/impact.test.ts src/lib/recommendations.test.ts server/api.test.ts
```
Run TypeScript static type checking:
```bash
npm run lint
```

## 11. Deployment
1. Build frontend assets with `npm run build` (outputs to `dist/`).
2. Ensure `NODE_ENV=production`, `PORT=3000`, `APP_URL`, and `GEMINI_API_KEY` are configured in your hosting environment.
3. Start the server via `npm start` (`node server.ts`).

## 12. API and Data Sources
- **Open-Meteo Air Quality API**: Hourly & current PM2.5, PM10, NO2, SO2, CO, O3, and US AQI.
- **CPCB NAQI Sub-Index Engine**: Computed deterministically in `src/lib/aqi.ts` using official Indian CPCB breakpoints (`Good`, `Satisfactory`, `Moderate`, `Poor`, `Very Poor`, `Severe`).
- **WHO 2021 Guidelines**: PM2.5 (15 µg/m³ 24h), PM10 (45 µg/m³ 24h), NO2 (25 µg/m³ 24h), O3 (100 µg/m³ 8h).
- **Emission Factors**: UK DESNZ/DEFRA (2024) transport factors, India CEA CO2 Baseline v19 (`0.716 kg CO2e/kWh`), IEA Global Avg (`0.475 kg CO2e/kWh`), and EPA WARM waste estimates.

## 13. Security Practices
See [SECURITY.md](./SECURITY.md) for input validation, prompt-injection defense, rate limiting, CORS, and privacy safeguards.

## 14. Limitations
- Regional gridded air-quality feeds reflect ~10–11 km atmospheric resolution rather than hyper-local street-corner sensors.
- When upstream data providers are unreachable, the app explicitly displays `DEMO DATA` and never presents offline fallback snapshots as live readings.
- Carbon calculator estimates carry an indicative ±18% uncertainty depending on local vehicle type and utility generation mix.
- AIRWISE AI does not diagnose medical conditions or replace public-health emergency directives.

## 15. Future Improvements
- Direct integration with official hyper-local CPCB / OpenAQ reference station APIs where low-latency endpoints permit.
- Multilingual household localization (Hindi, Tamil, Bengali, Marathi, Spanish).
- Optional encrypted cloud sync for households sharing routines across devices.

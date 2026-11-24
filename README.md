# ELORA — Ethical Personal Hybrid AI Environment

> **Built for the #BuildHybridAI Hackathon**
> A personal intelligence environment combining **On-Device AI (Gemini Nano / Chrome Prompt API)** and **Cloud AI (Firebase AI Logic & Gemini 3.5 Flash Lite)** with strict privacy controls, persistent multi-tenant memory, a transversal Context Engine, and a verified Action Engine.

---

## Key Features & Architecture

1. **Hybrid AI Orchestration (`firebase/ai` + Gemini Nano)**
   - Uses the official **Firebase AI Logic Hybrid Inference SDK** (`getAI`, `GoogleAIBackend`, `getGenerativeModel`, `InferenceMode`).
   - Supports `ONLY_ON_DEVICE`, `ONLY_IN_CLOUD`, `PREFER_ON_DEVICE`, and intelligent `AUTO` routing via `TaskRouter` and `CapabilityDetector`.
   - **Zero Cloud Leakage:** Requests marked `localOnly` or `only_on_device` strictly refuse cloud fallback if Gemini Nano is unavailable.
   - **Transparent Provenance:** Every assistant message displays its real execution source (`on_device` vs `in_cloud`), model name, latency, and certified fallback status (`fallbackOccurred`).

2. **Transversal Context Engine & Persistent Memory**
   - **8-Category Memory Lifecycle:** `profile`, `preference`, `knowledge`, `objective`, `project`, `habit`, `constraint`, `context`.
   - **Explicit Validation Gate:** AI-suggested memories enter as `candidate` and are never injected into prompts until explicitly approved by the user.
   - **Cross-Space Intelligence:** Connects conversations, Knowledge documents, Planner tasks, Progress goals/focus sessions, and Opportunities.

3. **Verified Action Engine**
   - Strictly validates action payloads, prevents double-execution (idempotency locks), avoids arbitrary hardcoded deadlines, and transitions through `pending -> executing -> accepted | rejected | failed`.

4. **Security & Data Isolation**
   - **Firebase Authentication:** Email/password, Google Sign-In, password reset, and protected user spaces.
   - **Cloud Firestore:** Per-user strict isolation (`/users/{userId}/...`) enforced by hardened `firestore.rules` with schema validation and default-deny.
   - **Firebase App Check:** Configured in `src/lib/firebase/config.ts` with debug token support in development.

---

## Hybrid Inference & Hardware Requirements

ELORA preserves full Gemini Nano on-device support via `firebase/ai` (`ChromeAdapterImpl`) and a W3C/Chrome Prompt API compatibility bridge (`window.LanguageModel` / `window.ai.languageModel`).

### Compatible Devices (On-Device Gemini Nano)
- **Browser:** Google Chrome (Desktop) with Built-in AI / Prompt API enabled.
- **Standard Hardware Requirements:** >= 16 GB RAM or dedicated GPU with >= 4 GB VRAM, and >= 22 GB free disk space.
- **Activation Flags (for testing or lower-RAM devices):**
  1. `chrome://flags/#optimization-guide-on-device-model` -> `Enabled (BypassPerfRequirement)`
  2. `chrome://flags/#prompt-api-for-gemini-nano` -> `Enabled`
  3. Restart Chrome and trigger model download in `chrome://components` (*Optimization Guide On Device Model*).

### Unsupported Hardware Behavior (e.g. 8 GB RAM / Integrated GPU)
On machines that do not meet Gemini Nano's hardware thresholds (such as our test Dell Windows 11, Intel i7-4500U, 8 GB RAM, Intel HD Graphics):
- `CapabilityDetector` honestly reports `available: false` (`no` / `unsupported`) without faking local inference.
- `PREFER_ON_DEVICE` / `AUTO` transparently falls back to Cloud inference (`gemini-3.5-flash-lite`) with `fallbackOccurred: true`.
- `ONLY_ON_DEVICE` / `localOnly` throws an explicit privacy error with zero cloud leakage.

---

## Installation & Setup

### 1. Prerequisites
- Node.js 18+ and npm
- A Firebase project with Authentication, Firestore, and Firebase AI Logic enabled

### 2. Clone & Install
```bash
git clone https://github.com/Melnos/Elora.git
cd Elora
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env.local` and fill in your Firebase project credentials (never commit `.env` or `.env.local`):
```bash
cp .env.example .env.local
```
Required variables:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_GEMINI_API_KEY` (optional developer fallback for local resilience)

### 4. Run Locally
```bash
npm run dev
```

### 5. Run Tests & Production Build
```bash
# Run all 9 automated unit & integration test suites (63 tests)
npm test

# Run live Cloud inference verification
npm run test:live

# Type-check and build production bundle
npm run build
```

### 6. Deploy to Firebase Hosting
```bash
npm run build
npx firebase-tools deploy --only hosting,firestore:rules
```

---

## Hackathon Summary & Demo Video Plan (< 3 min)

### What We Built
Across 8 structured engineering phases, we transformed ELORA from a UI prototype into a verified hybrid AI personal workspace:
- **Phase 1–2:** Responsive Bento-inspired UI across 6 spaces (`Home`, `AI`, `Knowledge`, `Planner`, `Opportunities`, `Progress`) + 3 modals (`Auth`, `Settings`, `Diagnostic`).
- **Phase 3–4:** Firebase Auth, Cloud Firestore per-user isolation, App Check initialization, and 8-category persistent MemoryService.
- **Phase 5–6:** Transversal `ContextEngine` (semantic retrieval + source citations) and `ActionEngine` (strict validation, idempotency, zero arbitrary deadlines).
- **Phase 7–8:** `firebase/ai` Hybrid Inference SDK integration (`ONLY_ON_DEVICE`, `ONLY_IN_CLOUD`, `PREFER_ON_DEVICE`), Chrome Prompt API bridge, honest hardware diagnostics, and full test/build verification.

### 3-Minute Demo Video Storyboard (English)
- **0:00 – 0:30 | Hook & Problem:** Personal productivity apps fragment notes, tasks, and AI chats—and cloud-only AI raises privacy concerns. Introduce ELORA.
- **0:30 – 1:10 | Hybrid AI & Privacy Architecture:** Show `DiagnosticModal` and `AIScreen`. Demonstrate `LOCAL_ONLY` privacy enforcement (zero cloud leakage when Gemini Nano is absent) and `PREFER_ON_DEVICE` transparent cloud fallback (`↩ Repli Cloud` badge).
- **1:10 – 1:55 | Transversal Context & Action Engine:** Ask ELORA a question referencing a Knowledge document and a Progress goal. Show source citations, explicit memory validation (`candidate` -> `active`), and proposing/accepting a task into `Planner`.
- **1:55 – 2:35 | Cross-Space Sync & Security:** Switch between `Home` (dynamic briefing), `Opportunities` (skill-matched), and `Progress` (focus timer). Mention per-user Firestore rules and App Check.
- **2:35 – 2:55 | Closing:** Summarize tech stack (`React`, `TypeScript`, `Firebase AI Logic`, `Gemini Nano`, `Firestore`) and open-source availability.

---

## License
Released under the [MIT License](LICENSE).

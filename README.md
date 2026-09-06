# Life Compass

A private journaling app that notices what keeps coming back in your writing — and only remembers what you allow.

**Live:** https://life-compass-ikty55aqdq-el.a.run.app

---

## What it does

Life Compass is a reflective journaling tool with a consent-first AI layer. You write freely, and the system surfaces patterns across your entries — recurring themes, shifts in focus, what has moved — without storing anything as long-term AI context unless you explicitly choose to.

The core idea: most AI memory systems default to remembering everything. Life Compass defaults to remembering nothing, and makes the boundary between private writing and AI-accessible memory visible and controllable at every step.

### The four surfaces

- **Overview** — A structured reading of your recent journal: what you keep coming back to, recurring themes, progress observations, a reflection prompt, and an overall summary. Cached in Firestore and invalidated only when your entries change, so page reloads never re-run the analysis.

- **Journal** — Write entries with an emoji mood, optional photos, and a date picker for backdating. Entries display in a split view: a scannable list on the left (grouped by month), and the full entry on the right.

- **Conversation** — Chat with an AI that draws on your saved memories and recent journal entries as context. After a response, the system may suggest something worth remembering. You see the suggestion quoted, and choose Remember or Keep Private. Private Reflection mode suppresses suggestions entirely — nothing from that thread can become a memory.

- **Memories** — Everything the AI knows about you, in one place. Each memory shows what it says, why it was saved, when, and where it came from. Delete any of them, or clear everything at once.

---

## Architecture

```
Browser
   │
   ├── Firebase Auth (login)
   ├── Firebase Storage (photos, direct upload)
   │
   └── Cloud Run
         │
         Express server
         ├── /api/journal         Journal CRUD
         ├── /api/chat            Memory-aware conversation
         ├── /api/memories        Memory CRUD + clear-all
         ├── /api/insights        Journal Intelligence + What Changed
         │
         ├── React static files   (built by Vite, served by Express)
         │
         └── Gemini 3.5 Flash-Lite  (via API key in Secret Manager)
               │
               Firestore
               ├── users/{uid}/journalEntries
               ├── users/{uid}/conversations/{id}/messages
               ├── users/{uid}/memories
               └── users/{uid}/insights  (cached analysis)
```

### Key design decisions

**Consent is structural, not a rule.** `chatContext.js` has no write path to the memories collection. The only writer is `POST /api/memories`, which requires an explicit user action. The backend cannot silently remember.

**Pluggable analyzers.** Journal Intelligence runs behind a `selectAnalyzer()` switch. In development, a deterministic analyzer computes real term frequency, theme drift, and writing cadence — no Gemini, no quota. In production, `USE_REAL_GEMINI=true` switches to the Gemini analyzer, which must return valid JSON or the system falls back to the deterministic one automatically. Malformed model output degrades the result; it never poisons the cache.

**Fingerprint-based caching.** Every analysis result is stored in Firestore alongside a SHA-256 fingerprint of the entries it was derived from, plus the schema version and analyzer name. On each request, the fingerprint is recomputed. A match means the cached result is returned and the model is never called. A new entry, an edited entry, a schema bump, or a different analyzer all change the fingerprint and force recomputation.

**Dual auth header.** Google Cloud Shell's Web Preview proxy intercepts the standard `Authorization: Bearer` header for its own session management. The frontend sends the Firebase ID token as `X-Auth-Token` instead, and the middleware accepts either, so the app works in both Cloud Shell and production without code changes.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, emoji-picker-react |
| Backend | Express 5 on Node 22 |
| Auth | Firebase Authentication (email/password) |
| Database | Cloud Firestore (user-isolated collections) |
| Storage | Firebase Storage (journal photos) |
| AI | Gemini 3.5 Flash-Lite via `@google/genai` |
| Secrets | Google Cloud Secret Manager |
| Hosting | Cloud Run (multi-stage Dockerfile) |

---

## Local development

### Prerequisites

- Node.js 22+
- A Firebase project with Authentication, Firestore, and Storage enabled
- A Gemini API key stored in Secret Manager
- `gcloud` CLI authenticated with application-default credentials

### Setup

```bash
git clone https://github.com/LovesSpace/life-compass.git
cd life-compass

# Backend
cd backend
npm install
npm run dev            # starts on port 8080, dummy Gemini

# Frontend (in another terminal)
cd frontend
npm install
npm run build          # Express serves the built files
```

Create `frontend/.env` with your Firebase web config:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### With real Gemini

```bash
USE_REAL_GEMINI=true npm run dev
```

### Deploy

```bash
gcloud run deploy life-compass \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars USE_REAL_GEMINI=true
```

The Dockerfile builds the frontend inside the container, so no manual `npm run build` is needed before deploying.

---

## Security model

- **Firebase Security Rules** protect client-side Firestore and Storage access, scoped to `request.auth.uid == userId`
- **Backend `verifyIdToken()`** validates every API request server-side via Firebase Admin SDK
- **User isolation** — every Firestore path starts with `users/{uid}`, enforced at both the rules and query level
- **No raw journal content in analysis responses** — the intelligence endpoint returns only the derived summary, never the entries themselves
- **Secret Manager** for the Gemini API key — never in code, never in environment files
- **Private Reflection** — flagged on the conversation doc, suppresses memory suggestions at the server level, and instructs the model not to suggest remembering

---

## Project structure

```
life-compass/
├── Dockerfile
├── backend/
│   ├── server.js                  Express entry point
│   ├── authMiddleware.js          Firebase ID token verification
│   ├── journalRoutes.js           Journal CRUD with mood + media
│   ├── chatRoutes.js              Memory-aware conversation
│   ├── chatContext.js             Builds Gemini prompt from memories + journal + history
│   ├── memoryRoutes.js            Memory CRUD + clear-all
│   ├── insightRoutes.js           Journal Intelligence + What Changed
│   ├── insightCache.js            Generic fingerprint-based insight cache
│   ├── geminiService.js           Gemini client with defensive extraction + timeout
│   ├── journalIntelligence/
│   │   ├── index.js               Orchestrator: fetch → fingerprint → cache → analyze
│   │   ├── schema.js              Response contract + validation
│   │   ├── dummyAnalyzer.js       Deterministic term-frequency analyzer
│   │   └── geminiAnalyzer.js      Gemini-backed analyzer (same interface)
│   └── scripts/
│       └── probeGemini.js         One-off diagnostic for Gemini connectivity
├── frontend/
│   ├── index.html
│   ├── src/
│   │   ├── App.jsx                Shell with sidebar nav + memory state
│   │   ├── Auth.jsx               Login with inline landscape illustration
│   │   ├── Intelligence.jsx       Overview / Journal Intelligence panel
│   │   ├── Journal.jsx            Split-view journal with emoji + photo + date
│   │   ├── Chat.jsx               Conversation with consent UI + private mode
│   │   ├── Memories.jsx           Memory list with manual add + clear-all
│   │   ├── DatePicker.jsx         Custom calendar popover
│   │   ├── icons.jsx              Inline SVG icon set
│   │   ├── api.js                 Authenticated fetch helpers
│   │   ├── firebase.js            Firebase client init
│   │   ├── storage.js             Firebase Storage upload helper
│   │   ├── format.js              Date formatting utilities
│   │   └── index.css              Design tokens + full stylesheet
│   └── vite.config.js
└── storage.rules                  Firebase Storage security rules (reference)
```

---

## What would come next

- Gemini-powered memory extraction from conversations (replacing the heuristic suggester)
- Longitudinal "What Changed" with real Gemini analysis and caching
- Entry editing and deletion
- Conversation history (resume past threads)
- Export / data portability
- Rate limiting on the API

---

Built for the Google Cloud hackathon, September 2026.

# AgentDate — Agentic Dating Platform Foundation

AgentDate is an agentic dating platform where real people are represented by AI agents. Public LinkedIn and Instagram profiles are ingested and transformed into autonomous agents that date each other to evaluate real-world compatibility and rank matches.

This repository provides the application foundation, clean dark editorial UI, REST API structure, and modular server setup.

---

## 🏗 Architecture Overview

```
├── server.ts                 # Full-stack Express server & Vite middleware entry point
├── server/
│   ├── data/
│   │   └── store.ts          # In-memory data store for people, sessions, and rankings
│   ├── services/
│   │   ├── people.service.ts # Service logic for profile ingestion & lookup
│   │   ├── dates.service.ts  # Service logic for agent date sessions
│   │   └── rankings.service.ts
│   └── routes/
│       ├── health.ts         # GET /api/health endpoint
│       ├── people.ts         # GET /api/people & /api/people/:id
│       ├── dates.ts          # GET /api/date/:personA/:personB
│       ├── rankings.ts       # GET /api/rankings
│       └── index.ts          # Express API router aggregator
├── src/
│   ├── api/
│   │   └── client.ts         # Frontend REST API client
│   ├── components/
│   │   ├── Navigation.tsx    # Top bar navigation following top-bar contract
│   │   └── Layout.tsx        # Reusable dark editorial layout & footer
│   ├── pages/
│   │   ├── PeoplePage.tsx            # Route: /people
│   │   ├── PersonProfilePage.tsx     # Route: /people/:id
│   │   ├── AgentDatePage.tsx         # Route: /date/:personA/:personB
│   │   └── RankingsPage.tsx          # Route: /rankings
│   ├── App.tsx               # Client-side router configuration
│   ├── main.tsx              # React entry point
│   └── index.css             # Tailwind CSS & dark theme typography
├── .env.example              # Environment variables template
└── package.json              # Project configuration and scripts
```

---

## 🚀 How to Run

### 1. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 2. Install Dependencies
Dependencies are already configured in `package.json`. If installing manually:
```bash
npm install
```

### 3. Start Development Server (Full-Stack Frontend + Backend)
To launch the full-stack app on **port 3000** with hot reloading and Express REST API:
```bash
npm run dev
```

The app will be accessible at:
- **Frontend App**: `http://localhost:3000`
- **Health Check Endpoint**: `http://localhost:3000/api/health`

### 4. Build & Production Run
To build the Vite frontend bundle and run the Express production server:
```bash
npm run build
npm run start
```

---

## 📡 Backend REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Returns `{ "status": "ok" }` health indicator |
| `GET` | `/api/people` | Returns ingested people list `{ data: [], count: 0 }` |
| `GET` | `/api/people/:id` | Returns profile details for person ID or 404 |
| `GET` | `/api/date/:personA/:personB` | Returns agent dating session and state |
| `GET` | `/api/rankings` | Returns compatibility leaderboard list |

---

## 🎨 UI Pages Created

1. **`/people`**: People listing page with empty state and dark editorial design.
2. **`/people/:id`**: Profile details page with required placeholder sections:
   - *About*, *Needs*, *Hobbies*, *Interests*, *Lifestyle*, *Agent*, *Source Links*.
3. **`/date/:personA/:personB`**: Agent dating page with 2 agent identity slots, conversation feed, and compatibility indicators.
4. **`/rankings`**: Compatibility leaderboard page with empty state.

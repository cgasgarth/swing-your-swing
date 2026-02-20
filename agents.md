# Swing Your Swing - Repository Map

Welcome to the `cgasgarth/swing-your-swing` repository! This is a comprehensive, full-stack golf swing analysis application.

## Overview
This project is built as a complete monorepo running exclusively on the **Bun** runtime. It uses a modern architecture specifically designed to be lightweight, incredibly fast, and tightly integrated with AI biomechanics analysis.

- **Frontend**: React 19, Vite 8, Tailwind CSS v4, Recharts
- **Backend (BFF)**: Node.js (Express) running on Bun, native `bun:sqlite`
- **AI/Video**: `@google/generative-ai` (Gemini 1.5 Pro) and `fluent-ffmpeg`

---

## Repository Structure

\`\`\`text
.
├── app/
│   ├── api/                  # Backend Express Server
│   │   ├── src/
│   │   │   ├── index.ts      # Main Express application, routes, and video upload logic
│   │   │   ├── db/           # SQLite schema and initialization built on bun:sqlite
│   │   │   ├── services/     # Core services
│   │   │   │   ├── gemini.service.ts        # Gemini AI prompt logic for swing metrics
│   │   │   │   └── video.compression.ts     # fluent-ffmpeg 1080p compression logic
│   │   │   └── tests/        # Bun native unit tests
│   │   ├── database.sqlite   # Local persistent database file (ignored in git)
│   │   └── .env.example      # Backend environment variables
│   │
│   ├── client/               # Frontend React Application
│   │   ├── src/
│   │   │   ├── App.tsx       # Main Layout and navigation state
│   │   │   ├── index.css     # Tailwind v4 injection point
│   │   │   └── components/   # UI Views
│   │   │       ├── AnalysisDashboard.tsx    # Dashboard with Recharts and AI Drills
│   │   │       ├── GalleryView.tsx          # Previously uploaded swings grid
│   │   │       └── UploadView.tsx           # Video upload and launch monitor inputs
│   │   ├── vite.config.ts    # Bundler config, defaults to Port 3000
│   │   └── .env.example      # Frontend environment variables
│   │
│   └── shared/               # Shared Monorepo Code
│       └── types/            # TypeScript interfaces imported by both backend and frontend
│
├── spec/                     # Original and Implementation Spec documents
├── uploads/                  # Local storage for raw and compressed videos
├── .gitignore                # Global git ignore configurations
├── eslint.config.js          # Global @stylistic 2-space linting rules
├── package.json              # Monorepo workspace definitions and global scripts
└── README.md                 # Primary project context
\`\`\`

## Key Features
1. **Automated Compression**: Videos are proportionately compressed to 1080p locally before analyzing.
2. **AI Telemetry**: The Express server acts as a proxy, sending the videos to Gemini 1.5 Pro to extract joint angles and distances.
3. **Monorepo Types**: The strict TypeScript definitions guarantee the API responses exactly match the React component states.

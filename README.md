# Swing Your Swing

A full-stack, AI-powered golf swing analysis application.

## Features
- **Video Analysis**: Upload slow-motion MP4 or iPhone HEVC videos of your golf swing.
- **AI Biomechanics**: Powered by Gemini 1.5 Pro, the app dynamically analyzes 4 key timestamped positions (Address, Top, Impact, Finish) calculating body angles like spine tilt and shoulder turn.
- **Launch Monitor Integration**: Upload a screenshot of your launch monitor (Trackman, GCQuad) and explicitly bind real-world ball-flight data to your swing.
- **AI Coach**: Recommends personalized drills for an "Ideal" or "Playable" swing path.
- **Gallery & Tracking**: Store, review, and track past swings locally.

## Architecture
This is a modern monorepo built entirely on the **Bun** runtime.

**Backend (`app/api`)**:
- Node.js / Express
- Native `bun:sqlite` database for incredibly fast local caching and metadata storage.
- `@google/generative-ai` integration.

**Frontend (`app/client`)**:
- React 19 + TypeScript
- Vite 8 bundler
- Tailwind CSS v4 for zero-config rapid styling.
- Local video parsing and Recharts data visualization.

## Getting Started

### 1. Prerequisites
You must have [Bun](https://bun.sh) installed.

### 2. Installation
```bash
bun install
```

### 3. Environment Setup
Copy the example environment files into their respective directories:

```bash
cp app/api/.env.example app/api/.env
cp app/client/.env.example app/client/.env
```

You **must** add your Gemini API key to `app/api/.env`.

### 4. Running the App
Start both the Frontend and Backend servers simultaneously from the root directory:

```bash
bun run dev
```

- Local Dev Web App: `http://localhost:3000`
- API Backend: `http://localhost:3001`

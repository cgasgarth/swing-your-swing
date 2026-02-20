# Swing Your Swing - Full Project Specification

## Goal
A comprehensive golf swing analysis application using React, Node.js (BFF), and the Gemini API for multimodal video processing. The app will measure body angles, compare them to professionals (Toros), and provide AI-driven drills and lesson roadmaps.

## Core Requirements

### Video Processing & Analysis
- **Input**: MP4 videos (slow motion).
- **Processing**: Done exclusively on the backend via Gemini API.
- **Key Metric Extraction**:
    - Measure body angles and positioning.
    - Measure swing speed and club path at strike.
    - Estimate distance based on club, angle of attack, and speed.
- **Binary Search**: Use binary search on frames to find specific swing points (address, top, impact, etc.).
- **Pro Comparison**: Compare user data against pre-loaded "Toro" (Professional) swing angles.

### Features
- **Club Support**: Driver, Woods, Irons, Wedges (PW/SW/etc.), and Putter.
- **Multimodal Ingestion**: Link launch monitor photos to specific swing videos.
- **Health & Progress**:
    - Track mechanical changes over time.
    - Gallery of past swings.
    - Personal goal setting.
- **AI Tutoring**:
    - Drill recommendations based on analysis.
    - Lesson roadmaps (Road to "Ideal Swing" vs. "Playable Swing").

### Technical Stack
- **Frontend**: React, Tailwind CSS, TypeScript.
- **Backend**: Node.js, Express, SQLite (better-sqlite3).
- **AI**: Gemini API (Flash/Pro) via `.env`.
- **Standards**:
    - Perfect TypeScript (no `any`, strict casting).
    - Schema validation (Zod).
    - Max 600 lines per file.

## Implementation Checklist

### Phase 1: Foundation
- [ ] Initialize project structure (Client/Server/Shared).
- [ ] Setup Tailwind CSS and Design System.
- [ ] Setup SQLite database schema.
- [ ] Setup Gemini API integration layer.

### Phase 2: Backend Core
- [ ] Video upload & storage logic.
- [ ] Frame extraction (Binary Search implementation).
- [ ] Gemini analysis pipeline (Prompt Engineering for angles).
- [ ] Launch monitor image ingestion.

### Phase 3: Frontend UI
- [ ] Dashboard for swing metrics visualization.
- [ ] Pro comparison overlay/view.
- [ ] Gallery & historical progress charts.
- [ ] Drill & Lesson roadmap interface.

### Phase 4: Intelligence & Polishing
- [ ] Distance & speed estimation logic.
- [ ] AI-driven drill generator.
- [ ] Refine "Ideal vs Playable" logic.
- [ ] Final linting & type safety audit.

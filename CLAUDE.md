# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Hop Onboard** is an interactive org-graph tool built for YHack 2026. It ingests synthetic Slack data, runs LLM-powered extraction pipelines to compute weighted relationships between people and projects, then visualizes the result as interactive D3.js force-directed graphs in a Next.js frontend.

## Commands

### Frontend (Next.js)
```bash
cd frontend
npm install          # install dependencies
npm run dev          # start dev server (localhost:3000)
npm run build        # production build
npm run lint         # eslint
```

### Backend (Python pipeline)
```bash
cd backend
pip install -r requirements.txt

# Full pipeline (run in order when regenerating graph data):
python extract_projects.py     # Pass 1-5: LLM extraction → data/extracted_projects.json
python compute_graph.py        # People graph → frontend/public/graph.json
python compute_project_graph.py # Project graph → frontend/public/project_graph.json

# Run Leiden community detection standalone:
python leiden_communities.py
```

## Environment Variables

Copy `.env.example` to `.env` in the repo root:
```
K2_API_KEY=your_k2_api_key_here
```

The frontend reads `K2_API_KEY` from `process.env.K2_API_KEY` (set in the shell or `.env.local` inside `frontend/`). The backend reads it directly from `ROOT/.env`.

## Architecture

### Data Flow
```
data/slack_data.json
    → backend/extract_projects.py  (5-pass LLM pipeline, caches to data/llm_pass*.txt)
    → data/extracted_projects.json
    → backend/compute_graph.py     (edge weights + Leiden communities)
    → frontend/public/graph.json
    → backend/compute_project_graph.py
    → frontend/public/project_graph.json
```

The two JSON files in `frontend/public/` are the static data assets served to the frontend. They are committed to the repo; re-running the pipeline regenerates them.

### Backend Scripts
- **`extract_projects.py`** — Multi-pass LLM pipeline using K2 Think V2 (via OpenAI-compatible API at `api.k2think.ai`). Identifies projects from Slack messages, assigns messages to projects, computes per-person project weights/roles, generates skills summaries, and project descriptions. Caches raw LLM responses to `data/llm_pass*.txt` so interrupted runs resume without re-calling the API.
- **`compute_graph.py`** — Builds the people graph. Edge weights are derived from message frequency, scaled by recency decay (`e^(-0.01 * days)`) and recipient count (DMs weight more than broadcasts). Calls Leiden for community detection.
- **`compute_project_graph.py`** — Builds the project graph. Edges connect projects sharing people, weighted by `sum(min(weight_a, weight_b))` across shared members.
- **`leiden_communities.py`** — Wraps `leidenalg` + `igraph` for community detection. The same weight constants (`LAMBDA`, `DM_MULTIPLIER`, `GROUP_MULTIPLIER`, `MENTION_MULTIPLIER`) must stay in sync between this file and `compute_graph.py`.

### Frontend Structure
```
frontend/app/
  page.tsx                    # Root: switches between people/project views + chat
  components/
    OrgGraph.tsx              # People force-directed graph (D3)
    ProjectGraph.tsx          # Project force-directed graph (D3)
    AppHeader.tsx             # Top nav: view switcher + search
    ThemeContext.tsx          # Dark/light theme provider
    graph/
      types.ts                # All shared TypeScript types + D3 interfaces + color constants
      ChatPanel.tsx           # Right-side AI chatbot panel
      InfoPanel.tsx           # Right-side person detail panel
      ProjectInfoPanel.tsx    # Right-side project detail panel
      useGraphSimulation.ts   # D3 force simulation hook (shared logic)
      useGraphEffects.ts      # D3 DOM mutation effects hook
      ViewSwitcher.tsx        # People/Projects toggle
      SearchBar.tsx           # Node search
      Legend.tsx / SettingsPanel.tsx / ThemeToggle.tsx
  api/
    chat/route.ts             # Next.js API route: proxies chat to K2 Think V2
```

### Chat API (`app/api/chat/route.ts`)
- Reads `frontend/public/graph.json` at request time to build the system prompt.
- Sends last 6 messages of history to K2 Think V2 (`temperature=0.3`, `max_tokens=1024`).
- Model returns a thinking block wrapped in `<think>...</think>` before the JSON answer. `extractJson()` / `findBalancedJson()` strip the thinking block and parse the structured response `{"answer": "...", "highlightNodeIds": [...]}`.
- Invalid person IDs from the LLM are filtered against the actual node set before returning.

### Key Types (`graph/types.ts`)
`Node`, `Link`, `GraphData` for the people graph; `ProjectInfo`, `ConnectedProject`, `SharedPerson` for the project graph. Color constants (`TEAM_COLORS`, `STATUS_COLORS`, `ROLE_STYLES`, `PROJECT_PALETTE`) live here and are the single source of truth for styling across both graphs.

### LLM / AI
Both the backend pipeline and the chat API use the same model: `MBZUAI-IFM/K2-Think-v2` via the OpenAI-compatible endpoint `https://api.k2think.ai/v1`. The frontend uses the `openai` npm package pointed at this base URL.

# Repository Map — Implementation Spec

**Status:** Draft  
**Product vision:** See [.cursor/research.md](research.md) (do not duplicate here; this file tracks *current* workflow and build decisions).  
**Legacy reference:** [CLAUDE.md](../CLAUDE.md) and [README.md](../README.md) still describe the original YHack “Hop Onboard” Slack + Python pipeline; that stack is **not** present on this branch.

### Resolved (architecture)

| ID | Choice | Summary |
|----|--------|---------|
| **D1** | **A+** | PRs + reviews + **changed files per PR** (via PR API). No issues, global commit crawl, or standalone commit files in v1. |
| **D2** | **Directory-based** | Subprojects = path-derived areas from PR changed files (not PR labels). |

---

## Current repository state

| Area | Status |
|------|--------|
| **GitHub scraper** (`scraper/`) | Skeleton: config, types, bot/activity filters. No scrape or compute entrypoints, no npm scripts. |
| **Analysis / graph compute** | Not implemented (no `backend/`, no compute scripts). |
| **Cache / raw data** | Not in git; intended layout described below. |
| **Frontend** (`frontend/`) | Shell UI: layout, theme toggle, header logo. Graph components, chat API, and D3 removed. |
| **Graph assets** | No committed `frontend/public/graphs/*.json` on this branch. |
| **Env** | Root `.env.example`: `GITHUB_TOKEN`, `K2_API_KEY` (K2 unused by current code). |

---

## Target workflow (as designed)

End-to-end flow aligned with [research.md](research.md), constrained by resolved **D1** / **D2** choices below.

```mermaid
flowchart LR
  subgraph collect [1. Collect]
    GH[GitHub API via Octokit]
    Cache[(cache/owner_repo/)]
    GH --> Cache
  end

  subgraph parse [2. Parse — planned]
    Parse[Repo structure + tech detection]
    Cache --> Parse
  end

  subgraph compute [3. Compute — planned]
    KG[Knowledge graph build]
    Parse --> KG
    Cache --> KG
  end

  subgraph viz [4. Visualize — planned]
    JSON[frontend/public/graphs/*.json]
    UI[Next.js + force graph]
    KG --> JSON
    JSON --> UI
  end
```

### Stage 1 — GitHub data collection (planned)

**Goal:** Normalized per-repo activity for contributors, PRs, reviews, and per-PR file changes (**D1: A+**).

**In scope (v1)**

- Pull request metadata, authors, labels (metadata only; not used for subprojects per **D2**)
- Reviews on those PRs
- **Changed files** on each PR (`GET /repos/{owner}/{repo}/pulls/{pull_number}/files` or equivalent)

**Out of scope (v1)**

- Issues, issue comments, assignees
- Repository-wide commit history / co-author mining
- Local repo clone at collect time

**Inputs**

- `GITHUB_TOKEN` (root `.env`)
- Repo list: `scraper/src/config.ts` → `REPOS`
- Time window: `WINDOW_MONTHS` (6 months)

**Planned API surface (Octokit)**

| Entity | Fields (target) | Notes |
|--------|-----------------|--------|
| Pull requests | `RawPR`: number, title, author, created_at, labels, **`files: { path, additions, deletions }[]`** | Labels kept for optional display; **D2** uses `files` only |
| Reviews | `RawReview`: pr_number, reviewer, submitted_at | Collaboration edges |
| Contributors | `ContributorStat`: login, name, avatar_url | Profile + avatar for nodes; commit count optional |

**Deferred from research.md Stage 1:** issues, standalone commits, PR-linked issue cross-refs.

**Filtering (implemented)**

- Bots: `KNOWN_BOTS` + `[bot]` suffix (`filters.isBot`)
- Active contributors: combined PR + review count ≥ `MIN_ACTIVITY` (`filterActiveContributors`)

**Intended cache layout (not yet written by code)**

```
cache/<owner>_<repo>/
  prs.json          # includes per-PR changed file paths
  reviews.json
  contributors.json # optional; may be folded into compute from PR/review authors
```

Local-only; not committed (see `.gitignore` patterns).

**Status:** Not started (no fetch scripts). Extend `scraper/src/types.ts` `RawPR` with `files` before implement.

---

### Stage 2 — Repository parsing (planned)

**Goal:** Technology graph — modules, languages, frameworks, contributor touchpoints.

**Research scope:** File paths from PRs/commits, dependency manifests, imports, directory structure.

**Status:** Not implemented. No clone-or-parse step exists.

---

### Stage 3 — Knowledge graph computation (planned)

**Goal:** Contributor graph JSON for the frontend, with directory-based subprojects (**D2**), expertise, and collaboration edges.

**Algorithm (v1; not coded)**

1. **Subsystems (“projects”) — directory-based (D2)**  
   - For each PR, map every changed file path → a **subproject ID** (canonical directory key).  
   - Default rule (until repo-specific tuning): use the **first meaningful path segment** after the repo root (e.g. `packages/react-reconciler/...` → `packages/react-reconciler`; `src/...` → `src`). Monorepos may need a allowlist of roots (`packages/*`, `cmd/`, etc.) — document per target repo in compute config when needed.  
   - Contributor touch weight on subproject *S*: sum over their PRs of (lines changed or file-count) in paths mapped to *S*.  
   - `GraphNode.team` = highest-weight subproject; `projects` = ordered subproject IDs; `project_roles` = normalized weights + role string (e.g. `lead` / `core` / `contributor` by weight quantiles — TBD in compute).  
   - `GENERIC_LABELS` in config is **not** used for subproject boundaries; labels remain on `RawPR` for optional UI only.

2. **Contributor nodes** — One node per active GitHub login; `expertise` = TF-IDF keywords from PR titles (v1 heuristic; **D3** open).

3. **Collaboration edges** — Weighted by PR reviews. Recency: `weight *= exp(-LAMBDA * days)` with `LAMBDA = 0.005`. Review multiplier: `REVIEW_WEIGHT = 1.0`. Optional future: shared subproject ownership as edge boost (**D6**).

4. **Communities** — Louvain on the contributor graph (**D5** open; default dep already in `scraper/package.json`).

**Output schema (defined in `scraper/src/types.ts`)**

```ts
GraphData {
  repo: string
  generated_at: string
  nodes: GraphNode[]   // contributors
  links: GraphLink[]   // collaboration
}
```

**Intended publish path**

```
frontend/public/graphs/<owner>_<repo>.json
```

One file per repo in `REPOS`; frontend loads selected graph at runtime (mechanism TBD).

**Status:** Types and constants only; no `compute` script.

---

### Stage 4 — Frontend visualization (partial)

**Goal:** Interactive exploration per [research.md](research.md): contributor, project, and technology views.

**Current UI**

- `app/page.tsx` — full-height layout: `AppHeader` + empty `MainArea`
- `AppHeader.tsx` — logo, dark/light toggle (`ThemeContext`)
- Dependencies: Next.js 16, React 19, Tailwind 4 — **no** D3, graphology, or OpenAI client

**Removed (not on branch)** — To be reimplemented or replaced: `OrgGraph`, `ProjectGraph`, graph panels, search, view switcher, `api/chat/route.ts`.

**Status:** Shell only.

---

## Data flow summary

| Stage | Input | Output | Owner |
|-------|--------|--------|--------|
| Collect | GitHub API | `cache/*/` raw JSON | `scraper/` (planned) |
| Parse | Cache + repo tree | Tech / module graph (format TBD) | TBD |
| Compute | Cache (+ parse) | `GraphData` (+ project/tech graphs TBD) | `scraper/` or separate package |
| Visualize | Static JSON | Browser UI | `frontend/` |

---

## Configuration reference

| Constant | Value | Purpose |
|----------|-------|---------|
| `REPOS` | 5 OSS repos (react, vscode, redis, k8s, rust) | Demo / dev targets |
| `WINDOW_MONTHS` | 6 | Activity window |
| `MIN_ACTIVITY` | 3 | Min PR+review actions for a node |
| `LAMBDA` | 0.005 | Per-day recency decay on edges |
| `REVIEW_WEIGHT` | 1.0 | Review edge multiplier |
| `CO_COMMENT_WEIGHT` | 0.3 | Reserved; out of scope while **D1** excludes issues |
| `GENERIC_LABELS` | (set in config) | Not used for subprojects (**D2**); may be removed or repurposed later |

---

## Commands (today)

```bash
# Frontend shell
cd frontend && npm install && npm run dev

# Scraper — no scripts defined yet
cd scraper && npm install
```

---

# Architectural decisions to make

Record choices here as they are resolved. Each item lists options and what it blocks.

---

## D1 — MVP ingestion scope — **RESOLVED: A+**

**Choice:** PRs + reviews + **changed files on each PR** (GitHub PR files API). No issues, no repo-wide commit crawl in v1.

**Rationale:** Enough for review-based collaboration and directory-based ownership (**D2**) without full research.md Stage 1 volume. Issue comments and off-PR commits deferred.

**Implements:** Scraper fetch list, `RawPR.files`, cache `prs.json` shape.

**Deferred (not compromising v1 scope):** issue-thread edges, issue-only actors, co-author / direct-commit signal, full research.md activity linking table.

---

## D2 — Subproject / subsystem detection — **RESOLVED: Directory-based**

**Choice:** Subproject IDs derived from **paths in PR changed files** (from **D1**), not from PR/issue labels.

**Rules (v1):**

- Path → subproject key via configurable directory segmentation (default: first path segment under repo root; tune for monorepos).
- Contributor ↔ subproject weights from aggregated PR file activity in that key.
- Project graph nodes (if **D4** adds a second file) use the same directory keys as IDs.

**Does not use:** `GENERIC_LABELS` for boundaries (config may stay for other uses or be removed later).

**Still needs (implementation detail):** per-repo path roots table for large monorepos; edge case handling for root-level files (`.github/`, `README`).

**Blocks:** Compute module, `GraphNode.team` / `projects` / `project_roles`, project view data.

---

## D3 — Skill / expertise representation

**Question:** How are contributor skills stored?

| Option | Notes |
|--------|--------|
| **TF-IDF on PR titles** | Declared in `GraphNode.expertise` comment |
| **Structured taxonomy** | Languages, frameworks as typed entities (research.md) |
| **LLM summaries** | Old Hop Onboard pattern; contradicts “no commit LLM” unless aggregated-only |
| **Hybrid** | Heuristics for graph; optional LLM for panel copy |

**Blocks:** Node schema, whether Stage 2 parse is mandatory for v1.

---

## D4 — Graph artifacts and schemas

**Question:** How many graph files and what do they contain?

| Option | Notes |
|--------|--------|
| **Single `GraphData`** | Contributors + subsystem metadata on nodes only |
| **Two files** | `graph.json` (people) + `project_graph.json` (subsystems as nodes) — old Hop Onboard |
| **Three views / graphs** | Separate contributor, project, technology graphs (research.md) |

**Blocks:** Frontend view switcher, compute pipeline outputs, TypeScript types in frontend.

---

## D5 — Community detection library

**Question:** Which algorithm packages communities on contributor nodes?

| Option | Notes |
|--------|--------|
| **Louvain** | Already in `scraper/package.json` (`graphology-communities-louvain`) |
| **Leiden** | Used in legacy Python (`leidenalg`); not in current deps |

**Blocks:** Dependency choice; parity with any published comparison docs.

---

## D6 — Edge semantics (collaboration)

**Question:** What events create or strengthen edges?

| Signal | Status |
|--------|--------|
| PR review | Planned (`REVIEW_WEIGHT`) |
| Issue / PR co-comment | Out of scope (**D1**); `CO_COMMENT_WEIGHT` reserved |
| Co-authored commits | Out of scope (**D1**) |
| Shared directory subproject ownership | Optional v1 boost (same **D2** keys on both nodes) |
| Shared changed paths | Folded into **D2** weights, not separate edge type in v1 |

**Blocks:** Edge construction in compute stage.

---

## D7 — Pipeline packaging and language

**Question:** Where does fetch + parse + compute live?

| Option | Notes |
|--------|--------|
| **All TypeScript in `scraper/`** | Octokit + graphology already there |
| **Split `scraper/` + `analysis/`** | Clear collect vs compute boundaries |
| **Python analysis** | Legacy pattern; no code on branch |

**Blocks:** Repo layout, CI jobs, developer workflow.

---

## D8 — Intermediate schemas

**Question:** Are normalized artifacts required between cache and graph JSON?

Examples: unified “activity event” stream, per-PR file lists, **path segment → subproject ID** map versioned per repo.

**Blocks:** Ability to re-run compute without re-fetching; debugging and tests.

---

## D9 — Repository parsing depth (Stage 2)

**Question:** Is local clone + static analysis in scope for v1?

| Option | Notes |
|--------|--------|
| **Skip** | Directory subprojects from PR paths only (**D1** + **D2**) |
| **GitHub API tree** | Languages endpoint + paths from PR files + light manifest read |
| **Full clone** | Manifests, imports, framework detection per research.md |

**Blocks:** Technology view (D4), structured skills (D3), timeline.

---

## D10 — LLM usage

**Question:** Is K2 (or any LLM) used in this product?

| Option | Notes |
|--------|--------|
| **None** | Heuristic graph only; matches research “no commit LLM” |
| **Summaries only** | Optional narratives in side panels |
| **Chat over graph** | Restore API route; needs graph context + key |
| **Extraction pass** | Reintroduce multi-pass pipeline on aggregated data |

**Blocks:** `.env` requirements, API routes, cost/latency, panel UI design.

---

## D11 — Frontend graph stack

**Question:** How is the force-directed graph rendered?

| Option | Notes |
|--------|--------|
| **D3 (prior art)** | Previous implementation removed; team knows it |
| **React wrapper** | e.g. react-force-graph, vis-network |
| **WebGL / large-graph lib** | If OSS repos produce huge node counts |

**Blocks:** Component architecture, performance tuning, migration effort.

---

## D12 — Multi-repo UX

**Question:** How does the user pick a repository?

| Option | Notes |
|--------|--------|
| **Build-time** | One repo per deployment |
| **URL param** | `/repo/facebook/react` |
| **In-app selector** | Dropdown over `REPOS` or user input |
| **Arbitrary GitHub URL** | Requires token + on-demand pipeline |

**Blocks:** Routing, static asset paths, whether compute is online or offline.

---

## D13 — Data delivery to the browser

**Question:** How does the frontend get graph data?

| Option | Notes |
|--------|--------|
| **Static JSON in `public/graphs/`** | Precomputed demo; simple hosting |
| **Next.js API route** | Read cache or graph at request time |
| **External store** | DB or object storage for production |

**Blocks:** Hosting model, refresh story, private repos.

---

## D14 — Authentication and private repos

**Question:** Who supplies `GITHUB_TOKEN`?

| Option | Notes |
|--------|--------|
| **Developer-only** | CLI scrape of public repos |
| **Server-side secret** | Single org token for demo |
| **User OAuth** | Per-user private repo access |

**Blocks:** Security model, deployment, scraper entrypoint design.

---

## D15 — Incremental updates

**Question:** After initial scrape, how is data refreshed?

| Option | Notes |
|--------|--------|
| **Full re-scrape** | Simplest |
| **Incremental** | Since-last-run cursors; harder with GitHub rate limits |

**Blocks:** Cache schema versioning, CI scheduling.

---

## D16 — Documentation drift

**Question:** When to rewrite `CLAUDE.md` / `README.md`?

Should happen after D4, D7, and D10 are decided (D1–D2 done) so agent and human docs match the GitHub pipeline.

**Blocks:** Contributor onboarding only (not runtime).

---

## Suggested decision order

1. ~~**D1** (MVP ingestion)~~ → ~~**D2** (subprojects)~~ → **D4** (graph files)  
2. **D7** + **D8** (pipeline layout + schemas) → implement collect + compute  
3. **D3**, **D5**, **D6** (expertise, communities, edges) — can tighten during first graph  
4. **D9**, **D10** (parse depth, LLM) — scope v2 vs v1  
5. **D11**–**D13** (frontend) once sample `GraphData` exists  
6. **D14**–**D15** (auth, incremental) before production / private repos  

---

## Resolved decisions

| ID | Decision | Date | Notes |
|----|----------|------|--------|
| **D1** | **A+** — PRs, reviews, PR changed files | 2026-06-03 | No issues or global commits in v1 |
| **D2** | **Directory-based** subprojects | 2026-06-03 | Path keys from PR files; labels not used for boundaries |

# Repository Map

Visualize how open-source repositories are organized — who collaborates with whom, which areas of the codebase they work in, and what technologies they touch.

The pipeline pulls recent GitHub activity (PRs, reviews, changed files), enriches it with language and dependency data, builds contributor and project graphs, and serves them in an interactive Next.js UI.

## Architecture

| Package | Role |
|---------|------|
| **`scraper/`** | Collects PR/review data from the GitHub API and enriches each repo with languages, manifests, and a normalized activity stream. |
| **`compute/`** | Derives subprojects (directory-based areas), per-repo skills, collaboration edges, and publishes graph JSON to `frontend/public/graphs/`. |
| **`frontend/`** | Next.js app with D3 force-directed graphs — **Contributors** tab (people + collaboration) and **Projects** tab (codebase areas + shared membership). |

```
GitHub API → scraper/ → cache/<owner>_<repo>/ → compute/ → public/graphs/ → frontend/
```

## Quick start

```bash
# 1. Configure GitHub access
cp .env.example .env   # add GITHUB_TOKEN

# 2. Scrape + enrich a repo
cd scraper && npm install
npm run scrape -- --repo redis/redis

# 3. Build graphs
cd ../compute && npm install
npm run build -- --repo redis/redis

# 4. Run the UI
cd ../frontend && npm install && npm run dev
```

Open [http://localhost:3000](http://localhost:3000), pick a repo from the dropdown, and explore the graphs.

## TODO — Graph improvements

### Both graphs

- [ ] Improve node and edge coloring (clearer visual distinction between groups and link strength)
- [ ] Add a filter to hide weak connections and low-activity nodes

### Contributor graph

- [ ] Size nodes by number of contributions (PRs + reviews), not a fixed radius
- [ ] Parse skills and dependencies into more human-readable labels (e.g. turn `dep:react` / `path:packages` into plain-language groupings in the sidebar)

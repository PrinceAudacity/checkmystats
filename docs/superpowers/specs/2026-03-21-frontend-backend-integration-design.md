# Frontend–Backend Integration Design

**Date:** 2026-03-21
**Status:** Approved
**Scope:** Refactor frontend to route all data through the FastAPI backend; remove all direct Supabase data calls from the frontend.

---

## Problem

The frontend currently bypasses the backend for almost all data:
- Skill graph (nodes, edges, categories) is loaded from a static `skillData.js` file at module init
- User skill statuses and career paths are written/read directly via `@supabase/supabase-js`
- Only the `/search/` endpoint is called from the frontend
- 8 of 9 backend endpoints are unused
- The backend has no routes for user data at all

Additionally, `SearchBar.jsx` already reads `node.display_name` and `node.subject_category`, but the backend currently returns `name` and `cat` — search results are visibly broken today.

---

## Goals

- Frontend never calls Supabase directly for data (auth only)
- All reads and writes go through the FastAPI backend
- Backend validates the Supabase JWT on protected routes
- Dead code (static data file, unused services, orphaned components) is removed
- Consistent loading/error states across all data-dependent components

---

## Architecture

```
Frontend                              Backend
──────────────────────                ──────────────────────────────────
AuthContext (Supabase auth only)  →   JWT middleware (verify Bearer token)
                                           │
useGraph        ── GET /nodes/ ───────────┤
useSkillStatus  ── GET/PUT /user/skills/ ─┤  → Supabase DB
useCareerPaths  ── GET/POST/DELETE        │
                   /user/careers/ ────────┤
usePaths        ── GET /paths/ ───────────┤
SearchBar       ── GET /search/ ──────────┘
```

Authentication token flow:
1. User signs in → Supabase returns JWT → stored in AuthContext
2. Hooks call `api.js` functions
3. `api.js` Axios request interceptor calls `supabase.auth.getSession()` directly (imported from `src/services/supabase.js`) to retrieve the current session token, then attaches it as `Authorization: Bearer <token>`. If `supabase` is `null` (env vars not configured), the interceptor returns the config unmodified — no throw. The missing-env-vars case is treated as a build-time configuration error; the app will receive 401s from the backend which triggers sign-out.
4. Backend JWT middleware verifies token → extracts `user_id` → passes to route
5. Route queries Supabase with `user_id` → returns data to frontend

---

## Backend Changes

### 1. JWT Middleware

A FastAPI dependency `get_current_user` that:
- Extracts the Bearer token from the `Authorization` header
- Verifies it using the Supabase service role key
- Returns the authenticated `user_id`
- Returns HTTP 401 if token is missing or invalid

All `/user/*` routes declare this dependency. Graph routes (`/nodes/`, `/paths/`, `/search/`, `/categories/`) remain public.

### 2. Schema Field Rename in `schemas.py` — implement first

`SkillNodeSummary` currently has fields `name` and `cat`. These are **renamed** to `display_name` and `subject_category` across the entire schema. This must land before any frontend hook work begins — `SearchBar.jsx` is already broken today against the current field names, and all subsequent hook code assumes the renamed fields.

All backend routes that return `SkillNodeSummary` are affected: `/search/` and `/nodes/`.

All frontend components that consume node objects must be updated for the rename simultaneously:
`useGraph`, `MapCanvas`, `NodeDetail`, `PathInfo`, `CareerView`, `SearchBar`, **`Sidebar`**, and `useAppState`.

### 3. New File: `backend/routes/user.py`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/user/skills` | ✓ | Fetch all skill statuses for the current user |
| PUT | `/user/skills/{skill_id}` | ✓ | Upsert a skill status |
| GET | `/user/careers` | ✓ | Fetch all saved career paths for the current user |
| POST | `/user/careers` | ✓ | Save a new career path |
| DELETE | `/user/careers/{career_id}` | ✓ | Delete a saved career path |

**Skill status enum** — the backend accepts and returns:
- `not_started`
- `in_progress`
- `mastered`

`useSkillStatus` handles mapping from any legacy frontend strings (`notstarted`, `inprogress`) to these canonical values.

**`PUT /user/skills/{skill_id}` request body:**
```json
{ "status": "not_started" | "in_progress" | "mastered" }
```
Timestamps (`started_at`, `completed_at`) are computed server-side: `started_at` is set on first transition away from `not_started`; `completed_at` is set when status becomes `mastered`. The frontend never sends timestamps.

### 4. Deprecate `backend/routes/saved_paths.py`

`saved_paths.py` implements overlapping career-path persistence via a different table and schema. It is **removed entirely**. The new `/user/careers/` endpoints backed by `user_career_paths` table are the sole career-path persistence mechanism. All saved paths routes are unregistered from `main.py` and the file deleted.

### 5. Add `degree_level` to Schema and DB

`layout.js` buckets tier-3 nodes into `bs / ms / phd` radius rings via `n.level`. The static `skillData.js` carries this as a `level` field, but `SkillNodeBase` and the `skill_nodes` table have no equivalent column — only `edu_level` (an unrelated `elem/middle/hs` enum for K-12 grade levels).

Required changes:
- Add a DB migration: `ALTER TABLE skill_nodes ADD COLUMN degree_level VARCHAR(8);` with values `'bs'`, `'ms'`, `'phd'` for tier-3 nodes (NULL for tiers 1 and 2)
- Add `degree_level: Optional[str] = None` to `SkillNodeBase` in `schemas.py`
- `computeNodePositions(nodes)` uses `n.degree_level` for tier-3 ring bucketing (replacing `n.level`)

Without this, all tier-3 nodes silently collapse into the Bachelor's ring.

### 6. No Changes To

`/nodes/`, `/paths/`, `/categories/`, `/health/`, `/` — logic unchanged; only the field renames (points 2 and 5 above) affect response shape.

---

## Frontend Changes

### Service Layer

**`src/services/api.js`** — rewritten as a single authenticated Axios client:
- Creates one Axios instance with `baseURL` from `VITE_API_URL`
- Request interceptor calls `supabase.auth.getSession()` (imported from `src/services/supabase.js`); if `supabase` is null, returns config unmodified (no throw)
- Response interceptor catches 401s → calls `supabase.auth.signOut()` → redirects to `/`
- Exports one async function per backend endpoint

**`src/services/dataService.js`** — deleted

**`src/services/supabase.js`** — kept (auth + `getSession()` for interceptor only)

### Utilities: `utils/graph.js` and `utils/layout.js`

`utils/graph.js` currently imports `SKILL_NODES` and `EDGES` from `skillData.js` at module load and exports singletons (`nById`, `prereqOf`, `leadsTo`, `buildFullPath`, `layoutCareerDAG`).

After this refactor, `graph.js` exports **pure functions only** — every function that previously closed over the module-level singletons is rewritten to accept `nodes`/`edges`/`nodeMap` as the first parameter:

| Old (singleton) | New (pure function) |
|-----------------|---------------------|
| `buildFullPath(id)` | `buildFullPath(nodeMap, edges, id)` |
| `layoutCareerDAG(ids)` | `layoutCareerDAG(nodeMap, ids)` |
| `prereqOf(id)` | `prereqOf(edges, id)` |
| `leadsTo(id)` | `leadsTo(edges, id)` |
| `nById[id]` | `nodeMap[id]` (callers use nodeMap directly) |

The module-level singleton variables (`nById`, `prereqOf`, `leadsTo` as singletons) are deleted. Module no longer imports from `skillData.js`.

`utils/layout.js` similarly exports `computeNodePositions(nodes)` instead of a pre-computed `NODE_POSITIONS` constant. Called once inside `useGraph` after data loads.

### Custom Hooks

| Hook | File | Replaces | Exposes |
|------|------|----------|---------|
| `useGraph` | `src/hooks/useGraph.js` | Static `skillData.js` import + `useSkillData.js` | `{ nodes, edges, categories, nodeMap, positions, loading, error }` |
| `useSkillStatus` | `src/hooks/useSkillStatus.js` | `dataService.fetchUserSkillStatuses` + `upsertSkillStatus` | `{ statuses, updateStatus, loading, error }` |
| `useCareerPaths` | `src/hooks/useCareerPaths.js` | `dataService.fetchUserCareerPaths` + `insertCareerPath` + `deleteCareerPath` | `{ careers, addCareer, removeCareer, loading, error }` |
| `usePaths` | `src/hooks/usePaths.js` | `buildFullPath()` calls in `useAppState` and `CareerView` | `{ findPath, path, loading, error }` |

All hooks expose a consistent `{ data, loading, error }` shape. Mutations wait for backend confirmation before updating local state — no optimistic updates.

### `useAppState.js` Migration

`useAppState.js` is updated to:
- Call `useCareerPaths` instead of `dataService` for career CRUD
- Call `usePaths` instead of `buildFullPath()` for pathfinding
- Accept `{ nodes, edges, nodeMap, positions }` as a parameter (passed down from the parent component that calls `useGraph`) rather than importing from static data
- Call `layoutCareerDAG(nodeMap, ids)` (pure function) instead of the old singleton version

### `App.jsx` Migration

`App.jsx` calls `useGraph` and passes its output down to `useAppState` and child components:
- `SKILL_NODES` → `nodes` from `useGraph`
- `CAT_NAMES` → `categories` from `useGraph`
- `useSkillData()` loading guard → replaced by `loading` from `useGraph`

### `CareerView.jsx` Migration

`CareerView.jsx` currently imports `nById` and `buildFullPath` as singletons directly. After this refactor:
- `nById` is replaced by `nodeMap` passed as a prop from `App.jsx` (which gets it from `useGraph`)
- `buildFullPath` inside event handlers is replaced by calling `usePaths`'s `findPath` function; since `usePaths` is a hook it must be called at the `CareerView` component level, with path state managed there rather than inline inside the event handler

### `Sidebar.jsx` Migration

`Sidebar.jsx` directly imports `SKILL_NODES`, `CAT_NAMES`, `CAT_COLOR`, `TIER_LABEL` from `skillData.js` and accesses `n.name` / `n.cat`. After this refactor:
- These values are received as props from `App.jsx` (sourced from `useGraph`)
- Field references updated from `n.name` / `n.cat` to `n.display_name` / `n.subject_category`

### `SearchBar.jsx` Fix

`SearchBar.jsx` already reads `node.display_name` and `node.subject_category` — this becomes correct once the backend schema rename lands. The unused `graphData` prop is removed from the component signature.

### Dead Code Removed

| File | Reason |
|------|--------|
| `src/data/skillData.js` | Replaced by `useGraph` fetching from `/nodes/` |
| `src/services/dataService.js` | Replaced by `api.js` + new hooks |
| `src/components/PathFinder.jsx` | Never imported; pathfinding now via `usePaths` + existing `PathInfo` |
| `src/components/NavActions.jsx` | Never imported; out of scope for this refactor |
| `src/hooks/useTheme.js` | Only used by the deleted `NavActions.jsx` |
| `src/hooks/useSkillData.js` | Was a no-op; replaced by `useGraph` |
| `backend/routes/saved_paths.py` | Replaced by `/user/careers/` endpoints |

---

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| 401 from backend | Axios interceptor signs user out and redirects to `/` |
| Network / 5xx error | Hook sets `error` state; component renders inline error message |
| `/nodes/` fails on app load | Canvas shows a load error instead of blank screen |
| Mutation fails | Error state set; UI stays in previous state |
| `supabase` is null (missing env vars) | Interceptor skips token attachment; backend returns 401; user is signed out |

---

## Implementation Order

Order matters because of the cascading field rename:

1. **DB migration** — add `degree_level VARCHAR(8)` column to `skill_nodes` table, populate from existing data
2. **Backend schema rename** (`name` → `display_name`, `cat` → `subject_category`) + add `degree_level` to `SkillNodeBase` — fixes existing SearchBar breakage
3. **Backend JWT middleware + `/user/*` endpoints + deprecate `saved_paths.py`**
4. **Rewrite `utils/graph.js` and `utils/layout.js`** as pure functions
5. **Rewrite `src/services/api.js`** with auth interceptor
6. **Implement `useGraph`**, remove `skillData.js` and `useSkillData.js`
7. **Update `App.jsx`, `Sidebar.jsx`, `MapCanvas.jsx`, `CareerView.jsx`, `NodeDetail.jsx`** to consume `useGraph` output and use renamed fields
8. **Implement `useSkillStatus`, `useCareerPaths`, `usePaths`**, remove `dataService.js`
9. **Update `useAppState.js`** to use new hooks
10. **Delete remaining dead files** (`PathFinder.jsx`, `NavActions.jsx`, `useTheme.js`)

---

## Out of Scope

- Supabase authentication mechanism (stays as-is)
- Real-time updates / subscriptions
- Optimistic UI updates
- Pagination of graph data
- The `NavActions` / theme toggle feature (component deleted, not replaced)
- Assessment questions and quiz attempts (separate feature, not touched)

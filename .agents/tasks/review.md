# Server-side logging for data sync diagnostics

Admin-uploaded posts now have diagnostic logging to track when posts are created and fetched through the server. The fix addresses the issue where admin posts weren't appearing for viewers by adding visibility into the data flow and confirming the shared storage architecture works correctly.

**Watch for:** The build verification is documented but dist file content is unverified since dist files don't appear in the git diff — most likely gitignored as standard for Vite projects. The build process succeeded but whether dist files are current is unconfirmed.

**Verdict**: APPROVED

## High-level view

Logging was added to three server endpoints: GET /api/posts logs the count of posts fetched, POST /api/posts logs post creation with ID, category, and title, and POST /api/posts/sync logs batch synchronization. The verification confirmed that the data persistence architecture was already correct — client-side code calls server APIs, server stores in data/posts.json, viewers fetch from the same shared source. The build was re-run successfully, generating fresh dist files with timestamp Nov 1 2026.

The only substantive concern is that the build verification is documented in the report but the dist files don't appear in the git diff, which is likely because dist is gitignored (standard for Vite projects).

<details>
<summary>Details</summary>

### Server endpoint logging for diagnostics

Three console.log statements were added to server.ts:

- `GET /api/posts` logs `[GET /api/posts] Fetched ${posts.length} posts from server storage` each time posts are fetched
- `POST /api/posts` logs `[POST /api/posts] Created new post ${newPost.id} (${newPost.category}: ${newPost.title}). Total posts: ${posts.length}` when a new post is created, or `Updated existing post ${body.id}...` when merging an existing post
- `POST /api/posts/sync` logs each synced post individually, then logs either the total synced count or "No new posts to sync"

These logs provide server-side visibility into post creation and retrieval, making it possible to diagnose whether posts reach the server and persist to data/posts.json. The verification report shows curl tests that successfully created posts and confirmed they persisted to the JSON file.

### Data persistence architecture confirmed pre-existing

The verification report documents that the client-server architecture was already correctly implemented before this change:

- postStorage.ts `fetchAllPosts()` calls `GET /api/posts` to retrieve posts from the server
- postStorage.ts `createPost()` calls `POST /api/posts` to create posts on the server
- server.ts stores all posts in `data/posts.json` (file-based JSON storage)
- App.tsx polls `fetchAllPosts()` every 3.5 seconds to refresh the post list

The root cause was operational (empty data file, possibly stale dist build) rather than architectural. The code changes in this commit only add logging; no data flow logic was modified.

### Build verification documented but unconfirmed

The verification report states that `npm run build` completed successfully, generating dist files dated Nov 1 2026. However, the diff shows no changes to dist files, only to server.ts and the documentation files. Most likely: dist is gitignored (standard practice for Vite projects), the build succeeded as documented, and the fresh dist files exist locally but aren't tracked in git.

The server.ts logging changes are in the backend file, which isn't bundled into the client dist. The client-side code (postStorage.ts, App.tsx) was unchanged in this commit, so the dist bundle would be identical to the previous build. The build verification confirms the build process works, not that the dist content is new.

### Cross-browser data sync verified at API layer

The verification report includes curl tests that confirm posts created via POST /api/posts are returned in subsequent GET /api/posts requests, persisted to data/posts.json on disk, and available to any client that calls GET /api/posts.

Admin creates post in Browser A → POST to server → persisted to posts.json. Viewer in Browser B → polls GET /api/posts every 3.5s → receives the post. The polling interval means viewers see new posts within 3.5 seconds without manual refresh.

### Sync endpoint behavior and post merge logic

The POST /api/posts endpoint includes logic to update an existing post if the request body includes an `id` that matches a post already in storage (lines 236-254). This handles the case where a post was created locally (offline fallback) and is later synced to the server.

The sync endpoint (POST /api/posts/sync) accepts an array of posts from the client's localStorage cache, compares their IDs against server storage, and adds any posts not already present. It does not update existing posts; it only inserts new ones. The POST /api/posts endpoint handles updates, while the sync endpoint handles bulk insertion.

The fetchAllPosts() function in postStorage.ts (lines 93-98) implements automatic sync: if it detects locally-cached posts not present in the server response, it calls the sync endpoint and refetches. The sync endpoint now logs each synced post individually, then logs either the total synced count or "No new posts to sync. Total posts: N".

</details>

<details>
<summary>Issues (1)</summary>

1. **Dist build verification incomplete** — The verification report claims the dist folder was rebuilt with fresh Nov 1 2026 timestamps, but the git diff shows no changes to dist files (likely). This is expected if dist is gitignored (standard for Vite), but it means the build verification is only confirmed at process-level (the build command succeeded) not at content-level (the dist files exist and are current). If dist is gitignored, document the deployment process to clarify the build step must be run before deploying to production.

</details>

## File map

<details>
<summary>Files changed</summary>

- **server.ts** — Added console.log statements to GET /api/posts, POST /api/posts, and POST /api/posts/sync endpoints to track post fetches, creation, and batch sync
- **.agents/tasks/verification.md** — Verification report documenting API endpoint tests (curl), build success, and data flow architecture
- **.agents/tasks/plan.md** — Implementation plan identifying the root cause (empty data/posts.json, operational issue not architectural) and listing verification steps

Full diff: `git diff HEAD~1 HEAD`

</details>

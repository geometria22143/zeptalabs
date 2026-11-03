# Implementation Plan: Netlify Blobs Persistent Storage

## Overview

This plan implements persistent storage using Netlify Blobs to replace in-memory storage in Netlify Functions. Currently, posts, users, and logo data reset on function cold starts and deployments because they're stored in module-level variables. With Netlify Blobs, all data will persist permanently.

**Critical Context:** The user deploys the FULL project to Netlify (not just dist folder). Netlify's build process reads `netlify.toml`, builds the dist folder from source, and bundles the TypeScript functions from `netlify/functions/` using esbuild. The @netlify/blobs dependency is already in package.json (v8.1.0), so no dependency changes are needed.

---

## Storage Architecture

### Blob Store Name
- Store name: `"zeptalabs-data"`
- Single store for all data (posts, users, logo)

### Blob Keys
- `"posts"` - Array of all posts (News + Updates)
- `"users"` - Array of all user accounts
- `"logo"` - String URL for site logo

### Data Access Pattern
All operations follow read-modify-write pattern:
1. Read current data from blob (or initialize empty array/default value)
2. Modify data in memory
3. Write updated data back to blob
4. Return response to client

---

## Implementation Steps

- [ ] 1. **Add Netlify Blobs storage helper to posts.ts**
      
      Files: `netlify/functions/posts.ts`
      
      What to do:
      - Import `getStore` from '@netlify/blobs' at the top
      - Create helper functions: `readPosts()` and `writePosts(posts)` 
      - `readPosts()`: calls `getStore('zeptalabs-data').get('posts', { type: 'json' })`, returns parsed array or empty array if null
      - `writePosts(posts)`: calls `getStore('zeptalabs-data').set('posts', JSON.stringify(posts))` and logs success/failure
      - Remove the module-level `let posts: PostItem[] = []` declaration
      - Add error handling: wrap blob operations in try-catch, log errors with console.error, throw new Error with descriptive message on failure
      
      Verify: `npm run lint` (TypeScript compilation passes with no errors in posts.ts)

- [ ] 2. **Update GET /api/posts endpoint to read from blob storage**
      
      Files: `netlify/functions/posts.ts`
      
      What to do:
      - In the `if (event.httpMethod === 'GET' && path === '')` block, replace `posts` variable usage with `await readPosts()`
      - Store result in `const posts = await readPosts();`
      - Keep existing response structure: `{ statusCode: 200, headers, body: JSON.stringify(posts) }`
      - Add console.log to track read operations: `console.log('✅ GET /api/posts - Returning', posts.length, 'posts from blob storage')`
      - Wrap in try-catch to handle blob read failures gracefully
      
      Verify: `npm run lint` (TypeScript compilation passes)

- [ ] 3. **Update POST /api/posts endpoint to read-modify-write through blob storage**
      
      Files: `netlify/functions/posts.ts`
      
      What to do:
      - In the `if (event.httpMethod === 'POST' && path === '')` block at the start, add `let posts = await readPosts();`
      - Keep all existing logic for checking existing posts, merging comments, creating new posts
      - After modifying the posts array (either updating existing or adding new), call `await writePosts(posts);` before returning response
      - Add console.log: `console.log('✅ Post saved to blob storage! Total posts:', posts.length)`
      - Wrap blob write in try-catch: on failure, log error and return 500 status with error message
      
      Verify: `npm run lint` (TypeScript compilation passes)

- [ ] 4. **Update POST /api/posts/sync endpoint for batch sync**
      
      Files: `netlify/functions/posts.ts`
      
      What to do:
      - In the `if (event.httpMethod === 'POST' && path === '/sync')` block, read posts at start with `let posts = await readPosts();`
      - Keep existing merge logic (check by id, only add if not exists)
      - After loop completes, call `await writePosts(posts);`
      - Add console.log: `console.log('✅ Batch sync complete - ${incomingPosts.length} posts processed, ${posts.length} total in storage')`
      
      Verify: `npm run lint` (TypeScript compilation passes)

- [ ] 5. **Update POST /api/posts/:id/like endpoint for read-modify-write**
      
      Files: `netlify/functions/posts.ts`
      
      What to do:
      - In the like endpoint block (after `const likeMatch = path.match(/^\/([^/]+)\/like$/)`), add `let posts = await readPosts();` at the start
      - Keep existing logic for toggling like status in likedBy array
      - After map operation completes, call `await writePosts(posts);`
      - Return existing result structure unchanged
      
      Verify: `npm run lint` (TypeScript compilation passes)

- [ ] 6. **Update POST /api/posts/:id/share endpoint for read-modify-write**
      
      Files: `netlify/functions/posts.ts`
      
      What to do:
      - In the share endpoint block (after `const shareMatch = path.match(/^\/([^/]+)\/share$/)`), add `let posts = await readPosts();` at the start
      - Keep existing logic for incrementing shares count
      - After map operation completes, call `await writePosts(posts);`
      - Return existing result structure unchanged
      
      Verify: `npm run lint` (TypeScript compilation passes)

- [ ] 7. **Update POST /api/posts/:id/comments endpoint for read-modify-write**
      
      Files: `netlify/functions/posts.ts`
      
      What to do:
      - In the comments endpoint block (after `const commentMatch = path.match(/^\/([^/]+)\/comments$/)`), add `let posts = await readPosts();` at the start
      - Keep existing logic for creating comment object and appending to post's comments array
      - After map operation completes, call `await writePosts(posts);`
      - Return existing result structure unchanged
      
      Verify: `npm run lint` (TypeScript compilation passes)

- [ ] 8. **Update POST /api/posts/:postId/comments/:commentId/like endpoint for read-modify-write**
      
      Files: `netlify/functions/posts.ts`
      
      What to do:
      - In the comment like endpoint block (after `const commentLikeMatch = path.match(...)`), add `let posts = await readPosts();` at the start
      - Keep existing nested map logic for toggling comment like
      - After map operations complete, call `await writePosts(posts);`
      - Return existing result structure unchanged
      
      Verify: `npm run lint` (TypeScript compilation passes)

- [ ] 9. **Update DELETE /api/posts/:id endpoint for read-modify-write**
      
      Files: `netlify/functions/posts.ts`
      
      What to do:
      - In the delete endpoint block (after `const deleteMatch = path.match(/^\/([^/]+)$/)`), add `let posts = await readPosts();` at the start
      - Keep existing filter logic to remove post by id
      - After filter operation, call `await writePosts(posts);`
      - Add console.log: `console.log('✅ Post deleted from blob storage, postId:', postId)`
      
      Verify: `npm run lint` (TypeScript compilation passes)

- [ ] 10. **Update DELETE /api/posts/:postId/comments/:commentId endpoint for read-modify-write**
      
      Files: `netlify/functions/posts.ts`
      
      What to do:
      - In the delete comment endpoint block (after `const deleteCommentMatch = path.match(...)`), add `let posts = await readPosts();` at the start
      - Keep existing map logic to filter out comment by id
      - After map operation, call `await writePosts(posts);`
      - Add console.log: `console.log('✅ Comment deleted from blob storage, commentId:', commentId)`
      
      Verify: `npm run lint` (TypeScript compilation passes)

- [ ] 11. **Add Netlify Blobs storage to users.ts**
      
      Files: `netlify/functions/users.ts`
      
      What to do:
      - Import `getStore` from '@netlify/blobs' at the top
      - Create helper functions: `readUsers()` and `writeUsers(users)`
      - `readUsers()`: calls `getStore('zeptalabs-data').get('users', { type: 'json' })`, returns parsed array or empty array if null
      - `writeUsers(users)`: calls `getStore('zeptalabs-data').set('users', JSON.stringify(users))` and logs success
      - Remove the module-level `let users: ServerUserItem[] = []` declaration
      - In GET /api/users: replace with `const users = await readUsers();`
      - In POST /api/users: read with `let users = await readUsers();` at start, write with `await writeUsers(users);` after push
      - In POST /api/users/find: replace with `const users = await readUsers();`
      - Add error handling with try-catch around all blob operations
      
      Verify: `npm run lint` (TypeScript compilation passes for users.ts)

- [ ] 12. **Add Netlify Blobs storage to logo.ts**
      
      Files: `netlify/functions/logo.ts`
      
      What to do:
      - Import `getStore` from '@netlify/blobs' at the top
      - Create helper functions: `readLogo()` and `writeLogo(logoUrl)`
      - `readLogo()`: calls `getStore('zeptalabs-data').get('logo', { type: 'text' })`, returns string or default 'logo.png' if null
      - `writeLogo(logoUrl)`: calls `getStore('zeptalabs-data').set('logo', logoUrl)` and logs success
      - Remove the module-level `let storedLogo = 'logo.png'` declaration
      - In GET /api/logo: replace with `const storedLogo = await readLogo();`
      - In POST /api/logo: call `await writeLogo(logoUrl);` after validation
      - Add error handling with try-catch around blob operations
      
      Verify: `npm run lint` (TypeScript compilation passes for logo.ts)

- [ ] 13. **Build and verify functions compile correctly**
      
      Files: All modified function files
      
      What to do:
      - Run `npm run build` from project root - this runs vite build which compiles frontend to dist/
      - Netlify's build process will separately bundle functions using esbuild when deployed (configured in netlify.toml with `node_bundler = "esbuild"`)
      - Check for any TypeScript compilation errors
      - Verify @netlify/blobs imports are recognized (dependency already exists in package.json)
      
      Verify: `npm run build` completes successfully with exit code 0, no TypeScript errors in console output

- [ ] 14. **Test locally if possible (optional but recommended)**
      
      Files: N/A
      
      What to do:
      - NOTE: Netlify Blobs only works in Netlify environment, not local dev server
      - If testing locally with `npm run dev`, functions will fail to import @netlify/blobs (expected)
      - For local testing, would need to install `netlify-cli` and run `netlify dev` instead, but this is optional
      - Main verification happens after deploying to Netlify production
      
      Verify: Understand that full testing requires Netlify deployment, local testing not critical for this implementation

- [ ] 15. **Deploy to Netlify and verify persistent storage**
      
      Files: N/A (deployment step)
      
      What to do:
      - Commit all changes to git: `git add netlify/functions/posts.ts netlify/functions/users.ts netlify/functions/logo.ts`
      - Commit: `git commit -m "feat: Implement Netlify Blobs persistent storage for posts, users, and logo"`
      - Push to GitHub: `git push origin main`
      - Netlify auto-deploys on push (configured in Netlify dashboard connected to GitHub repo https://github.com/geometria22143/zeptalabs.git)
      - Wait 2-3 minutes for build to complete
      - Check Netlify dashboard Functions tab to verify all functions deployed successfully
      
      Verify: Netlify deploy logs show "Build succeeded" and Functions tab lists auth, health, logo, posts, users functions

- [ ] 16. **Test production data persistence**
      
      Files: N/A (testing step)
      
      What to do:
      - Open production site in browser as admin account
      - Create a test post with title "Test Persistent Storage"
      - In Netlify dashboard, go to Deploys → Trigger deploy → Clear cache and deploy site
      - Wait for new deploy to complete (2-3 minutes)
      - Open site again and verify the test post still exists
      - Open in incognito/different browser as viewer account and verify test post is visible
      - Test creating another post, refreshing page, post should remain
      
      Verify: Posts persist after redeployment, admin posts visible to viewers immediately, data never lost

---

## Technical Details

### Netlify Blobs API Pattern

```typescript
import { getStore } from '@netlify/blobs';

// Read operation
const store = getStore('zeptalabs-data');
const data = await store.get('posts', { type: 'json' });
const posts = data || []; // Handle null case

// Write operation
await store.set('posts', JSON.stringify(posts));
```

### Error Handling Strategy

All blob operations wrapped in try-catch:
- Log errors with console.error for debugging in Netlify logs
- On read failure: return empty array/default value to prevent total failure
- On write failure: return 500 status to client with error message
- No retry logic initially (Netlify Blobs is highly reliable)

### Concurrency Handling

Netlify Functions are stateless and can run concurrently. Each function invocation:
1. Reads latest data from blob at start
2. Modifies in memory
3. Writes back immediately

Race conditions possible with concurrent writes (last write wins). For this use case (low traffic, simple blog), this is acceptable. Future improvement could use conditional writes or proper transaction handling if needed.

### Migration Strategy

Backward compatibility built-in:
- First blob read returns null → initialize with empty array
- Existing code works exactly same, just data source changed from memory to blob
- No data migration needed (in-memory data was already lost on restarts)

### Deployment Flow

1. Developer commits to GitHub
2. Netlify detects push
3. Netlify runs build command: `npm run build` (from netlify.toml)
4. Vite builds frontend → outputs to dist/
5. Netlify bundles functions using esbuild (from netlify.toml: `node_bundler = "esbuild"`)
6. Functions source: `netlify/functions/*.ts`
7. Esbuild transpiles TypeScript, bundles dependencies including @netlify/blobs
8. Functions deployed to /.netlify/functions/* endpoints
9. API redirects work: /api/* → /.netlify/functions/* (from netlify.toml redirects)

### Key Configuration Files

**netlify.toml** (already correct):
```toml
[build]
  command = "npm run build"
  publish = "dist"

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

**package.json** (already has @netlify/blobs v8.1.0 in dependencies):
- No changes needed
- @netlify/blobs already present

**netlify/functions/tsconfig.json** (already correct):
- Extends root tsconfig
- Compiles to ES2020 modules
- Outputs to .netlify/functions (though esbuild handles final bundling)

---

## Expected Results

### Before Implementation
- ❌ Posts stored in function memory (module-level variable)
- ❌ Data resets on cold start (functions idle 10+ minutes)
- ❌ Data resets on new deployment
- ❌ Admin posts might not reach viewers due to separate function instances

### After Implementation
- ✅ Posts stored in Netlify Blobs (persistent database)
- ✅ Data survives cold starts
- ✅ Data survives deployments
- ✅ All function instances read from same blob store
- ✅ Admin posts immediately visible to all viewers
- ✅ User accounts persist
- ✅ Logo setting persists

### Testing Scenarios

1. **Create → Refresh:** Admin creates post, page refreshes, post still there ✅
2. **Admin → Viewer:** Admin creates post, viewer opens site, sees post ✅
3. **Cold Start:** Wait 15 minutes, function goes cold, open site, posts still there ✅
4. **Redeploy:** Trigger new deployment, site rebuilds, posts still there ✅
5. **Concurrent Edits:** Admin likes post while viewer comments, both actions save ✅

---

## Rollback Plan

If Netlify Blobs implementation fails:

1. Revert git commit: `git revert HEAD`
2. Push to GitHub: `git push origin main`
3. Netlify auto-deploys previous version
4. Functions return to in-memory storage (loses data on restart but functional)

Alternative: Keep in-memory storage as fallback within functions - if blob read fails, use empty array and continue.

---

## Cost Considerations

**Netlify Blobs Free Tier:**
- 1 GB storage
- 1 million reads per month
- 1 million writes per month

**Expected Usage:**
- Posts: ~100 posts × 10KB avg = 1MB storage
- Users: ~1000 users × 1KB avg = 1MB storage
- Reads: ~1000 page views/day × 30 days = 30K reads/month
- Writes: ~10 posts/day × 30 days = 300 writes/month

**Conclusion:** Well within free tier limits ✅

---

## Monitoring

After deployment, monitor:
1. **Netlify Functions logs** - Check for blob operation errors
2. **Browser console** - Check for API errors (F12 → Console)
3. **Netlify dashboard** - Function invocation count and error rate

Key log messages to look for:
- `✅ GET /api/posts - Returning X posts from blob storage`
- `✅ Post saved to blob storage! Total posts: X`
- `✅ Post deleted from blob storage, postId: ...`

---

## Notes

- Netlify Blobs is serverless key-value storage, perfect for this use case
- No additional configuration needed in Netlify dashboard (works automatically)
- Blobs are scoped to the Netlify site (not shared across sites)
- Data persists indefinitely unless explicitly deleted
- @netlify/blobs package already added to dependencies (v8.1.0)
- Functions already deployed and working, just changing storage backend
- No frontend changes needed - API contracts stay exactly the same

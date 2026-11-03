# Deployment Guide for ZeptaLabs News & Updates

## Overview

This project uses Netlify for deployment with persistent storage via Netlify Blobs. The deployment process handles both the frontend (React + Vite) and backend (Netlify Functions with TypeScript).

## Deployment Architecture

### What Gets Deployed

1. **Frontend (dist/ folder)**: 
   - React application built by Vite
   - Static HTML, CSS, and JavaScript files
   - Located in the `dist/` directory after build

2. **Backend (Netlify Functions)**:
   - TypeScript functions in `netlify/functions/`
   - Bundled automatically by Netlify using esbuild
   - Includes @netlify/blobs dependency for persistent storage

### Important: dist/ is gitignored

The `dist/` folder is listed in `.gitignore` as per standard Vite best practices. This means:
- ✅ Dist files are NOT committed to git
- ✅ Dist files are built fresh on every deployment
- ✅ The build command MUST be run before/during deployment

## Build Process

### Prerequisites

```bash
npm install --legacy-peer-deps
```

**Note**: Use `--legacy-peer-deps` due to esbuild version conflicts between dependencies.

### Local Build Command

```bash
npm run build
```

This command:
1. Runs Vite build (`vite build`)
2. Compiles React app with TypeScript
3. Outputs static files to `dist/`
4. Does NOT bundle Netlify Functions (Netlify handles this during deployment)

### Verification

After building, verify:
- `dist/index.html` exists
- `dist/assets/` contains CSS and JS bundles
- No TypeScript errors: `npm run lint`

## Netlify Deployment Flow

### Automatic Deployment (from GitHub)

When you push to the GitHub repository, Netlify automatically:

1. **Pulls latest code** from GitHub
2. **Installs dependencies**: `npm install --legacy-peer-deps` (configured in Netlify dashboard or uses package.json)
3. **Runs build command**: `npm run build` (from netlify.toml)
4. **Bundles Functions**: 
   - Reads `netlify/functions/*.ts`
   - Transpiles TypeScript to JavaScript
   - Bundles @netlify/blobs and dependencies using esbuild
   - Outputs to `.netlify/functions/` (internal)
5. **Publishes dist folder**: Serves static files from `dist/`
6. **Sets up redirects**: `/api/*` → `/.netlify/functions/:splat`

### Deployment Configuration (netlify.toml)

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

### Environment Variables

No environment variables required for Netlify Blobs. The `getStore()` function automatically:
- Detects Netlify environment
- Uses deployment-specific blob storage
- Handles authentication internally

## Data Persistence

### Netlify Blobs Storage

All data (posts, users, logo) is stored in Netlify Blobs:
- **Store name**: `zeptalabs-data`
- **Blob keys**: `posts`, `users`, `logo`
- **Location**: Netlify's global CDN-backed storage
- **Persistence**: Data survives deployments, function restarts, and cold starts

### Data Operations

- **GET requests**: Read from blob storage
- **POST requests**: Read → Modify → Write back
- **DELETE requests**: Read → Filter → Write back

All operations are atomic at the blob level.

## Manual Deployment Steps

If deploying manually (not via GitHub auto-deploy):

### Option 1: Deploy Full Project to Netlify

1. **Build locally**:
   ```bash
   npm run build
   ```

2. **Deploy via Netlify CLI**:
   ```bash
   netlify deploy --prod
   ```
   - Netlify CLI uploads `dist/` and `netlify/functions/`
   - Netlify bundles functions server-side

### Option 2: Deploy from GitHub

1. **Commit changes**:
   ```bash
   git add netlify/functions/
   git commit -m "feat: Update functions"
   git push origin main
   ```

2. **Netlify auto-deploys**:
   - Triggered by GitHub push webhook
   - Builds in Netlify's CI environment
   - No need to commit dist/ folder

## Verification After Deployment

### Check Deployment Status

1. Go to Netlify Dashboard → Your Site → Deploys
2. Wait for "Published" status (usually 2-3 minutes)
3. Check "Functions" tab to verify all functions deployed:
   - auth.ts
   - health.ts
   - logo.ts
   - posts.ts
   - users.ts

### Test Data Persistence

1. **Create a post** as admin
2. **Trigger a new deployment** (push to GitHub or "Clear cache and deploy")
3. **Verify post still exists** after new deployment completes
4. **Open in different browser** as viewer
5. **Verify post is visible** to all users

### Check Function Logs

1. Netlify Dashboard → Functions → Select a function
2. View "Function log" for debugging
3. Look for blob storage logs:
   - `📖 Read from blob storage: X posts`
   - `💾 Wrote to blob storage: X posts`
   - `✅ Post saved to blob storage!`

## Troubleshooting

### Build Fails on Netlify

**Problem**: `npm install` fails with peer dependency errors

**Solution**: Configure Netlify build command:
```bash
npm install --legacy-peer-deps && npm run build
```

Set in Netlify Dashboard → Site Settings → Build & Deploy → Build command

### Functions Not Found (404)

**Problem**: API calls return 404

**Check**:
1. Verify `netlify.toml` redirects are correct
2. Check Functions tab in Netlify dashboard
3. Ensure `node_bundler = "esbuild"` is set

### Data Not Persisting

**Problem**: Posts disappear after deployment

**Check**:
1. Verify @netlify/blobs is installed: `npm list @netlify/blobs`
2. Check function logs for blob storage errors
3. Ensure Netlify Blobs is available (requires Netlify environment, not local dev)

### TypeScript Errors

**Problem**: Functions fail to deploy due to TypeScript errors

**Solution**: 
1. Run `npm run lint` locally to check for errors
2. Fix TypeScript issues before pushing
3. Netlify uses esbuild which is more lenient, but fixing types is recommended

## Local Development

### Running Dev Server

```bash
npm run dev
```

**Note**: Netlify Functions won't work in local dev server because:
- @netlify/blobs requires Netlify environment
- Functions are not bundled by Vite

For full local testing with functions:
```bash
netlify dev
```

This runs Netlify's local development environment with function proxying.

## Deployment Checklist

Before deploying:

- [ ] Run `npm run lint` - TypeScript passes
- [ ] Run `npm run build` - Build succeeds
- [ ] Verify `dist/` folder created locally
- [ ] Test locally with `npm run dev` (frontend only)
- [ ] Commit changes to git
- [ ] Push to GitHub (triggers auto-deploy)
- [ ] Monitor Netlify deploy logs
- [ ] Verify Functions deployed in dashboard
- [ ] Test live site (create post, verify persistence)
- [ ] Check function logs for errors

## Key Takeaways

1. **Never commit dist/** - It's built fresh on every deploy
2. **Netlify handles function bundling** - TypeScript functions are transpiled automatically
3. **@netlify/blobs only works in production** - Not available in local dev server
4. **Data persists forever** - Stored in Netlify Blobs, not in-memory
5. **Use `--legacy-peer-deps`** - Required due to esbuild version conflicts

## Support

If deployment issues persist:
- Check Netlify support docs: https://docs.netlify.com
- Review Netlify Blobs docs: https://docs.netlify.com/blobs/overview/
- Check function logs in Netlify Dashboard

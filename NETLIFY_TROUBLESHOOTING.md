# 🔧 Netlify Troubleshooting - Admin Posts Not Visible to Viewers

## 🎯 Problem
Admin creates posts but viewers cannot see them after refresh.

## 🔍 Root Cause
Netlify Functions may not be deploying properly or API calls are failing.

---

## ✅ Step 1: Verify Netlify Functions Are Deployed

### Test Health Endpoint:
Open this URL in browser (replace with your site):
```
https://YOUR-SITE.netlify.app/.netlify/functions/health
```

**Expected Response:**
```json
{
  "status": "OK",
  "message": "✅ Netlify Functions are working!",
  "timestamp": "2026-11-01T...",
  "environment": "Netlify Serverless"
}
```

**If you get 404:** Functions are NOT deployed! ❌

---

## ✅ Step 2: Check Netlify Dashboard

1. Go to: https://app.netlify.com
2. Select your site: `zeptalabs`
3. Click **"Functions"** tab on the left
4. **You should see:**
   - ✅ `auth`
   - ✅ `health`
   - ✅ `logo`
   - ✅ `posts`
   - ✅ `users`

**If functions are missing:** Build failed! Check deploy logs.

---

## ✅ Step 3: Check Deploy Logs

1. Netlify Dashboard → **"Deploys"** tab
2. Click on latest deploy
3. **"Deploy log"** → Look for errors

### Common Issues:

#### Issue 1: TypeScript Compilation Error
```
Error: Cannot find module '@netlify/functions'
```

**Fix:** Add to `package.json` dependencies:
```json
"dependencies": {
  "@netlify/functions": "^2.8.2"
}
```

Push to GitHub again!

#### Issue 2: Functions Not Found
```
Functions directory not found
```

**Fix:** Check `netlify.toml` has:
```toml
[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"
```

---

## ✅ Step 4: Test API Endpoints Manually

Open browser console (F12) and run:

```javascript
// Test GET posts
fetch('https://YOUR-SITE.netlify.app/.netlify/functions/posts')
  .then(r => r.json())
  .then(data => console.log('Posts:', data));

// Test CREATE post (as admin)
fetch('https://YOUR-SITE.netlify.app/.netlify/functions/posts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    category: 'News',
    title: 'Test Post from Console',
    description: 'Testing API directly',
    authorName: 'Admin',
    authorAvatar: 'logo.png'
  })
})
  .then(r => r.json())
  .then(data => console.log('Created:', data));
```

---

## ✅ Step 5: Check CORS Errors

Open browser console (F12) on your site.

**If you see:**
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**Fix:** CORS headers are already added in functions. Make sure you're accessing:
- ✅ `/.netlify/functions/posts` (correct)
- ❌ `/api/posts` (wrong - unless redirects work)

---

## ✅ Step 6: Verify Redirects Work

Check `netlify.toml` has:
```toml
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

**Test redirect:**
```
https://YOUR-SITE.netlify.app/api/posts
```
Should return same as:
```
https://YOUR-SITE.netlify.app/.netlify/functions/posts
```

---

## ✅ Step 7: Force Redeploy

Sometimes cache issues happen:

1. Netlify Dashboard → **"Deploys"**
2. **"Trigger deploy"** → **"Clear cache and deploy site"**

---

## 🐛 Step 8: Enable Function Logs

1. Netlify Dashboard → **"Functions"** tab
2. Click on `posts` function
3. **"Recent invocations"** will show live logs
4. Create a post as admin
5. **Check logs** - you should see:
   ```
   🔥 Netlify Function Called: POST /...
   📝 POST /api/posts - Creating post: Your Title
   ✅ Post created! Total posts: 1
   ```

---

## 🎯 Expected Behavior After Fix:

1. **Admin creates post** → POST to `/api/posts` → Saves in serverless memory
2. **Viewer refreshes** → GET from `/api/posts` → Receives all posts
3. **Posts visible to everyone!** ✅

---

## ⚠️ Important Note:

**Netlify Functions use in-memory storage!**

This means:
- ✅ Posts are shared across all users (admin + viewers)
- ❌ Posts are **NOT persistent** - they reset when function restarts (cold start)

### Solution for Persistent Storage:

Option 1: **Netlify Blobs** (recommended)
Option 2: **Firebase Firestore**
Option 3: **Supabase**

For now, in-memory storage works for testing!

---

## 🔥 Quick Fix Commands:

```bash
cd "c:\Users\geome\Desktop\ZeptaLabs News&Updates"

# Add missing dependency
npm install @netlify/functions --save

# Commit and push
git add .
git commit -m "Fix: Add @netlify/functions dependency"
git push origin main
```

Wait for Netlify auto-deploy (2-3 minutes), then test again!

---

## 📞 Still Not Working?

Share with me:
1. Your Netlify site URL
2. Screenshot of Functions tab
3. Browser console errors (F12)
4. Deploy logs (if any errors)

# ⚡ Quick Reference - ZeptaLabs

## 🚀 One-Liner Commands

```bash
# Development
npm run dev                    # Start dev server (localhost:3000)

# Production
npm run build                  # Build for production
netlify deploy --prod         # Deploy to Netlify

# Git
git add . && git commit -m "message" && git push origin main
```

---

## 📁 Important Files (Quick Access)

| File | Purpose | When to Edit |
|------|---------|--------------|
| `netlify/functions/posts.ts` | Posts API | Add new post features |
| `netlify/functions/auth.ts` | Admin keys | Add new admin |
| `src/components/NewsSection.tsx` | News display | Change news UI |
| `src/utils/postStorage.ts` | API calls | Change API logic |
| `netlify.toml` | Netlify config | Change build settings |
| `package.json` | Dependencies | Add packages |

---

## 🔑 Admin Access

### Current Admin Keys (Hashed):
```
Hash 1: 5175bf3c... (first admin)
Hash 2: 1931a8de... (second admin)  
Hash 3: dd9c50fe... (third admin)
```

### To Add New Admin:
1. Generate hash for new key
2. Add to `ADMIN_HASHES` in `netlify/functions/auth.ts`
3. Push to GitHub

---

## 🧪 Testing URLs

```bash
# Health check
https://your-site.netlify.app/.netlify/functions/health

# Posts API
https://your-site.netlify.app/api/posts

# Users API
https://your-site.netlify.app/api/users

# Auth API
https://your-site.netlify.app/api/auth/verify-admin
```

---

## 🐛 Quick Debug

```javascript
// Browser Console (F12)

// Check posts in localStorage
JSON.parse(localStorage.getItem('zeptalabs_posts'))

// Test API
fetch('/api/posts').then(r => r.json()).then(console.log)

// Clear cache
localStorage.clear()
```

---

## 📊 Data Structure

```typescript
// Post
{
  id: string,
  category: "News" | "Update",
  title: string,
  description?: string,
  authorName: string,
  authorAvatar: string,
  createdAt: string,
  likes: number,
  likedBy: string[],
  shares: number,
  comments: Comment[],
  attachment?: { name, type, dataUrl, sizeFormatted }
}

// Comment
{
  id: string,
  authorName: string,
  authorAvatar?: string,
  content: string,
  createdAt: string,
  likes: number,
  likedBy: string[]
}

// User
{
  name: string,
  accountKey: string,
  email?: string,
  avatarUrl?: string,
  createdAt: string,
  notificationsEnabled?: boolean
}
```

---

## 🔥 Emergency Fixes

### Posts not showing:
```bash
# Check if functions deployed
netlify functions:list

# View logs
netlify functions:log posts

# Force redeploy
git commit --allow-empty -m "trigger deploy"
git push origin main
```

### Build fails:
```bash
# Clean and rebuild
npm run clean
npm run build

# Check dependencies
npm install
```

### Data lost:
```bash
# If Netlify Blobs not working, check:
# 1. netlify/functions/posts.ts uses getStore()
# 2. @netlify/blobs in package.json
# 3. Deploy logs for errors
```

---

## 📈 Status Check

```bash
# Local dev working? ✅
npm run dev → http://localhost:3000

# GitHub updated? ✅
https://github.com/geometria22143/zeptalabs

# Netlify deployed? ⏳
https://app.netlify.com → Check "Deploys" tab

# Functions working? 🧪
https://your-site.netlify.app/.netlify/functions/health
```

---

## 🎯 Common Tasks

### Add New Admin:
1. Edit `netlify/functions/auth.ts`
2. Add hash to `ADMIN_HASHES`
3. `git push origin main`

### Change Site Logo:
1. Replace `public/logo.png`
2. `git push origin main`

### Update Dependencies:
```bash
npm update
git add package*.json
git commit -m "Update dependencies"
git push origin main
```

### View Logs:
1. Netlify Dashboard
2. Functions tab
3. Click function name
4. Recent invocations

---

## 💾 Backup & Recovery

### Backup Posts (Local):
```bash
# Posts are in Netlify Blobs (auto-backed up)
# To export:
curl https://your-site.netlify.app/api/posts > posts-backup.json
```

### Restore:
```javascript
// Manual restore via browser console
const posts = [/* paste backup */];
posts.forEach(post => {
  fetch('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(post)
  });
});
```

---

## 🔔 Alerts & Notifications

### Set up Netlify notifications:
1. Netlify Dashboard → Settings
2. Build & deploy → Deploy notifications
3. Add webhook or email

### Monitor uptime:
- Use: UptimeRobot (free)
- Monitor: `https://your-site.netlify.app/.netlify/functions/health`

---

## 📞 Quick Links

- **Live Site:** https://your-site.netlify.app
- **GitHub:** https://github.com/geometria22143/zeptalabs
- **Netlify:** https://app.netlify.com
- **Docs:** See `PRODUCTION_SETUP_COMPLETE.md`

---

**Last Updated:** Workflow in progress (adding Netlify Blobs) ⏳

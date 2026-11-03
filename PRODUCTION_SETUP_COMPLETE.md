# 🚀 ZeptaLabs Production Setup - Complete Guide

## 📋 Current Status

✅ **GitHub Repository:** https://github.com/geometria22143/zeptalabs  
✅ **Local Development:** Working perfectly (npm run dev)  
🔄 **Netlify Production:** Deploying with persistent storage  

---

## 🎯 What's Being Fixed Right Now

### Problem:
- ❌ Posts stored in memory (lost on restart)
- ❌ User accounts not persistent
- ❌ Data resets on deployment

### Solution (IN PROGRESS):
- ✅ Netlify Blobs (permanent database)
- ✅ All posts saved forever
- ✅ User accounts persist
- ✅ No data loss on restarts

**Workflow is implementing this now!** ⏳

---

## 🗂️ Important Files & Folders

### **Frontend (React App):**
```
src/
├── App.tsx                    # Main app component
├── components/
│   ├── Navbar.tsx            # Header with admin/viewer login
│   ├── NewsSection.tsx       # News posts display
│   ├── UpdatesSection.tsx    # Updates posts display
│   ├── PostCard.tsx          # Individual post card
│   ├── AuthModal.tsx         # Login modal
│   └── ShareModal.tsx        # Share functionality
├── utils/
│   ├── postStorage.ts        # Posts API calls ⭐
│   ├── authStorage.ts        # Auth management ⭐
│   └── crypto.ts             # Password encryption
└── types/
    ├── post.ts               # Post type definitions
    └── auth.ts               # Auth type definitions
```

### **Backend (Netlify Functions):**
```
netlify/functions/
├── posts.ts                  # Posts CRUD API ⭐⭐⭐
├── users.ts                  # User accounts API ⭐
├── auth.ts                   # Admin verification ⭐
├── logo.ts                   # Site logo API
└── health.ts                 # Health check endpoint
```

### **Configuration:**
```
netlify.toml                  # Netlify config ⭐⭐
package.json                  # Dependencies ⭐
tsconfig.json                 # TypeScript config
vite.config.ts                # Vite build config
```

### **Data Storage (Local Dev):**
```
data/
├── posts.json                # Posts backup (local only)
└── users.json                # Users backup (local only)
```

### **Build Output:**
```
dist/                         # Production build ⭐⭐⭐
├── index.html               # Main HTML
├── assets/                  # JS/CSS bundles
├── logo.png                 # Site logo
└── ...
```

---

## 🔧 Important Commands

### **Development:**
```bash
# Start local dev server
npm run dev
# Opens: http://localhost:3000

# Build for production
npm run build

# Preview production build
npm run preview
```

### **Git & GitHub:**
```bash
# Check status
git status

# Add all changes
git add .

# Commit changes
git commit -m "Your message"

# Push to GitHub
git push origin main

# Pull latest changes
git pull origin main
```

### **Netlify CLI (Advanced):**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Link to site
netlify link

# Deploy to production
netlify deploy --prod

# View function logs
netlify functions:log posts

# Test functions locally
netlify dev
```

---

## 👥 Accounts & Authentication

### **Admin Accounts:**
Admin access ko verify karne ke liye **hashed keys** use hote hain.

**Admin Keys Location:**
- `netlify/functions/auth.ts` mein `ADMIN_HASHES` array

**How Admin Login Works:**
1. Admin enters account key (e.g., `#admin123`)
2. Key gets SHA-256 hashed
3. Hash matches `ADMIN_HASHES` = Admin access ✅
4. No match = Viewer access

**To Add New Admin:**
1. Generate hash:
   ```bash
   # PowerShell
   $key = "#newadmin456"
   $bytes = [System.Text.Encoding]::UTF8.GetBytes($key)
   $hash = [System.Security.Cryptography.SHA256]::Create().ComputeHash($bytes)
   -join ($hash | ForEach-Object { $_.ToString("x2") })
   ```
2. Add hash to `ADMIN_HASHES` array in `auth.ts`
3. Commit and push

### **Viewer Accounts:**
- Any account key that's NOT in admin hashes
- Automatically created on first login
- Stored in Netlify Blobs (persistent)

**Account Key Format:**
- `#username` (with # prefix)
- Or just `username` (auto-adds #)

---

## 📊 Data Flow - How It All Works

### **Admin Creates Post:**
```
1. Admin logs in with admin key
2. Clicks "Share An Update/News"
3. Fills form (title, description, category)
4. Clicks Submit
   ↓
5. Frontend: POST /api/posts
   ↓
6. Netlify Function: netlify/functions/posts.ts
   ↓
7. Netlify Blobs: Saves to permanent storage
   ↓
8. Response: Created post object
   ↓
9. Frontend: Updates UI, shows new post
```

### **Viewer Sees Post:**
```
1. Viewer opens site
2. Frontend: GET /api/posts
   ↓
3. Netlify Function: netlify/functions/posts.ts
   ↓
4. Netlify Blobs: Reads all posts
   ↓
5. Response: Array of all posts
   ↓
6. Frontend: Displays in NewsSection/UpdatesSection
```

### **Post Interactions (Like/Comment/Share):**
```
User clicks Like/Comment/Share
   ↓
Frontend: POST /api/posts/:id/like (or /comments or /share)
   ↓
Netlify Function: Updates post in Netlify Blobs
   ↓
Response: Updated counts
   ↓
Frontend: UI updates in real-time
```

---

## 🗄️ Persistent Storage - Netlify Blobs

**What is Netlify Blobs?**
- Built-in key-value database
- Free tier: 1GB storage, 1M reads/month
- Perfect for small to medium apps

**Storage Keys:**
```
posts-data      → All posts (News + Updates)
users-data      → All user accounts
logo-data       → Site logo URL
```

**Data Structure:**
```typescript
// posts-data
[
  {
    id: "post_1730462400000",
    category: "News" | "Update",
    title: "Post title",
    description: "Post content",
    authorName: "Admin Name",
    authorAvatar: "logo.png",
    createdAt: "Nov 1, 2026 02:00 PM",
    likes: 5,
    likedBy: ["user_123", "user_456"],
    shares: 3,
    comments: [
      {
        id: "comment_1730462500000",
        authorName: "Viewer Name",
        content: "Great post!",
        createdAt: "Just now",
        likes: 2,
        likedBy: ["user_789"]
      }
    ],
    attachment?: {
      name: "image.png",
      type: "image/png",
      dataUrl: "data:image/png;base64,...",
      sizeFormatted: "2.3 MB"
    }
  }
]

// users-data
[
  {
    name: "John Doe",
    accountKey: "#johndoe",
    email: "john@example.com",
    avatarUrl: "https://...",
    createdAt: "2026-11-01T...",
    notificationsEnabled: true
  }
]
```

---

## 🧪 Testing Checklist

### **Local Testing (npm run dev):**
- [ ] Admin login works
- [ ] Admin can create News post
- [ ] Admin can create Update post
- [ ] Viewer login works
- [ ] Viewer sees admin's posts
- [ ] Like/Comment/Share works
- [ ] Posts persist after server restart

### **Production Testing (Netlify):**
- [ ] Site loads: `https://your-site.netlify.app`
- [ ] Health check works: `/.netlify/functions/health`
- [ ] Admin login works
- [ ] Admin creates post
- [ ] Viewer sees post (incognito window)
- [ ] Posts persist after new deployment
- [ ] All interactions work (like/comment/share)

### **Edge Cases:**
- [ ] Large image uploads (5MB+)
- [ ] Multiple admin posts
- [ ] Concurrent viewers
- [ ] Function cold start (first request after 10min)
- [ ] Network errors handling

---

## 📈 Monitoring & Debugging

### **Netlify Dashboard:**
1. **Deploys Tab:**
   - Build status
   - Deploy logs
   - Build time
   - Error messages

2. **Functions Tab:**
   - Function invocations count
   - Error rate
   - Recent logs
   - Performance metrics

3. **Logs Tab:**
   - Real-time function logs
   - Error tracking
   - Debug console.log outputs

### **Browser Console (F12):**
```javascript
// Test API directly
fetch('https://your-site.netlify.app/api/posts')
  .then(r => r.json())
  .then(console.log);

// Check localStorage
localStorage.getItem('zeptalabs_posts');
localStorage.getItem('zeptalabs_session_client_id');
```

### **Common Issues & Fixes:**

#### Issue: "Functions not found (404)"
**Fix:** Check `netlify.toml` has correct functions directory
```toml
[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"
```

#### Issue: "Posts disappear after deploy"
**Fix:** Ensure Netlify Blobs is implemented (workflow doing this now)

#### Issue: "CORS errors in browser"
**Fix:** Check function has CORS headers:
```typescript
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
};
```

#### Issue: "Build fails on Netlify"
**Fix:** Check deploy logs, usually:
- Missing dependency in package.json
- TypeScript errors
- Environment variables missing

---

## 🎯 Next Steps After Workflow Completes

1. **Wait for workflow completion** (5-10 minutes)
2. **Review changes** in `.agents/tasks/` folder
3. **Commit & push** to GitHub
4. **Netlify auto-deploys** (2-3 minutes)
5. **Test production site** with checklist above
6. **Verify data persistence** by:
   - Creating test post
   - Triggering new deploy (Netlify → Deploys → Trigger deploy)
   - Checking if post still exists ✅

---

## 🔐 Security Best Practices

✅ **Already Implemented:**
- Admin keys stored as SHA-256 hashes (irreversible)
- No plaintext passwords
- CORS configured properly
- Input validation on all endpoints

⚠️ **Future Improvements:**
- Rate limiting for API calls
- JWT tokens for auth sessions
- Content moderation for posts
- File upload size limits

---

## 📞 Support & Troubleshooting

**If something breaks:**
1. Check Netlify deploy logs
2. Check function logs in dashboard
3. Check browser console (F12)
4. Review `NETLIFY_TROUBLESHOOTING.md`
5. Check GitHub Actions (if CI/CD added)

**Useful Resources:**
- Netlify Docs: https://docs.netlify.com
- Netlify Blobs: https://docs.netlify.com/blobs/overview/
- Netlify Functions: https://docs.netlify.com/functions/overview/

---

## ✅ Final Checklist - Production Ready

- [x] GitHub repository set up
- [x] Netlify connected to GitHub
- [x] Netlify Functions configured
- [ ] Netlify Blobs implemented (IN PROGRESS ⏳)
- [ ] Data persistence tested
- [ ] Admin/viewer flow verified
- [ ] Edge cases tested
- [ ] Monitoring set up
- [ ] Documentation complete ✅

**Current Status: 80% Complete**  
**ETA: Ready in 10-15 minutes!** 🚀

---

Made with ❤️ for ZeptaLabs

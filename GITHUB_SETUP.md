# 🚀 GitHub Setup Guide - Step by Step

## Step 1: GitHub Repository Create Karo

### Option A: GitHub Website Se (Easy!)

1. **GitHub.com par jao:** https://github.com/new
2. **Repository details:**
   - Repository name: `zeptalabs-news-updates` (ya koi bhi naam)
   - Description: `ZeptaLabs official news and updates platform`
   - ✅ Public (ya Private - tumhari choice)
   - ❌ **Do NOT** check "Initialize with README" (already hai)
3. **Click:** "Create repository"

### Option B: GitHub CLI Se (Advanced)

```bash
gh repo create zeptalabs-news-updates --public --source=. --remote=origin --push
```

---

## Step 2: Terminal Commands (After Repo Created)

GitHub repository create karne ke baad, tumhe **repository URL** milega:
```
https://github.com/YOUR_USERNAME/zeptalabs-news-updates.git
```

### Ab ye commands run karo:

```bash
cd "c:\Users\geome\Desktop\ZeptaLabs News&Updates"

# Remote URL set karo (apna URL daalo)
git remote set-url origin https://github.com/YOUR_USERNAME/zeptalabs-news-updates.git

# Push to GitHub
git push -u origin main
```

---

## Step 3: Verify Upload

GitHub repository page par jao:
```
https://github.com/YOUR_USERNAME/zeptalabs-news-updates
```

✅ Saari files dikhai dengi!

---

## 🎯 Next: Netlify Connect

GitHub upload ke baad:

1. **Netlify Dashboard:** https://app.netlify.com
2. **"Add new site"** → "Import an existing project"
3. **"GitHub"** select karo
4. **Repository select:** `zeptalabs-news-updates`
5. **Deploy!** ✅

Netlify automatically:
- ✅ Build karega
- ✅ Netlify Functions deploy karega
- ✅ Admin posts viewers ko dikhai denge!

---

## 🔐 GitHub Login (Agar nahi hai)

Terminal se GitHub login:
```bash
# GitHub CLI install karo
winget install GitHub.cli

# Login
gh auth login
```

Ya manually username/password/token use karo when pushing.

---

## ⚡ Quick Summary

```bash
# 1. GitHub par repo banao (website se)
# 2. Remote URL set karo
git remote set-url origin YOUR_GITHUB_URL

# 3. Push karo
git push -u origin main

# 4. Netlify se connect karo
# Done! 🎉
```

# 🚀 Quick Start Guide - ZeptaLabs News & Updates

## ✅ You're Ready! npm is already installed.

Node.js: v26.2.0
npm: v12.2.1

---

## 📝 STEP 1: Get Your Gemini API Key

1. Go to: https://ai.google.dev/
2. Click "Get API Key" or "Get Started"
3. Sign in with your Google account
4. Create a new API key
5. Copy the API key (looks like: `AIzaSy...`)

---

## 📝 STEP 2: Add Your API Key

Open the file `.env.local` and replace the placeholder:

```env
GEMINI_API_KEY="YOUR_ACTUAL_API_KEY_HERE"
APP_URL="http://localhost:3000"
```

**Example:**
```env
GEMINI_API_KEY="AIzaSyC3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S"
APP_URL="http://localhost:3000"
```

---

## 🧪 STEP 3: Test Locally

Run these commands in your terminal:

```bash
# Build the app
npm run build

# Start the server
npm start
```

Open your browser to: **http://localhost:3000**

---

## 🌐 STEP 4: Deploy to the Internet

### 🔥 Option A: Vercel (EASIEST - 2 minutes)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel
```

Then set environment variables in Vercel dashboard:
- `GEMINI_API_KEY` = your API key
- `APP_URL` = your Vercel URL

---

### 🎯 Option B: Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

---

### 📦 Option C: Railway (Has Free Tier)

1. Go to https://railway.app
2. Click "Start New Project"
3. Connect your GitHub repo
4. Add environment variables in Railway dashboard
5. Deploy automatically!

---

## 🔐 Important: Environment Variables for Production

When deploying, set these in your hosting dashboard:

```
GEMINI_API_KEY = your_actual_key
APP_URL = https://your-deployed-url.com
NODE_ENV = production
```

---

## 📂 Files Created for Deployment

✅ `netlify.toml` - Netlify configuration
✅ `vercel.json` - Vercel configuration
✅ `Dockerfile` - Docker container setup
✅ `.env.local` - Local development environment
✅ `.env.production` - Production environment template
✅ `.gitignore` - Files to exclude from Git
✅ `.dockerignore` - Files to exclude from Docker
✅ `DEPLOYMENT.md` - Full deployment guide

---

## 🆘 Troubleshooting

**"Cannot find module" error?**
```bash
npm install --legacy-peer-deps
```

**Port 3000 already in use?**
- Close other apps using port 3000
- Or change PORT in .env.local to 3001

**Build fails?**
```bash
# Clean install
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install --legacy-peer-deps
npm run build
```

**API key not working?**
- Make sure you copied the entire key
- Check for extra spaces in .env.local
- Verify the key is active in Google AI Studio

---

## 📋 Deployment Checklist

- [ ] ✅ npm installed (DONE)
- [ ] ✅ Dependencies installed (DONE)
- [ ] Get Gemini API key
- [ ] Add key to .env.local
- [ ] Test locally: `npm start`
- [ ] Choose hosting (Vercel/Netlify/Railway)
- [ ] Deploy
- [ ] Add environment variables to hosting dashboard
- [ ] Test live website
- [ ] 🎉 Share with the world!

---

## 🎯 Quick Commands Reference

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm start            # Start production server

# Deployment
vercel --prod        # Deploy to Vercel
netlify deploy --prod # Deploy to Netlify

# Troubleshooting
npm install --legacy-peer-deps  # Fix dependency issues
npm run lint         # Check TypeScript errors
```

---

## 📚 Need More Help?

Check `DEPLOYMENT.md` for detailed deployment guides including:
- VPS deployment (DigitalOcean, AWS, etc.)
- Docker deployment
- Custom domain setup
- SSL certificate setup
- PM2 process management

---

**You're all set!** 🚀

Your website is ready to go live. Just follow the steps above!

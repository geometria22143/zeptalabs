# Deployment Guide - ZeptaLabs News & Updates

This guide covers multiple deployment options for your website.

## Prerequisites

✅ Node.js v20+ and npm installed
✅ Gemini API Key from Google AI Studio
✅ Git repository (optional but recommended)

---

## 🚀 Deployment Options

### Option 1: Vercel (Recommended - Easiest)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   npm run build
   vercel
   ```

4. **Set Environment Variables**
   - Go to your Vercel dashboard
   - Select your project → Settings → Environment Variables
   - Add:
     - `GEMINI_API_KEY`: Your Gemini API key
     - `APP_URL`: Your Vercel URL (e.g., https://your-app.vercel.app)

5. **Redeploy** (after setting env vars)
   ```bash
   vercel --prod
   ```

---

### Option 2: Netlify

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login**
   ```bash
   netlify login
   ```

3. **Deploy**
   ```bash
   npm run build
   netlify deploy --prod
   ```

4. **Set Environment Variables**
   - Netlify Dashboard → Site Settings → Environment Variables
   - Add `GEMINI_API_KEY` and `APP_URL`

---

### Option 3: Docker + Any Cloud Provider

1. **Build Docker Image**
   ```bash
   docker build -t zeptalabs-news .
   ```

2. **Run Locally (Test)**
   ```bash
   docker run -p 3000:3000 -e GEMINI_API_KEY="your_key" zeptalabs-news
   ```

3. **Deploy to:**
   - **Google Cloud Run**
   - **AWS ECS**
   - **Azure Container Apps**
   - **DigitalOcean App Platform**

---

### Option 4: Traditional VPS (DigitalOcean, Linode, AWS EC2)

1. **SSH into your server**
   ```bash
   ssh user@your-server-ip
   ```

2. **Install Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Clone your repository**
   ```bash
   git clone your-repo-url
   cd ZeptaLabs-News-Updates
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Create .env.production file**
   ```bash
   nano .env.production
   ```
   Add:
   ```
   GEMINI_API_KEY="your_key"
   APP_URL="http://your-server-ip:3000"
   NODE_ENV=production
   ```

6. **Build the app**
   ```bash
   npm run build
   ```

7. **Install PM2 (Process Manager)**
   ```bash
   npm install -g pm2
   ```

8. **Start the app**
   ```bash
   pm2 start npm --name "zeptalabs-news" -- start
   pm2 save
   pm2 startup
   ```

9. **Setup Nginx (Optional - for domain)**
   ```bash
   sudo apt install nginx
   ```
   
   Create config:
   ```bash
   sudo nano /etc/nginx/sites-available/zeptalabs
   ```
   
   Add:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   
   Enable:
   ```bash
   sudo ln -s /etc/nginx/sites-available/zeptalabs /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

10. **Setup SSL with Let's Encrypt**
    ```bash
    sudo apt install certbot python3-certbot-nginx
    sudo certbot --nginx -d your-domain.com
    ```

---

## 📋 Pre-Deployment Checklist

- [ ] Install dependencies: `npm install`
- [ ] Set environment variables (`.env.local` or `.env.production`)
- [ ] Test build locally: `npm run build`
- [ ] Test server locally: `npm start`
- [ ] Get Gemini API key from https://ai.google.dev/
- [ ] Choose deployment platform
- [ ] Set up custom domain (optional)
- [ ] Configure SSL certificate
- [ ] Set up monitoring/analytics (optional)

---

## 🔑 Environment Variables Required

```env
GEMINI_API_KEY=your_gemini_api_key_here
APP_URL=https://your-domain.com
NODE_ENV=production
PORT=3000
```

---

## 🧪 Testing Before Deployment

1. **Build the app**
   ```bash
   npm run build
   ```

2. **Start production server**
   ```bash
   npm start
   ```

3. **Open browser**
   Navigate to `http://localhost:3000`

4. **Test all features:**
   - News section loads
   - Updates section works
   - Authentication modal
   - Share functionality
   - Responsive design

---

## 🛠️ Troubleshooting

**Build fails?**
- Run `npm install` again
- Check Node.js version: `node --version` (should be 20+)
- Clear cache: `rm -rf node_modules package-lock.json && npm install`

**API not working?**
- Verify GEMINI_API_KEY is set correctly
- Check API key permissions in Google AI Studio
- Look at server logs

**Port already in use?**
- Change PORT in environment variables
- Kill existing process: `lsof -ti:3000 | xargs kill` (Mac/Linux)

---

## 📊 Recommended: Free Tier Hosting

- **Vercel**: Free hobby tier, automatic HTTPS, global CDN
- **Netlify**: 100GB bandwidth/month free
- **Render**: Free tier with 750 hours/month
- **Railway**: $5 credit/month free

---

## 🎯 Quick Deploy Commands

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Test locally
npm start

# Deploy to Vercel
vercel --prod

# Deploy to Netlify
netlify deploy --prod
```

---

## Need Help?

Check the logs:
- Vercel: `vercel logs`
- Netlify: Dashboard → Deploys → View logs
- Docker: `docker logs container_id`
- PM2: `pm2 logs zeptalabs-news`

---

Good luck with your deployment! 🚀

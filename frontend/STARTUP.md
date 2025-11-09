# 🚀 Starting Clubverse Frontend

## Quick Start

### 1. Install Dependencies

```bash
cd clubverse/frontend
npm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and set your backend URL:
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

### 3. Start Development Server

```bash
npm run dev
```

The app will start at: **http://localhost:3000**

## 📱 Testing on Phone

### Option 1: Browser DevTools (Easiest)

1. Open http://localhost:3000 in Chrome/Firefox
2. Press `F12` (or `Cmd+Option+I` on Mac)
3. Click the device toggle icon (📱)
4. Select a phone size (iPhone, Pixel, etc.)
5. The UI will adapt to mobile layout!

### Option 2: Network Access (Test on Real Phone)

1. Find your computer's IP address:
   ```bash
   # Windows
   ipconfig
   
   # Mac/Linux
   ifconfig
   ```

2. Start Next.js with host binding:
   ```bash
   npm run dev -- -H 0.0.0.0
   ```

3. On your phone (same WiFi), go to:
   ```
   http://YOUR_IP:3000
   ```
   Example: `http://192.168.1.100:3000`

### Option 3: ngrok (Public URL)

```bash
# Install ngrok
npm install -g ngrok

# In one terminal, start Next.js
npm run dev

# In another terminal, expose it
ngrok http 3000
```

Use the ngrok URL on your phone!

## 🌐 Testing on Desktop

Just open http://localhost:3000 in your browser. The UI automatically adapts to larger screens.

## 📂 Project Structure

```
frontend/
├── app/                    # Pages
│   ├── (auth)/            # Login/Register
│   ├── (customer)/        # Customer mobile flow
│   └── (dashboard)/       # Club owner dashboard
├── components/            # UI components
└── lib/                   # API, queries, providers
```

## 🎯 What You'll See

Currently, the app redirects to `/clubs`. You'll need to create pages:

1. **`app/(auth)/login/page.tsx`** - Login page
2. **`app/(customer)/clubs/page.tsx`** - Browse clubs (mobile-first)
3. **`app/(dashboard)/layout.tsx`** - Club owner dashboard

## 🔧 Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill
```

### Backend Not Running

Make sure your FastAPI backend is running on port 8000:
```bash
cd ../backend
uvicorn app.main:app --reload
```

### Module Not Found

```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📱 Mobile-First Design

The UI is built mobile-first:
- **Phone**: Single column, touch-friendly buttons
- **Tablet**: 2-column layout
- **Desktop**: Full dashboard with sidebar

All components automatically adapt using Tailwind responsive classes!


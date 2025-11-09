# 📱 Clubverse Mobile Design - Customer Interface

## Overview

Mobile-first, elegant interface for customers with **bottom tab navigation**. Clean, compact, and focused on the essentials.

---

## 🎯 Navigation Structure

### Bottom Tab Bar (Fixed)

```
┌─────────────────────────────────────┐
│                                     │
│         [Page Content]              │
│                                     │
├─────────────────────────────────────┤
│  [Map]    [Clubs]    [Account]     │
└─────────────────────────────────────┘
```

**3 Tabs:**
1. **Map** - Interactive map view
2. **Clubs** - List of all clubs
3. **Account** - User profile & settings

---

## 📍 Tab 1: Map

### Features
- **Full screen map** (minus bottom nav)
- Ultra-minimalist style
- City name at top
- Club markers with gradient
- Click marker → Bottom sheet appears
- User location indicator (if granted)

### Layout
```
┌─────────────────────────────────────┐
│         City Name (centered)        │
│                                     │
│                                     │
│         [Interactive Map]           │
│         • Club markers              │
│         • User location             │
│                                     │
│                                     │
│         [Center button]             │
├─────────────────────────────────────┤
│  [Map]    [Clubs]    [Account]     │
└─────────────────────────────────────┘
```

### Interactions
- Tap marker → Bottom sheet with club details
- Bottom sheet → "View Menu" button
- Smooth animations throughout

---

## 📋 Tab 2: Clubs

### Features
- **Compact list cards**
- Sorted by distance (if location granted)
- Shows: Image, name, description, city, distance
- Tap card → Navigate to club menu
- Clean, scrollable list

### Card Design
```
┌─────────────────────────────────────┐
│ ┌────┐  Club Name                  │
│ │Img │  Description text...        │
│ │80px│  📍 City  🧭 1.2km   [View]│
│ └────┘                              │
└─────────────────────────────────────┘
```

### Layout
```
┌─────────────────────────────────────┐
│  [Club Card 1]                      │
│  [Club Card 2]                      │
│  [Club Card 3]                      │
│  [Club Card 4]                      │
│  ...                                │
├─────────────────────────────────────┤
│  [Map]    [Clubs]    [Account]     │
└─────────────────────────────────────┘
```

### Features
- Distance calculation (if location available)
- Sorted nearest first
- Smooth scroll
- Tap anywhere on card → View menu

---

## 👤 Tab 3: Account

### Features
- **Profile section** with avatar
- User name and email
- Account options
- Logout button
- App version info

### Layout
```
┌─────────────────────────────────────┐
│         [Avatar Circle]             │
│         User Name                   │
│         user@email.com              │
│                                     │
│  ───────────────────────────────    │
│                                     │
│  👤 Edit Profile          >         │
│  📧 Order History         >         │
│                                     │
│  ───────────────────────────────    │
│                                     │
│  [Logout Button]                    │
│                                     │
│  Clubverse v1.0.0                   │
│  © 2025 Clubverse                   │
├─────────────────────────────────────┤
│  [Map]    [Clubs]    [Account]     │
└─────────────────────────────────────┘
```

---

## 🎨 Design System

### Bottom Navigation
- **Height**: 64px (16 in Tailwind)
- **Background**: Card/95 with backdrop blur
- **Border**: Top border (border/40)
- **Icons**: 20px (h-5 w-5)
- **Text**: 11px font size
- **Active**: Primary color
- **Inactive**: Muted foreground

### Spacing
- **Page padding**: 16px (px-4)
- **Card spacing**: 12px gap (space-y-3)
- **Bottom safe area**: pb-16 on all pages

### Typography
- **Headings**: Semibold, 16-20px
- **Body**: Regular, 13-14px
- **Labels**: 11-12px
- **Compact & elegant**

### Colors
- Reuses dashboard design system
- Purple-pink gradients
- Dark theme optimized
- Subtle borders (border/40)

---

## 📱 Mobile Optimizations

### Touch Targets
- Minimum 44px tap areas
- Generous padding on cards
- Large, clear buttons

### Performance
- Lazy load map
- Efficient distance calculations
- Memoized club sorting
- Smooth animations (300ms)

### Gestures
- Swipe on map (pan/zoom)
- Tap cards (navigate)
- Pull bottom sheet (drag handle)
- Smooth scrolling

---

## 🔄 Navigation Flow

```
App Start → /map (Map Tab)

Map Tab:
  - Tap marker → Bottom sheet
  - Tap "View Menu" → /clubs/[id]

Clubs Tab:
  - Tap card → /clubs/[id]
  - Shows distance if location granted

Account Tab:
  - View profile
  - Edit settings
  - Logout → /login
```

---

## 🎯 Key Features

### ✅ Implemented
- Bottom tab navigation
- Full-screen map view
- Compact club list
- Distance calculation
- Account page
- Smooth animations
- Mobile-optimized cards

### 🔜 Future
- Pull-to-refresh
- Search clubs
- Filter by category
- Order history
- Favorites
- Push notifications

---

## 📂 File Structure

```
app/(customer)/
├── layout.tsx           # Bottom nav wrapper
├── map/
│   └── page.tsx        # Full-screen map
├── clubs/
│   └── page.tsx        # Club list
└── account/
    └── page.tsx        # User profile

components/layout/
└── mobile-bottom-nav.tsx  # Bottom tabs
```

---

## 🎨 Component Reuse

**From Dashboard:**
- ✅ Card components
- ✅ Button styles
- ✅ Typography system
- ✅ Color palette
- ✅ Border radius
- ✅ Spacing scale
- ✅ Loading states
- ✅ Error handling

**Mobile-Specific:**
- Bottom navigation
- Compact card layouts
- Full-screen map
- Touch-optimized spacing

---

## 🚀 Usage

### Default Route
```typescript
// App starts at /map
router.push('/map')
```

### Tab Navigation
```typescript
// Bottom nav handles routing
<Link href="/map">Map</Link>
<Link href="/clubs">Clubs</Link>
<Link href="/account">Account</Link>
```

### Club Details
```typescript
// From any tab
router.push(`/clubs/${clubId}`)
```

---

## 📱 Responsive Behavior

### Mobile (< 768px)
- Bottom navigation visible
- Full-width cards
- Compact spacing
- Touch-optimized

### Tablet/Desktop (> 768px)
- Bottom nav still visible (mobile-first)
- Cards adapt to width
- More breathing room
- Hover effects work

---

## ✨ Design Principles

1. **Mobile-First**: Designed for phone usage
2. **Compact**: Efficient use of screen space
3. **Elegant**: Clean, minimalist aesthetic
4. **Reusable**: Leverages existing components
5. **Fast**: Optimized performance
6. **Intuitive**: Clear navigation

---

**Design Version**: 1.0 - Mobile Customer Interface  
**Last Updated**: 2025-11-09  
**Status**: ✅ Production Ready


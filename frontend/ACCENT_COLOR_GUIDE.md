# 🎨 Accent Color System

> **Simple guide to changing the accent color globally**

---

## 📍 Current Accent Color

**Purple** (`#8B5CF6`)

---

## 🔄 How to Change Accent Color

### Option 1: Use a Preset (Recommended)

We have 10 pre-configured accent colors ready to use:

1. **Purple** (default) - `#8B5CF6` - Vibrant and energetic
2. **Pink** - `#EC4899` - Bold and playful
3. **Blue** - `#3B82F6` - Professional and trustworthy
4. **Cyan** - `#06B6D4` - Modern and fresh
5. **Green** - `#10B981` - Natural and calming
6. **Orange** - `#F97316` - Warm and inviting
7. **Red** - `#EF4444` - Bold and attention-grabbing
8. **Indigo** - `#6366F1` - Deep and sophisticated
9. **Teal** - `#14B8A6` - Balanced and elegant
10. **Amber** - `#F59E0B` - Warm and luxurious

### Steps to Switch:

#### 1. Update `lib/design-system/tokens.ts`

```typescript
export const CLUBVERSE_BRAND = {
  purple: '#8B5CF6',
  pink: '#EC4899',
  
  // CHANGE THIS LINE:
  accent: '#3B82F6', // Example: Changed to blue
  
  gradient: {
    start: '#8B5CF6',
    end: '#EC4899',
  },
} as const
```

#### 2. Update `app/globals.css`

Find these lines and update the HSL values:

```css
:root {
  /* CHANGE THESE TWO LINES: */
  --primary: 217 91% 60%; /* Blue HSL */
  --ring: 217 91% 60%;    /* Blue HSL */
}

.dark {
  /* CHANGE THESE TWO LINES: */
  --primary: 217 91% 60%; /* Blue HSL */
  --ring: 217 91% 60%;    /* Blue HSL */
}
```

**HSL Values Reference** (from `lib/design-system/accent-colors.ts`):
- Purple: `262 83% 58%`
- Pink: `330 81% 60%`
- Blue: `217 91% 60%`
- Cyan: `189 94% 43%`
- Green: `158 64% 52%`
- Orange: `25 95% 53%`
- Red: `0 72% 51%`
- Indigo: `239 84% 67%`
- Teal: `173 80% 40%`
- Amber: `43 96% 56%`

#### 3. Restart Dev Server

```bash
npm run dev
```

---

## 🎯 What Gets Updated

When you change the accent color, these elements automatically update:

### Interactive Elements
- ✅ **Buttons** - Background color and hover states
- ✅ **Input borders** - Focus ring color
- ✅ **Links** - Text color and hover states
- ✅ **Checkboxes** - Checked state color
- ✅ **Radio buttons** - Selected state color
- ✅ **Switches** - Active state color
- ✅ **Tabs** - Active tab indicator
- ✅ **Progress bars** - Fill color
- ✅ **Badges** - Primary variant background

### Focus States
- ✅ All focusable elements use the accent color for focus rings

---

## 🧪 Testing Your Accent Color

After changing the accent color, test these pages:

1. **Login page** (`/login`) - Check inputs and button
2. **Register page** (`/register`) - Check form elements
3. **Clubs page** (`/clubs`) - Check cards and buttons
4. **Any forms** - Check all interactive elements

---

## 🎨 Custom Accent Color

Want to use a color not in the presets?

### 1. Get your color's HSL values

Use a tool like [HSL Color Picker](https://hslpicker.com/) to convert your hex color to HSL.

Example: `#FF6B6B` → `0 100% 71%`

### 2. Update the files

Follow the same steps as "Option 1" but use your custom HSL values.

---

## 📝 Example: Switching to Blue

### Before (Purple):
```typescript
// tokens.ts
accent: '#8B5CF6',
```

```css
/* globals.css */
--primary: 262 83% 58%;
--ring: 262 83% 58%;
```

### After (Blue):
```typescript
// tokens.ts
accent: '#3B82F6',
```

```css
/* globals.css */
--primary: 217 91% 60%;
--ring: 217 91% 60%;
```

---

## 🚨 Important Notes

1. **Both light and dark themes** need the same HSL values
2. **Restart your dev server** after making changes
3. **Test thoroughly** - check all interactive elements
4. **Maintain contrast** - ensure text is readable on your accent color

---

## 🎯 Best Practices

- Choose colors with **sufficient contrast** (WCAG AA minimum)
- Test in **both light and dark modes**
- Consider your **brand identity**
- Keep it **consistent** across the app

---

## 🔍 Where Accent Color is Used

### Components
- `components/ui/button.tsx` - Primary button variant
- `components/ui/input.tsx` - Focus ring
- `components/ui/checkbox.tsx` - Checked state
- `components/ui/switch.tsx` - Active state
- `components/ui/tabs.tsx` - Active tab
- `components/ui/badge.tsx` - Primary variant

### Pages
- All auth pages (login, register)
- All form pages
- All pages with buttons/links

---

**Last Updated**: 2025-11-07  
**Current Accent**: Purple (`#8B5CF6`)


# Clubverse Design System - iOS-Style Compact Design

## Overview
Clubverse uses an elegant, compact design inspired by iOS with Apple's system fonts and tight spacing for a modern, professional look.

## Typography

### Font Stack
```css
-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif
```

**Features:**
- Native Apple system font
- Antialiased for smooth rendering  
- Tight letter-spacing: `-0.011em` (body), `-0.022em` (headings)
- Font weights: 600 for headings, 500 for medium, 400 for regular

### Size Scale (iOS-style compact)
```
11px - `text-[11px]` - Small labels, meta info
12px - `text-xs` - Descriptions, helper text
13px - `text-[13px]` - Default body text, nav items
14px - `text-sm` - Standard text
16px - `text-base` - Card titles
18px - `text-lg` - Page headings
20px - `text-xl` - Stats, numbers
```

## Spacing System

### Compact Spacing (Reduced from default)
```
0.125rem (2px)  - `0.5`
0.25rem (4px)   - `1`
0.375rem (6px)  - `1.5`
0.5rem (8px)    - `2`
0.625rem (10px) - `2.5`
0.75rem (12px)  - `3`
1rem (16px)     - `4`
1.5rem (24px)   - `6`
```

### Component Spacing

**Cards:**
- Padding: `px-4 py-3` (16px horizontal, 12px vertical)
- Gap: `gap-3` (12px between cards)
- Border: `border-border/40` (subtle 40% opacity)

**Buttons:**
- Default: `h-8 px-3 py-1.5` (32px height)
- Small: `h-7 px-2.5 py-1` (28px height)
- Large: `h-9 px-4 py-2` (36px height)

**Sidebar:**
- Width: `w-56` (224px, reduced from 256px)
- Header height: `h-12` (48px, reduced from 64px)
- Nav padding: `px-3 py-4` (compact)
- Nav item: `px-3 py-2` (tight spacing)

**Main Content:**
- Header height: `h-12` (48px)
- Content padding: `p-3 lg:p-6` (12px mobile, 24px desktop)

## Border Radius

```css
--radius: 0.375rem; /* 6px - iOS-style compact corners */
```

All components use: `rounded-[var(--radius)]`

## Colors

### Borders
- Default: `border-border/40` (40% opacity for subtle look)
- Hover: `hover:border-primary/50`
- Focus: `focus:border-primary/60`

### Backgrounds
- Card: `bg-card/50` (50% opacity with backdrop-blur)
- Sidebar: `bg-card/30` (30% opacity)

## Component Specifications

### Card Component

```tsx
<Card>              // border-border/40
  <CardHeader>      // px-4 py-3, space-y-1
    <CardTitle>     // text-lg (16px), font-semibold
    <CardDescription> // text-xs (12px)
  </CardHeader>
  <CardContent>     // px-4 py-3 pt-0
    ...
  </CardContent>
</Card>
```

### Stat Card (Dashboard)

```tsx
<Card className="border-border/40 bg-card/50">
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
    <CardTitle className="text-xs font-medium text-muted-foreground">
      Label
    </CardTitle>
    <Icon className="h-3.5 w-3.5" />
  </CardHeader>
  <CardContent>
    <div className="text-xl font-semibold">Value</div>
    <p className="text-[11px] text-muted-foreground mt-0.5">
      Description
    </p>
  </CardContent>
</Card>
```

### Button Sizing

```tsx
<Button>                    // h-8, text-[13px]
<Button size="sm">          // h-7, text-xs
<Button size="lg">          // h-9, text-sm
<Button size="icon">        // h-8 w-8
```

### Navigation Item

```tsx
<Link className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-[var(--radius)]">
  <Icon className="h-4 w-4 flex-shrink-0" />
  <span>Label</span>
</Link>
```

## Icon Sizes

```
Extra Small: h-3 w-3 (12px)
Small: h-3.5 w-3.5 (14px)
Default: h-4 w-4 (16px)
Medium: h-5 w-5 (20px)
Large: h-6 w-6 (24px)
```

## Reusable Patterns

### Page Layout
```tsx
<div className="space-y-4">        // 16px vertical spacing
  <div className="grid gap-3">     // 12px grid gap
    ...
  </div>
</div>
```

### Page Header
```tsx
<div className="flex items-center justify-between">
  <div>
    <h2 className="text-xl font-semibold">Title</h2>
    <p className="text-[13px] text-muted-foreground">Description</p>
  </div>
  <Button>Action</Button>
</div>
```

### Empty State
```tsx
<div className="text-center py-10">
  <Icon className="mx-auto h-10 w-10 text-muted-foreground/50" />
  <h3 className="mt-3 text-base font-semibold">Title</h3>
  <p className="mt-1.5 text-[13px] text-muted-foreground">
    Description
  </p>
  <Button className="mt-3">Action</Button>
</div>
```

## Comparison: Before vs After

### Before (Default Tailwind)
- Border radius: 8px (`0.5rem`)
- Card padding: 24px (`p-6`)
- Button height: 40px (`h-10`)
- Header height: 64px (`h-16`)
- Font sizes: Standard (14px-24px)
- Sidebar width: 256px

### After (iOS-style Compact)
- Border radius: 6px (`0.375rem`) ✨
- Card padding: 16px/12px (`px-4 py-3`) ✨
- Button height: 32px (`h-8`) ✨
- Header height: 48px (`h-12`) ✨
- Font sizes: Compact (11px-20px) ✨
- Sidebar width: 224px ✨

## Benefits

1. **Space Efficiency** - 20-30% more content fits on screen
2. **Modern iOS Feel** - Apple-like elegance and refinement
3. **Better Hierarchy** - Tighter spacing improves visual grouping
4. **Professional** - Clean, sophisticated appearance
5. **Reusable** - All components follow consistent patterns
6. **Responsive** - Scales beautifully on mobile and desktop

## Usage Guidelines

### DO ✅
- Use exact pixel sizes via `text-[13px]` for consistency
- Keep spacing tight and consistent
- Use 40% opacity borders for subtle look
- Apply backdrop blur to cards
- Use semibold (600) for headings

### DON'T ❌
- Don't use large padding/margins
- Don't mix spacing scales
- Don't use full opacity borders
- Don't use bold (700) - use semibold (600)
- Don't exceed recommended font sizes

## Implementation

All components in `/components/ui/` are updated with compact styling.
All dashboard pages in `/app/(club)`, `/app/(bartender)`, `/app/(admin)` use these patterns.

**Global styles:** `app/globals.css`
**Components:** `components/ui/*`
**Layouts:** `components/layouts/dashboard-layout.tsx`


# Clubverse Frontend

Modern, mobile-first frontend for Clubverse - a nightlife drink ordering platform.

## 🏗️ Architecture

Built with the same professional patterns as SignalCore:

- **Next.js 15** with App Router
- **TypeScript** (strict mode)
- **TanStack Query** for state management & caching
- **shadcn/ui** components (Radix UI primitives)
- **Tailwind CSS** with design tokens
- **Mobile-first** responsive design

## 📁 Structure

```
frontend/
├── app/                    # Pages (Next.js App Router)
│   ├── (auth)/            # Public pages
│   ├── (customer)/        # Customer mobile flow
│   ├── (dashboard)/       # Club owner dashboard
│   └── layout.tsx         # Root layout
│
├── components/
│   ├── ui/                # Base components (shadcn/ui)
│   ├── common/            # Reusable molecules
│   └── features/          # Feature-specific components
│
├── lib/
│   ├── api/               # API clients (one per domain)
│   ├── queries/           # React Query hooks
│   ├── providers/         # Context providers
│   ├── design-system/     # Design tokens
│   └── utils.ts           # Utilities
│
├── types/                 # TypeScript types
└── hooks/                 # Custom hooks
```

## 🎨 Design System

**Single source of truth:** `lib/design-system/tokens.ts`

- Brand colors: Purple (#8B5CF6) → Pink (#EC4899) gradient
- Dark theme optimized for nightlife
- CSS variables for runtime theming
- Mobile-first responsive utilities

## 🔄 Data Flow

1. **Page component** calls React Query hook
2. **Hook** checks cache → returns instantly if cached
3. **If needed**, calls API client
4. **API client** adds auth headers, makes request
5. **React Query** caches response
6. **Component** re-renders with data

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build
```

## 📱 Mobile-First Approach

- **Customers** primarily use phones → Mobile-optimized UI
- **Club owners** use web → Dashboard interface
- **Bartenders** use phones → QR scanner interface

All components are responsive and work on all devices.

## 🔑 Key Features

- ✅ JWT authentication
- ✅ Real-time order updates (polling)
- ✅ Stripe payment integration
- ✅ QR code generation/scanning
- ✅ Role-based access (customer/club_owner/bartender)
- ✅ Dark theme (perfect for nightlife!)

## 📚 Patterns

### Creating a New Feature

1. **API file** (`lib/api/feature.ts`)
2. **Query hooks** (`lib/queries/use-feature.ts`)
3. **Components** (`components/features/feature/`)
4. **Page** (`app/(dashboard)/feature/page.tsx`)

### Example: Adding Drinks

```typescript
// lib/api/drinks.ts ✅ Already created
// lib/queries/use-drinks.ts ✅ Already created
// components/features/drinks/drink-card.tsx (create this)
// app/(dashboard)/drinks/page.tsx (create this)
```

## 🎯 Next Steps

1. Create base UI components (shadcn/ui)
2. Build customer mobile flow (browse clubs → order → payment)
3. Build club owner dashboard
4. Build bartender QR scanner interface

## 📖 Documentation

See `COMPLETE_GUIDE.md` (to be created) for detailed architecture documentation.


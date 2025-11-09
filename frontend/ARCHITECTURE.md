# Clubverse Frontend Architecture

> **Senior-Level, SOLID-Compliant Architecture**  
> Built on proven patterns from SignalCore with domain-specific enhancements

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Principles](#core-principles)
3. [Project Structure](#project-structure)
4. [Layer Responsibilities](#layer-responsibilities)
5. [Design Patterns](#design-patterns)
6. [Component Architecture](#component-architecture)
7. [State Management](#state-management)
8. [API Layer](#api-layer)
9. [Type Safety](#type-safety)
10. [Styling System](#styling-system)
11. [Best Practices](#best-practices)
12. [File Naming Conventions](#file-naming-conventions)

---

## 🏗️ Architecture Overview

Clubverse follows a **layered, domain-driven architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│  (Pages, Layouts, Feature Components, UI Components)    │
├─────────────────────────────────────────────────────────┤
│                   Application Layer                      │
│     (React Query Hooks, Providers, Custom Hooks)        │
├─────────────────────────────────────────────────────────┤
│                    Domain Layer                          │
│         (Types, Business Logic, Utilities)               │
├─────────────────────────────────────────────────────────┤
│                 Infrastructure Layer                     │
│       (API Client, External Services, Config)            │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Core Principles

### SOLID Principles Applied

1. **Single Responsibility Principle (SRP)**
   - Each component/module has ONE reason to change
   - API clients handle ONLY HTTP communication
   - React Query hooks handle ONLY data fetching/caching
   - Components handle ONLY UI rendering

2. **Open/Closed Principle (OCP)**
   - Components are open for extension, closed for modification
   - Use composition over inheritance
   - Extend functionality through props and composition

3. **Liskov Substitution Principle (LSP)**
   - Components can be replaced with their variants without breaking the app
   - Consistent prop interfaces across similar components

4. **Interface Segregation Principle (ISP)**
   - Components receive only the props they need
   - No "god objects" with dozens of unused props

5. **Dependency Inversion Principle (DIP)**
   - Depend on abstractions (types/interfaces), not concrete implementations
   - API layer is abstracted from components via React Query hooks

### Additional Principles

- **DRY (Don't Repeat Yourself)**: Reuse components, hooks, and utilities
- **KISS (Keep It Simple, Stupid)**: Prefer simple solutions over complex ones
- **YAGNI (You Aren't Gonna Need It)**: Don't build features until they're needed
- **Separation of Concerns**: Clear boundaries between layers
- **Composition over Inheritance**: Build complex UIs from simple components

---

## 📁 Project Structure

```
clubverse/frontend/
├── app/                          # Next.js 15 App Router
│   ├── (auth)/                   # Auth route group (no layout)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (customer)/               # Customer route group (with header)
│   │   ├── layout.tsx
│   │   ├── clubs/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── menu/
│   │   │   └── [clubId]/
│   │   │       └── page.tsx
│   │   ├── orders/
│   │   │   └── page.tsx
│   │   └── profile/
│   │       └── page.tsx
│   ├── (club-owner)/             # Club owner route group
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── drinks/
│   │   │   └── page.tsx
│   │   ├── orders/
│   │   │   └── page.tsx
│   │   └── analytics/
│   │       └── page.tsx
│   ├── (bartender)/              # Bartender route group
│   │   ├── layout.tsx
│   │   └── orders/
│   │       └── page.tsx
│   ├── globals.css               # Global styles + CSS variables
│   ├── layout.tsx                # Root layout (providers)
│   └── page.tsx                  # Landing/redirect page
│
├── components/                   # Component library
│   ├── ui/                       # shadcn/ui primitives (atoms)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   ├── common/                   # Reusable molecules
│   │   ├── empty-state.tsx
│   │   ├── loading-skeleton.tsx
│   │   ├── data-row.tsx
│   │   ├── form-skeleton.tsx
│   │   └── ...
│   ├── features/                 # Domain-specific organisms
│   │   ├── clubs/
│   │   │   ├── club-card.tsx
│   │   │   ├── club-list.tsx
│   │   │   └── club-details.tsx
│   │   ├── drinks/
│   │   │   ├── drink-card.tsx
│   │   │   ├── drink-list.tsx
│   │   │   └── drink-form.tsx
│   │   ├── orders/
│   │   │   ├── order-card.tsx
│   │   │   ├── order-list.tsx
│   │   │   ├── cart-summary.tsx
│   │   │   └── order-status.tsx
│   │   └── bartenders/
│   │       ├── bartender-card.tsx
│   │       └── bartender-list.tsx
│   ├── layout/                   # Layout components
│   │   ├── header.tsx
│   │   ├── sidebar.tsx
│   │   └── footer.tsx
│   ├── layouts/                  # Page templates
│   │   ├── auth-layout.tsx
│   │   └── page-header.tsx
│   ├── branding/                 # Brand assets
│   │   ├── background-icon.tsx
│   │   └── logo.tsx
│   └── typography/               # Text components
│       ├── heading.tsx
│       └── text.tsx
│
├── lib/                          # Core libraries
│   ├── api/                      # API clients (one per domain)
│   │   ├── client.ts             # Axios instance + interceptors
│   │   ├── auth.ts               # Auth endpoints
│   │   ├── clubs.ts              # Club endpoints
│   │   ├── drinks.ts             # Drink endpoints
│   │   ├── orders.ts             # Order endpoints
│   │   ├── bartenders.ts         # Bartender endpoints
│   │   └── payments.ts           # Payment endpoints
│   ├── queries/                  # React Query hooks (one per domain)
│   │   ├── use-auth.ts
│   │   ├── use-clubs.ts
│   │   ├── use-drinks.ts
│   │   ├── use-orders.ts
│   │   ├── use-bartenders.ts
│   │   └── use-payments.ts
│   ├── providers/                # Context providers
│   │   ├── query-provider.tsx   # React Query setup
│   │   ├── auth-provider.tsx    # Auth context
│   │   └── cart-provider.tsx    # Shopping cart context
│   ├── design-system/            # Design tokens + theme
│   │   ├── tokens.ts             # Colors, spacing, typography
│   │   └── theme-provider.tsx   # Theme context
│   ├── utils/                    # Utility functions
│   │   ├── format.ts             # Date, currency formatting
│   │   ├── validation.ts         # Form validation helpers
│   │   └── ...
│   └── utils.ts                  # General utilities (cn, etc.)
│
├── hooks/                        # Custom React hooks
│   ├── use-toast.ts
│   ├── use-cart.ts
│   ├── use-auth.ts
│   └── ...
│
├── types/                        # TypeScript types
│   ├── index.ts                  # Core domain types
│   ├── api.ts                    # API request/response types
│   └── ...
│
├── public/                       # Static assets
│   └── assets/
│       ├── whiteicon.svg
│       ├── blackicon.svg
│       ├── whiteclubverse.svg
│       └── blackclubverse.svg
│
├── ARCHITECTURE.md               # This file
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

---

## 🎭 Layer Responsibilities

### 1. Presentation Layer (`app/`, `components/`)

**Responsibility**: UI rendering, user interactions, routing

**Rules**:
- Components should be **pure** and **predictable**
- No direct API calls (use React Query hooks)
- No business logic (delegate to hooks/utils)
- Receive data via props, emit events via callbacks
- Use TypeScript for prop validation

**Example**:
```tsx
// ✅ GOOD: Pure, focused component
export function ClubCard({ club, onSelect }: ClubCardProps) {
  return (
    <Card onClick={() => onSelect(club.id)}>
      <CardHeader>
        <CardTitle>{club.name}</CardTitle>
      </CardHeader>
    </Card>
  )
}

// ❌ BAD: Component doing too much
export function ClubCard({ clubId }: { clubId: string }) {
  const [club, setClub] = useState(null)
  
  useEffect(() => {
    // Don't fetch data directly in components!
    fetch(`/api/clubs/${clubId}`).then(...)
  }, [clubId])
  
  return <Card>...</Card>
}
```

### 2. Application Layer (`lib/queries/`, `lib/providers/`, `hooks/`)

**Responsibility**: Data fetching, state management, side effects

**Rules**:
- React Query hooks handle ALL server state
- Custom hooks encapsulate reusable logic
- Providers manage global state (auth, cart, theme)
- No UI rendering (return data/functions only)

**Example**:
```tsx
// ✅ GOOD: React Query hook
export function useClubs() {
  return useQuery({
    queryKey: ['clubs'],
    queryFn: clubsApi.getClubs,
  })
}

// ✅ GOOD: Custom hook with logic
export function useCart() {
  const [items, setItems] = useState<CartItem[]>([])
  
  const addItem = useCallback((drink: Drink) => {
    setItems(prev => [...prev, { ...drink, quantity: 1 }])
  }, [])
  
  const total = useMemo(() => 
    items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  )
  
  return { items, addItem, total }
}
```

### 3. Domain Layer (`types/`, `lib/utils/`)

**Responsibility**: Business logic, type definitions, pure functions

**Rules**:
- Types define the domain model
- Utilities are **pure functions** (no side effects)
- No framework dependencies (React, Next.js)
- Fully testable in isolation

**Example**:
```tsx
// ✅ GOOD: Pure utility function
export function calculateOrderTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

// ✅ GOOD: Type definitions
export interface Club {
  id: string
  name: string
  address: string
  drinks: Drink[]
}
```

### 4. Infrastructure Layer (`lib/api/`)

**Responsibility**: External communication, API integration

**Rules**:
- API clients are **thin wrappers** around HTTP calls
- Return raw data (no transformations)
- Handle errors at the boundary
- Use TypeScript for request/response types

**Example**:
```tsx
// ✅ GOOD: Focused API client
export const clubsApi = {
  getClubs: async (): Promise<Club[]> => {
    const { data } = await apiClient.get<Club[]>('/clubs')
    return data
  },
  
  getClub: async (id: string): Promise<Club> => {
    const { data } = await apiClient.get<Club>(`/clubs/${id}`)
    return data
  },
}
```

---

## 🎨 Design Patterns

### 1. Container/Presenter Pattern

Separate data fetching from presentation:

```tsx
// Container (fetches data)
export function ClubListContainer() {
  const { data: clubs, isLoading } = useClubs()
  
  if (isLoading) return <LoadingSkeleton />
  
  return <ClubList clubs={clubs} />
}

// Presenter (renders UI)
export function ClubList({ clubs }: { clubs: Club[] }) {
  return (
    <div className="grid gap-4">
      {clubs.map(club => <ClubCard key={club.id} club={club} />)}
    </div>
  )
}
```

### 2. Compound Components Pattern

For complex, related components:

```tsx
// Usage
<Order>
  <Order.Header />
  <Order.Items />
  <Order.Total />
  <Order.Actions />
</Order>

// Implementation
export const Order = ({ children }: { children: React.ReactNode }) => (
  <Card>{children}</Card>
)

Order.Header = ({ order }: { order: Order }) => (
  <CardHeader>
    <CardTitle>Order #{order.id}</CardTitle>
  </CardHeader>
)

Order.Items = ({ items }: { items: OrderItem[] }) => (
  <CardContent>
    {items.map(item => <OrderItem key={item.id} item={item} />)}
  </CardContent>
)
```

### 3. Render Props Pattern

For flexible, reusable logic:

```tsx
<DataFetcher
  queryKey={['clubs']}
  queryFn={clubsApi.getClubs}
  render={({ data, isLoading }) => 
    isLoading ? <Spinner /> : <ClubList clubs={data} />
  }
/>
```

### 4. Custom Hook Pattern

Extract reusable logic:

```tsx
// Hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  
  return debouncedValue
}

// Usage
const debouncedSearch = useDebounce(searchTerm, 500)
```

---

## 🧩 Component Architecture

### Atomic Design Hierarchy

```
Atoms → Molecules → Organisms → Templates → Pages
```

#### Atoms (`components/ui/`)
- **Smallest building blocks**
- Single responsibility
- No business logic
- Examples: Button, Input, Badge, Avatar

```tsx
// ✅ Atom: Button
<Button variant="primary" size="lg">
  Order Now
</Button>
```

#### Molecules (`components/common/`)
- **Combinations of atoms**
- Reusable across domains
- Examples: FormField, DataRow, EmptyState

```tsx
// ✅ Molecule: FormField
<FormField>
  <Label>Email</Label>
  <Input type="email" />
  <FormError />
</FormField>
```

#### Organisms (`components/features/`)
- **Domain-specific components**
- Composed of molecules/atoms
- Examples: ClubCard, DrinkList, OrderSummary

```tsx
// ✅ Organism: ClubCard
<ClubCard club={club}>
  <ClubCard.Image />
  <ClubCard.Name />
  <ClubCard.Address />
  <ClubCard.Actions />
</ClubCard>
```

#### Templates (`components/layouts/`)
- **Page layouts**
- Define structure, not content
- Examples: AuthLayout, DashboardLayout

```tsx
// ✅ Template: DashboardLayout
<DashboardLayout>
  <Sidebar />
  <Main>{children}</Main>
</DashboardLayout>
```

#### Pages (`app/`)
- **Complete views**
- Compose organisms/templates
- Handle routing

```tsx
// ✅ Page
export default function ClubsPage() {
  return (
    <DashboardLayout>
      <PageHeader title="Clubs" />
      <ClubListContainer />
    </DashboardLayout>
  )
}
```

---

## 🔄 State Management

### Server State (React Query)

**Use for**: Data from APIs (clubs, drinks, orders, users)

```tsx
// Query (GET)
const { data, isLoading, error } = useClubs()

// Mutation (POST/PUT/DELETE)
const createClub = useCreateClub()
createClub.mutate({ name: 'New Club' })
```

**Key Patterns**:
- Automatic caching
- Background refetching
- Optimistic updates
- Error handling

### Client State (React Context + Hooks)

**Use for**: UI state (theme, cart, modals)

```tsx
// Provider
<CartProvider>
  <App />
</CartProvider>

// Consumer
const { items, addItem, removeItem } = useCart()
```

### Local State (useState/useReducer)

**Use for**: Component-specific state (form inputs, toggles)

```tsx
const [isOpen, setIsOpen] = useState(false)
const [searchTerm, setSearchTerm] = useState('')
```

---

## 🌐 API Layer

### Structure

```
lib/api/
├── client.ts          # Axios instance + interceptors
├── auth.ts            # Auth endpoints
├── clubs.ts           # Club endpoints
├── drinks.ts          # Drink endpoints
└── orders.ts          # Order endpoints
```

### API Client (`client.ts`)

```typescript
import axios from 'axios'

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
})

// Request interceptor: Add auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token && !config.url?.includes('/auth/')) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: Handle 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export { apiClient }
```

### Domain API (`clubs.ts`)

```typescript
import { apiClient } from './client'
import { Club, CreateClubDto } from '@/types'

export const clubsApi = {
  // GET /clubs
  getClubs: async (): Promise<Club[]> => {
    const { data } = await apiClient.get<Club[]>('/clubs')
    return data
  },
  
  // GET /clubs/:id
  getClub: async (id: string): Promise<Club> => {
    const { data } = await apiClient.get<Club>(`/clubs/${id}`)
    return data
  },
  
  // POST /clubs
  createClub: async (dto: CreateClubDto): Promise<Club> => {
    const { data } = await apiClient.post<Club>('/clubs', dto)
    return data
  },
  
  // PUT /clubs/:id
  updateClub: async (id: string, dto: Partial<Club>): Promise<Club> => {
    const { data } = await apiClient.put<Club>(`/clubs/${id}`, dto)
    return data
  },
  
  // DELETE /clubs/:id
  deleteClub: async (id: string): Promise<void> => {
    await apiClient.delete(`/clubs/${id}`)
  },
}
```

### React Query Hook (`use-clubs.ts`)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clubsApi } from '@/lib/api/clubs'
import { toast } from '@/hooks/use-toast'

// Query: Fetch clubs
export function useClubs() {
  return useQuery({
    queryKey: ['clubs'],
    queryFn: clubsApi.getClubs,
  })
}

// Query: Fetch single club
export function useClub(id: string) {
  return useQuery({
    queryKey: ['clubs', id],
    queryFn: () => clubsApi.getClub(id),
    enabled: !!id,
  })
}

// Mutation: Create club
export function useCreateClub() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: clubsApi.createClub,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs'] })
      toast({ title: 'Club created successfully' })
    },
    onError: () => {
      toast({ title: 'Failed to create club', variant: 'destructive' })
    },
  })
}
```

---

## 🔒 Type Safety

### Type Definitions (`types/index.ts`)

```typescript
// Core domain types
export interface Club {
  id: string
  name: string
  address: string
  owner_id: string
  created_at: string
  updated_at: string
}

export interface Drink {
  id: string
  club_id: string
  name: string
  price: number
  category: DrinkCategory
  available: boolean
}

export enum DrinkCategory {
  BEER = 'beer',
  COCKTAIL = 'cocktail',
  WINE = 'wine',
  SPIRITS = 'spirits',
  SOFT_DRINK = 'soft_drink',
}

export interface Order {
  id: string
  user_id: string
  club_id: string
  items: OrderItem[]
  total: number
  status: OrderStatus
  created_at: string
}

export enum OrderStatus {
  PENDING = 'pending',
  PREPARING = 'preparing',
  READY = 'ready',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

// DTOs (Data Transfer Objects)
export interface CreateClubDto {
  name: string
  address: string
}

export interface CreateOrderDto {
  club_id: string
  items: { drink_id: string; quantity: number }[]
}
```

### Component Props

```typescript
// Always type component props
interface ClubCardProps {
  club: Club
  onSelect?: (id: string) => void
  variant?: 'default' | 'compact'
}

export function ClubCard({ club, onSelect, variant = 'default' }: ClubCardProps) {
  // ...
}
```

---

## 🎨 Styling System

### Design Tokens (`lib/design-system/tokens.ts`)

```typescript
export const CLUBVERSE_BRAND = {
  purple: '#8B5CF6',
  pink: '#EC4899',
  gradient: {
    start: '#8B5CF6',
    end: '#EC4899',
  },
} as const

export const designTokens = {
  colors: {
    brand: {
      purple: CLUBVERSE_BRAND.purple,
      pink: CLUBVERSE_BRAND.pink,
      gradient: `linear-gradient(135deg, ${CLUBVERSE_BRAND.gradient.start} 0%, ${CLUBVERSE_BRAND.gradient.end} 100%)`,
    },
    semantic: {
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    full: '9999px',
  },
} as const
```

### CSS Variables (`app/globals.css`)

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 262 83% 58%;  /* Purple */
    --secondary: 330 81% 60%; /* Pink */
    /* ... */
  }
  
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* ... */
  }
}
```

### Tailwind Usage

```tsx
// ✅ GOOD: Use Tailwind utility classes
<div className="flex items-center gap-4 p-6 rounded-lg bg-card">
  <Avatar />
  <div className="flex-1">
    <h3 className="text-lg font-semibold">{club.name}</h3>
    <p className="text-sm text-muted-foreground">{club.address}</p>
  </div>
</div>

// ✅ GOOD: Use cn() for conditional classes
<Button className={cn(
  "w-full",
  isLoading && "opacity-50 cursor-not-allowed"
)}>
  Submit
</Button>
```

---

## ✅ Best Practices

### 1. Component Design

```tsx
// ✅ DO: Small, focused components
export function ClubCard({ club }: { club: Club }) {
  return (
    <Card>
      <ClubImage src={club.image} />
      <ClubInfo name={club.name} address={club.address} />
    </Card>
  )
}

// ❌ DON'T: Large, monolithic components
export function ClubCard({ club }: { club: Club }) {
  return (
    <Card>
      {/* 500 lines of JSX */}
    </Card>
  )
}
```

### 2. Data Fetching

```tsx
// ✅ DO: Use React Query hooks
export function ClubList() {
  const { data: clubs, isLoading } = useClubs()
  
  if (isLoading) return <LoadingSkeleton />
  
  return <div>{clubs.map(...)}</div>
}

// ❌ DON'T: Fetch in useEffect
export function ClubList() {
  const [clubs, setClubs] = useState([])
  
  useEffect(() => {
    fetch('/api/clubs').then(...)
  }, [])
  
  return <div>{clubs.map(...)}</div>
}
```

### 3. Error Handling

```tsx
// ✅ DO: Handle errors gracefully
export function ClubList() {
  const { data, isLoading, error } = useClubs()
  
  if (isLoading) return <LoadingSkeleton />
  if (error) return <ErrorState error={error} />
  if (!data?.length) return <EmptyState />
  
  return <div>{data.map(...)}</div>
}
```

### 4. Performance

```tsx
// ✅ DO: Memoize expensive computations
const sortedClubs = useMemo(
  () => clubs.sort((a, b) => a.name.localeCompare(b.name)),
  [clubs]
)

// ✅ DO: Memoize callbacks
const handleSelect = useCallback(
  (id: string) => navigate(`/clubs/${id}`),
  [navigate]
)

// ✅ DO: Use React.memo for pure components
export const ClubCard = React.memo(({ club }: ClubCardProps) => {
  // ...
})
```

### 5. Accessibility

```tsx
// ✅ DO: Add ARIA labels and semantic HTML
<button
  aria-label="Add to cart"
  onClick={handleAddToCart}
>
  <ShoppingCart />
</button>

<nav aria-label="Main navigation">
  <ul role="list">
    <li><a href="/clubs">Clubs</a></li>
  </ul>
</nav>
```

---

## 📝 File Naming Conventions

### Components

- **PascalCase** for component files: `ClubCard.tsx`, `DrinkList.tsx`
- **kebab-case** for non-component files: `use-clubs.ts`, `format-date.ts`

### Folders

- **kebab-case** for all folders: `club-owner`, `features`, `design-system`

### Files

```
✅ GOOD:
- ClubCard.tsx
- use-clubs.ts
- club-api.ts
- format-currency.ts

❌ BAD:
- clubCard.tsx
- useClubs.ts
- ClubAPI.ts
- formatCurrency.ts
```

---

## 🚀 Getting Started

### 1. Create a new feature

```bash
# 1. Add types
echo "export interface MyFeature { ... }" >> types/index.ts

# 2. Create API client
touch lib/api/my-feature.ts

# 3. Create React Query hooks
touch lib/queries/use-my-feature.ts

# 4. Create components
mkdir components/features/my-feature
touch components/features/my-feature/MyFeatureCard.tsx

# 5. Create page
mkdir app/(customer)/my-feature
touch app/(customer)/my-feature/page.tsx
```

### 2. Follow the layers

```
Types → API → Hooks → Components → Pages
```

### 3. Test as you build

```bash
# Run dev server
npm run dev

# Check types
npm run type-check

# Lint code
npm run lint
```

---

## 📚 Additional Resources

- [Next.js 15 Docs](https://nextjs.org/docs)
- [React Query Docs](https://tanstack.com/query/latest)
- [shadcn/ui Docs](https://ui.shadcn.com)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

---

## 🔄 Maintenance

### When to refactor

- Component > 200 lines → Split into smaller components
- Duplicated code → Extract to shared component/hook
- Complex logic → Move to custom hook or utility
- Hard to test → Improve separation of concerns

### Code review checklist

- [ ] Follows SOLID principles
- [ ] Proper TypeScript types
- [ ] No direct API calls in components
- [ ] Error handling implemented
- [ ] Loading states handled
- [ ] Responsive design
- [ ] Accessibility considered
- [ ] No console.log statements
- [ ] Follows naming conventions

---

**Last Updated**: 2025-11-07  
**Version**: 1.0.0  
**Maintainer**: Clubverse Team


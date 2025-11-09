# Role-Based Routing and Dashboards

## Overview
Clubverse now implements a complete role-based dashboard system with four distinct user types:

1. **Customer** - Browse clubs and place orders
2. **Club Owner** - Manage club, bartenders, drinks, and orders
3. **Bartender** - View and process orders
4. **Admin** - Manage entire platform

## User Roles

### Backend (UserRole enum)
```python
class UserRole(str, enum.Enum):
    CUSTOMER = "customer"
    CLUB_OWNER = "club_owner"
    BARTENDER = "bartender"
    ADMIN = "admin"
```

### Frontend (UserRole enum)
```typescript
export enum UserRole {
  CUSTOMER = 'customer',
  CLUB_OWNER = 'club_owner',
  BARTENDER = 'bartender',
  ADMIN = 'admin',
}
```

## Dashboard Routes

### Automatic Role-Based Redirects
After login/register, users are automatically redirected to their role-specific dashboard:

| Role | Dashboard Route | Features |
|------|----------------|----------|
| Customer | `/clubs` | Browse clubs, view menus, place orders |
| Club Owner | `/club` | Manage bartenders, drinks menu, view orders |
| Bartender | `/bartender` | View and prepare pending orders |
| Admin | `/admin` | Manage all clubs, users, and platform analytics |

## Dashboard Layouts

### Shared Components
All dashboards use the reusable `DashboardLayout` component located at:
```
components/layouts/dashboard-layout.tsx
```

**Features:**
- ✅ Responsive sidebar navigation
- ✅ Mobile hamburger menu
- ✅ User profile display with role badge
- ✅ Theme toggle
- ✅ Logout functionality
- ✅ Clean, modern nightlife-themed design
- ✅ Blur effects and smooth animations

### Club Owner Dashboard (`/club`)
**Navigation:**
- Dashboard - Overview stats (orders, bartenders, drinks, revenue)
- Bartenders - Manage staff
- Drinks - Manage menu
- Orders - View and track orders

**Directory:** `app/(club)/`

### Bartender Dashboard (`/bartender`)
**Navigation:**
- Dashboard - Pending orders overview
- Orders - View and prepare orders

**Directory:** `app/(bartender)/`

### Admin Dashboard (`/admin`)
**Navigation:**
- Dashboard - Platform-wide stats
- Clubs - Manage all clubs
- Users - Manage all users
- Orders - View all platform orders

**Directory:** `app/(admin)/`

### Customer Interface (`/clubs`)
**Features:**
- Browse all clubs
- View club menus
- Place orders
- Track order status

**Directory:** `app/(customer)/`

## Design System

### Nightlife Theme
- Dark/light mode support with dark as default
- Purple, pink, and cyan accent colors
- Blur effects and backdrop filters
- Smooth transitions and animations
- Clean, minimalist interface

### Responsive Design
- **Mobile:** Hamburger menu, stacked layout, optimized spacing
- **Desktop:** Sidebar navigation, multi-column grids, spacious layout
- **Breakpoints:** `lg:` for desktop (1024px+)

### Typography & Spacing
- Consistent spacing scale
- Clean, readable fonts
- Proper hierarchy with headings

## Authentication Flow

### Login/Register
```typescript
// Automatic redirect based on role
function getDashboardRoute(role: UserRole): string {
  switch (role) {
    case UserRole.CUSTOMER: return '/clubs'
    case UserRole.CLUB_OWNER: return '/club'
    case UserRole.BARTENDER: return '/bartender'
    case UserRole.ADMIN: return '/admin'
    default: return '/clubs'
  }
}
```

### Route Protection
Each dashboard layout checks the user's role and redirects unauthorized users to login:

```typescript
useEffect(() => {
  if (!isLoading && (!user || user.role !== UserRole.CLUB_OWNER)) {
    router.push('/login')
  }
}, [user, isLoading, router])
```

## Component Architecture

### Reusable Layout Pattern
```
┌─────────────────────────────────────┐
│  DashboardLayout (Reusable)        │
│  ├── Sidebar (Desktop)              │
│  ├── Mobile Menu                    │
│  ├── Header with Title              │
│  ├── User Profile Section           │
│  └── Main Content Area              │
└─────────────────────────────────────┘
```

### Role-Specific Layouts
```
app/
├── (club)/
│   ├── layout.tsx          # Club owner layout with nav
│   └── club/
│       ├── page.tsx        # Dashboard
│       ├── bartenders/     # Staff management
│       ├── drinks/         # Menu management
│       └── orders/         # Order tracking
├── (bartender)/
│   ├── layout.tsx          # Bartender layout
│   └── bartender/
│       └── page.tsx        # Orders queue
├── (admin)/
│   ├── layout.tsx          # Admin layout
│   └── admin/
│       └── page.tsx        # Platform overview
└── (customer)/
    ├── layout.tsx          # Customer layout
    └── clubs/
        └── page.tsx        # Club browsing
```

## Next Steps

### For Club Owner Dashboard
1. Implement bartender management (add/remove bartenders)
2. Build drinks menu CRUD operations
3. Connect orders to real-time updates
4. Add analytics and reporting

### For Bartender Dashboard
1. Real-time order notifications
2. Order status updates (preparing → ready)
3. Order history

### For Admin Dashboard
1. Club approval system
2. User management
3. Platform analytics
4. Payment/revenue tracking

### For Customer Interface
1. Club browsing with search/filters
2. Drink menu viewing
3. Cart and checkout
4. Order tracking

## Key Files

- `components/layouts/dashboard-layout.tsx` - Main reusable layout
- `lib/queries/use-auth.ts` - Role-based redirect logic
- `types/index.ts` - TypeScript types including UserRole
- `app/(role)/layout.tsx` - Role-specific layout wrappers
- `backend/app/models/user.py` - Backend UserRole enum


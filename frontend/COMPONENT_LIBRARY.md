# 🎨 Clubverse Component Library

> **Complete reusable component system** - Everything you need, fully reusable and accent-color aware

---

## 📦 Available Components

### UI Primitives (`components/ui/`)

#### Form Components

**Input** - Text input with error states and helper text
```tsx
<Input
  type="email"
  placeholder="you@example.com"
  error={!!errors.email}
  helperText={errors.email || "Enter your email"}
/>
```

**Textarea** - Multi-line text input
```tsx
<Textarea
  placeholder="Enter description..."
  rows={4}
  error={!!errors.description}
  helperText={errors.description}
/>
```

**Select** - Dropdown select
```tsx
<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

**Checkbox** - Checkbox input
```tsx
<Checkbox checked={checked} onCheckedChange={setChecked} />
```

**Switch** - Toggle switch
```tsx
<Switch checked={enabled} onCheckedChange={setEnabled} />
```

**Label** - Form label
```tsx
<Label htmlFor="email">Email</Label>
```

#### Button Components

**Button** - Primary action button
```tsx
<Button variant="default" size="lg">
  Submit
</Button>

// Variants: default, destructive, outline, secondary, ghost, link
// Sizes: sm, default, lg, icon
```

#### Layout Components

**Card** - Container card
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content</CardContent>
  <CardFooter>Footer</CardFooter>
</Card>
```

**Dialog** - Modal dialog
```tsx
<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    Content here
    <DialogFooter>
      <Button>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Tabs** - Tab navigation
```tsx
<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

**Separator** - Visual divider
```tsx
<Separator />
```

#### Data Display

**Table** - Data table
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Email</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John</TableCell>
      <TableCell>john@example.com</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

**Badge** - Status badge
```tsx
<Badge variant="default">Active</Badge>
// Variants: default, secondary, destructive, outline
```

**Avatar** - User avatar
```tsx
<Avatar>
  <AvatarImage src="/avatar.jpg" />
  <AvatarFallback>JD</AvatarFallback>
</Avatar>
```

**Alert** - Alert message
```tsx
<Alert variant="destructive">
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>Something went wrong</AlertDescription>
</Alert>
```

#### Navigation

**Dropdown Menu** - Context menu
```tsx
<DropdownMenu>
  <DropdownMenuTrigger>Open</DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Item 1</DropdownMenuItem>
    <DropdownMenuItem>Item 2</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Popover** - Popover tooltip
```tsx
<Popover>
  <PopoverTrigger>Hover</PopoverTrigger>
  <PopoverContent>Popover content</PopoverContent>
</Popover>
```

#### Loading States

**Skeleton** - Loading skeleton
```tsx
<Skeleton className="h-10 w-full" />
```

**Toast** - Toast notification
```tsx
import { toast } from '@/hooks/use-toast'

toast({
  title: "Success",
  description: "Operation completed",
})
```

---

### Common Components (`components/common/`)

#### Form Fields

**InputField** - Complete input with label and error handling
```tsx
<InputField
  label="Email"
  name="email"
  type="email"
  placeholder="you@example.com"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={errors.email}
  required
/>
```

**TextareaField** - Complete textarea with label
```tsx
<TextareaField
  label="Description"
  name="description"
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  rows={4}
/>
```

**SelectField** - Complete select with label
```tsx
<SelectField
  label="Category"
  name="category"
  options={[
    { value: 'beer', label: 'Beer' },
    { value: 'cocktail', label: 'Cocktail' },
  ]}
  value={category}
  onValueChange={setCategory}
/>
```

#### Loading States

**FormSkeleton** - Form loading state
```tsx
<FormSkeleton fields={3} />
```

**CardSkeleton** - Card loading state
```tsx
<CardSkeleton />
```

**TableSkeleton** - Table loading state
```tsx
<TableSkeleton rows={5} cols={4} />
```

**ListSkeleton** - List loading state
```tsx
<ListSkeleton items={3} />
```

#### Empty States

**EmptyState** - Empty state message
```tsx
<EmptyState
  title="No clubs found"
  description="Get started by creating your first club"
  icon={<ClubIcon />}
  action={{
    label: "Create Club",
    onClick: () => router.push('/clubs/new')
  }}
/>
```

---

### Typography (`components/typography/`)

**Heading** - Semantic headings
```tsx
<Heading level="h1">Welcome</Heading>
<Heading level="h2" as="h3">Subtitle</Heading>
// Levels: h1, h2, h3, h4, h5, h6
```

**Text** - Styled text
```tsx
<Text variant="muted" size="sm">Helper text</Text>
<Text variant="primary" weight="semibold">Bold primary</Text>
// Variants: default, muted, primary, secondary, destructive, success
// Sizes: xs, sm, base, lg, xl
// Weights: normal, medium, semibold, bold
```

---

## 🎨 Accent Color System

All components automatically use the **accent color** defined in `globals.css`:

- **Buttons** - Primary variant uses accent color
- **Inputs** - Focus ring uses accent color
- **Links** - Text color uses accent color
- **Checkboxes** - Checked state uses accent color
- **Switches** - Active state uses accent color
- **Tabs** - Active tab uses accent color
- **Badges** - Primary variant uses accent color

**To change accent color**: See `ACCENT_COLOR_GUIDE.md`

---

## 📝 Usage Examples

### Complete Form Example

```tsx
import { InputField } from '@/components/common/form-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})

  return (
    <Card>
      <CardHeader>
        <CardTitle>Login</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          <InputField
            label="Email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            required
          />
          
          <InputField
            label="Password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            required
          />
          
          <Button type="submit" className="w-full">
            Sign In
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

### Modal Example

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { InputField } from '@/components/common/form-field'

export function CreateClubModal({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Club</DialogTitle>
          <DialogDescription>
            Add a new club to your account
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <InputField
            label="Club Name"
            name="name"
            placeholder="Enter club name"
          />
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### Table Example

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export function ClubsTable({ clubs }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clubs.map((club) => (
          <TableRow key={club.id}>
            <TableCell>{club.name}</TableCell>
            <TableCell>
              <Badge variant={club.active ? 'default' : 'secondary'}>
                {club.active ? 'Active' : 'Inactive'}
              </Badge>
            </TableCell>
            <TableCell>
              <Button variant="ghost" size="sm">Edit</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

---

## ✅ Component Checklist

### ✅ Created Components

- [x] Input (with error states)
- [x] Textarea (with error states)
- [x] Select
- [x] Checkbox
- [x] Switch
- [x] Label
- [x] Button (all variants)
- [x] Card (all parts)
- [x] Dialog/Modal
- [x] Tabs
- [x] Table
- [x] Badge
- [x] Avatar
- [x] Alert
- [x] Dropdown Menu
- [x] Popover
- [x] Separator
- [x] Skeleton
- [x] Toast
- [x] Form (react-hook-form integration)
- [x] FormField (InputField, TextareaField, SelectField)
- [x] Loading Skeletons (Form, Card, Table, List)
- [x] EmptyState
- [x] Heading
- [x] Text

### 🎨 All Components Feature

- ✅ Accent color support
- ✅ Dark/light theme support
- ✅ Error states
- ✅ Loading states
- ✅ Accessibility (ARIA labels)
- ✅ Responsive design
- ✅ TypeScript types
- ✅ Consistent spacing
- ✅ Smooth transitions

---

## 🚀 Quick Start

1. **Import components**:
```tsx
import { Button } from '@/components/ui/button'
import { InputField } from '@/components/common/form-field'
import { Card } from '@/components/ui/card'
```

2. **Use with accent color**:
All components automatically use the accent color from `globals.css`

3. **Customize**:
All components accept `className` prop for custom styling

---

## 📚 Component Props

See individual component files for complete prop documentation:
- `components/ui/*.tsx` - UI primitives
- `components/common/*.tsx` - Common patterns
- `components/typography/*.tsx` - Text components

---

**Last Updated**: 2025-11-07  
**Total Components**: 30+ reusable components


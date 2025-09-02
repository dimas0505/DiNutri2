# DiNutri2 Design System

## Overview
A modern, comprehensive design system built on Tailwind CSS and Radix UI primitives, designed for the DiNutri2 nutrition management platform.

## Design Principles

### 1. **Modern & Clean**
- Subtle gradients and shadows for depth
- Rounded corners and smooth animations
- Clean typography with proper hierarchy

### 2. **Accessible**
- WCAG compliant color contrasts
- Proper focus states and keyboard navigation
- Screen reader friendly components

### 3. **Consistent**
- Unified spacing and sizing scale
- Consistent animation timing and easing
- Standardized component behaviors

### 4. **Mobile-First**
- Touch-friendly sizing (44px minimum)
- Responsive design patterns
- Progressive enhancement

## Color System

### Primary Colors
```css
--primary: hsl(217 91% 60%)
--primary-foreground: hsl(0 0% 98%)
--primary-hover: hsl(217 91% 55%)
--primary-active: hsl(217 91% 50%)
```

### Semantic Colors
```css
--success: hsl(142 76% 36%)
--warning: hsl(38 92% 50%)
--destructive: hsl(0 72.2% 50.6%)
```

### Neutral Colors
```css
--background: hsl(0 0% 100%)
--foreground: hsl(224 71.4% 4.1%)
--muted: hsl(220 14.3% 95.9%)
--muted-foreground: hsl(220 8.9% 46.1%)
```

### Gradients
- `gradient-primary`: Blue gradient for primary actions
- `gradient-accent`: Multi-color gradient for special elements
- `gradient-success`, `gradient-warning`, `gradient-destructive`: Semantic gradients

## Typography

### Font Stack
- **Primary**: Inter, ui-sans-serif, system-ui, sans-serif
- **Monospace**: ui-monospace, SF Mono, Consolas, monospace

### Hierarchy
- **Headings**: Bold font weights (700-900)
- **Body**: Medium font weight (500)
- **UI Elements**: Semibold font weight (600)
- **Captions**: Regular font weight (400)

## Components

### Buttons
```tsx
// Primary button with gradient
<Button>Primary Action</Button>

// Secondary button
<Button variant="secondary">Secondary</Button>

// Destructive action
<Button variant="destructive">Delete</Button>

// Success action
<Button variant="success">Save</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="xl">Extra Large</Button>
```

**Features:**
- Gradient backgrounds with hover effects
- Micro-animations (lift on hover, shadow enhancement)
- Multiple variants and sizes
- Focus states with ring indicators
- Disabled states with reduced opacity

### Cards
```tsx
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>
    Card content
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

**Features:**
- Backdrop blur and subtle transparency
- Hover lift animations
- Enhanced shadows (shadow-md to shadow-lg on hover)
- Rounded corners (rounded-xl)

### Inputs
```tsx
<Input placeholder="Enter text" />
<Input type="email" placeholder="email@example.com" />
```

**Features:**
- Larger touch targets (h-11)
- Smooth focus transitions
- Enhanced border radius (rounded-lg)
- Proper focus ring positioning

### Select Dropdowns
```tsx
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

**Features:**
- Backdrop blur content panel
- Enhanced shadows and rounded corners
- Smooth animations and transitions
- Hover states for better UX

### Badges
```tsx
<Badge>Default</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="destructive">Error</Badge>
<Badge size="lg">Large Badge</Badge>
```

**Features:**
- Multiple variants with semantic colors
- Size options (sm, default, lg)
- Hover effects with shadow enhancement
- Rounded design for modern appearance

### Loading States
```tsx
// Spinner component
<Spinner size="lg" />

// Complete loading state
<LoadingState text="Loading data..." />

// Pulse dots animation
<PulseDots />

// Skeleton components
<SkeletonCard />
<SkeletonButton />
```

### Empty States
```tsx
// Generic empty state
<EmptyState
  title="No data found"
  description="Get started by adding your first item"
  action={{ label: "Add Item", onClick: handleAdd }}
/>

// Specific variants
<NoDataEmptyState onAction={handleReload} />
<NoResultsEmptyState onAction={handleClearFilters} />
<ErrorEmptyState onAction={handleRetry} />
```

### Tables
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Email</TableHead>
      <TableHead>Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John Doe</TableCell>
      <TableCell>john@example.com</TableCell>
      <TableCell>
        <Button size="sm">Edit</Button>
      </TableCell>
    </TableRow>
  </TableBody>
</Table>
```

**Features:**
- Hover effects on rows
- Enhanced spacing and typography
- Border and shadow styling
- Responsive overflow handling

## Animations

### Keyframes
- `fade-in`: Simple opacity transition
- `slide-up`: Slide in from bottom with fade
- `scale-in`: Scale animation with fade
- `bounce-in`: Playful bounce entrance

### Timing
- **Fast**: 150ms - Micro-interactions
- **Default**: 200ms - Standard transitions
- **Slow**: 300ms - Complex animations
- **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)` for natural motion

## Spacing Scale

### Touch Targets
- **Minimum**: 44px for touch-friendly interactions
- **Buttons**: h-11 (44px) default height
- **Inputs**: h-11 (44px) for consistency

### Padding Scale
- **xs**: 0.5rem (8px)
- **sm**: 0.75rem (12px)
- **md**: 1rem (16px)
- **lg**: 1.5rem (24px)
- **xl**: 2rem (32px)

## Shadow System

### Elevation Levels
- **xs**: `0 1px 2px 0 rgb(0 0 0 / 0.05)` - Subtle elevation
- **sm**: `0 1px 3px 0 rgb(0 0 0 / 0.1)` - Small components
- **md**: `0 10px 15px -3px rgb(0 0 0 / 0.1)` - Cards and modals
- **lg**: `0 20px 25px -5px rgb(0 0 0 / 0.1)` - Floating elements
- **xl**: `0 25px 50px -12px rgb(0 0 0 / 0.25)` - Overlays
- **2xl**: `0 50px 100px -20px rgb(0 0 0 / 0.25)` - High elevation

## Border Radius

### Scale
- **sm**: 0.5rem (8px)
- **md**: 0.75rem (12px) - Default for most components
- **lg**: 1rem (16px) - Cards and larger elements
- **xl**: 1.5rem (24px) - Special elements

## Dark Mode Support

The design system includes comprehensive dark mode support with:
- Automatic color token adjustments
- Consistent contrast ratios
- Proper focus and hover states
- Maintained visual hierarchy

## Usage Guidelines

### Do's
✅ Use consistent spacing from the scale
✅ Implement proper focus states
✅ Follow the animation timing guidelines
✅ Maintain color contrast requirements
✅ Use semantic color variants appropriately

### Don'ts
❌ Override core design tokens without reason
❌ Use custom shadows outside the system
❌ Ignore mobile touch targets
❌ Skip hover/focus states
❌ Use inconsistent border radius values

## Browser Support

- **Modern browsers**: Full support with all features
- **Progressive enhancement**: Graceful degradation for older browsers
- **Mobile optimization**: Touch-friendly interactions and responsive design

---

This design system provides a solid foundation for building consistent, accessible, and beautiful user interfaces across the DiNutri2 platform.
# ConnectAI Theming Guide

This guide shows how to use the centralized theme system to avoid magic numbers and maintain consistency.

## Overview

The theme is configured in `/src/theme.ts` and provides:
- **Color palette** (brand green + neutral grays)
- **Spacing scale** (xs, sm, md, lg, xl)
- **Border radius scale**
- **Typography** (headings, font families)
- **Design tokens** (heights, widths, z-index, transitions, shadows)

## Using Colors

### In Mantine Components (Recommended)

```tsx
import { Button, Text, Box } from '@mantine/core';

// Use the primary brand color
<Button color="brand">Click me</Button>

// Use color shades (0-9)
<Text c="brand.6">Brand text</Text>  // Main brand color
<Text c="brand.8">Darker brand</Text>

// Neutral grays
<Box bg="neutral.1" c="neutral.7">
  Content with gray background
</Box>

// Semantic colors from Mantine
<Button color="red">Delete</Button>
<Text c="dimmed">Secondary text</Text>
```

### Using Color Constants

```tsx
import { colors } from '../theme';

// In inline styles (avoid if possible, prefer Mantine props)
<div style={{ backgroundColor: colors.brand[600] }}>
  Content
</div>

// Available:
// colors.brand.50 through colors.brand.900
// colors.neutral.50 through colors.neutral.900
```

## Using Spacing

### In Mantine Components

```tsx
import { Box, Stack, Group } from '@mantine/core';

// Padding
<Box p="md">Medium padding (16px)</Box>
<Box px="lg" py="sm">Horizontal lg, vertical sm</Box>

// Margin
<Box m="xl">Extra large margin (32px)</Box>
<Box mt="md" mb="lg">Top md, bottom lg</Box>

// Gaps in flex containers
<Stack gap="md">...</Stack>
<Group gap="sm">...</Group>

// Available: xs, sm, md, lg, xl
// xs: 8px, sm: 12px, md: 16px, lg: 24px, xl: 32px
```

### Using Spacing Tokens

```tsx
import { theme } from '../theme';

// Access spacing values directly (for calculations)
const spacing = theme.spacing; // { xs: '0.5rem', sm: '0.75rem', ... }
```

## Using Design Tokens

```tsx
import { tokens } from '../theme';

// Heights
<Box h={tokens.heights.navbar}>Navbar height</Box>

// Widths
<Box w={tokens.widths.sidebar}>Sidebar width</Box>

// Z-index
<Box style={{ zIndex: tokens.zIndex.modal }}>Modal</Box>

// Transitions
<Box style={{ transition: `all ${tokens.transitions.base}ms` }}>
  Animated content
</Box>

// Shadows
<Box style={{ boxShadow: tokens.shadows.md }}>Card</Box>
```

## Typography

### Using Headings

```tsx
import { Title, Text } from '@mantine/core';

<Title order={1}>H1 Heading</Title>  // 2rem, bold
<Title order={2}>H2 Heading</Title>  // 1.5rem, bold
<Title order={3}>H3 Heading</Title>  // 1.25rem, bold

// Text sizes
<Text size="xl">Extra large text</Text>
<Text size="lg">Large text</Text>
<Text size="md">Medium text (default)</Text>
<Text size="sm">Small text</Text>
<Text size="xs">Extra small text</Text>
```

## Border Radius

```tsx
import { Box, Button } from '@mantine/core';

<Button radius="md">Rounded button</Button>
<Box style={{ borderRadius: 'var(--mantine-radius-lg)' }}>
  Custom box
</Box>

// Available: xs (2px), sm (4px), md (8px), lg (12px), xl (16px)
```

## Responsive Design

```tsx
import { Box } from '@mantine/core';

// Use breakpoints from theme
<Box
  style={{
    width: '100%',
    '@media (min-width: 62em)': {  // md breakpoint
      width: '50%',
    },
  }}
>
  Responsive content
</Box>

// Or use Mantine's responsive props
<Box
  w={{ base: '100%', md: '50%' }}
  p={{ base: 'sm', md: 'lg' }}
>
  Responsive box
</Box>

// Breakpoints: xs (576px), sm (768px), md (992px), lg (1200px), xl (1408px)
```

## Examples

### Card Component

```tsx
import { Box, Title, Text } from '@mantine/core';

function Card() {
  return (
    <Box
      p="lg"
      bg="white"
      style={{
        borderRadius: 'var(--mantine-radius-md)',
        boxShadow: 'var(--mantine-shadow-sm)',
      }}
    >
      <Title order={3} mb="sm">Card Title</Title>
      <Text c="neutral.7">Card content with proper spacing</Text>
    </Box>
  );
}
```

### Button with Brand Color

```tsx
import { Button } from '@mantine/core';

function BrandButton() {
  return (
    <Button
      color="brand"
      size="md"
      radius="md"
    >
      Brand Action
    </Button>
  );
}
```

### Layout with Tokens

```tsx
import { Box } from '@mantine/core';
import { tokens } from '../theme';

function Layout() {
  return (
    <Box>
      <Box
        component="nav"
        h={tokens.heights.navbar}
        bg="white"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: tokens.zIndex.sticky,
          boxShadow: tokens.shadows.sm,
        }}
      >
        Navbar
      </Box>
      <Box
        component="aside"
        w={tokens.widths.sidebar}
        style={{
          position: 'fixed',
          top: tokens.heights.navbar,
          left: 0,
          bottom: 0,
        }}
      >
        Sidebar
      </Box>
    </Box>
  );
}
```

## Best Practices

1. **Always use theme values** - Never hardcode colors, spacing, or other design values
2. **Prefer Mantine props** - Use `p`, `m`, `c`, `bg`, etc. over inline styles when possible
3. **Use semantic colors** - Use `brand` for primary actions, `neutral` for backgrounds/text
4. **Be consistent** - Stick to the spacing scale (xs, sm, md, lg, xl)
5. **Use tokens for layout** - Heights, widths, z-index values should come from tokens
6. **Document exceptions** - If you must use a magic number, add a comment explaining why

## Anti-Patterns (Avoid These)

```tsx
// ❌ DON'T: Magic numbers
<Box style={{ padding: '17px', color: '#2BDD66' }}>

// ✅ DO: Use theme values
<Box p="md" c="brand.6">

// ❌ DON'T: Hardcoded colors
<Button style={{ backgroundColor: '#00973c' }}>

// ✅ DO: Use color prop
<Button color="brand">

// ❌ DON'T: Random spacing
<Box style={{ marginTop: '23px', marginBottom: '31px' }}>

// ✅ DO: Use spacing scale
<Box mt="lg" mb="xl">
```

## Adding New Colors

If you need additional colors beyond brand and neutral:

1. Generate the color scale at https://mantine.dev/colors-generator/
2. Add to `/src/theme.ts`:

```ts
const myColor: MantineColorsTuple = [
  // ... 10 shades from generator
];

export const theme = createTheme({
  colors: {
    brand: brandGreen,
    neutral: neutral,
    myColor: myColor,  // Add here
  },
});
```

3. Use it: `<Button color="myColor">Click</Button>`

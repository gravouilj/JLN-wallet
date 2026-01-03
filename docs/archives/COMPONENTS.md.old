# Component Documentation

## Overview

Farm Wallet uses **custom atomic components** without any UI framework (no Tailwind, no Shadcn, no Bootstrap).

All components are built with pure CSS variables defined in `src/styles/themes.css`.

## Atomic Components (`src/components/UI.jsx`)

### Card

Container component with consistent styling.

```jsx
import { Card, CardContent } from './components/UI';

<Card>
  <CardContent>
    <h2>Balance</h2>
    <p>1000 XEC</p>
  </CardContent>
</Card>
```

**Props:**
- `children` - Card content
- `className` - Additional CSS classes
- `onClick` - Click handler (makes card interactive)

**CSS Classes:**
- `.card` - Main card container
- `.card-content` - Inner content wrapper

---

### Button

Reusable button with variants.

```jsx
import { Button } from './components/UI';

<Button variant="primary" onClick={handleClick}>
  Send
</Button>

<Button variant="secondary" disabled>
  Loading...
</Button>
```

**Props:**
- `variant` - `"primary"` | `"secondary"` | `"danger"` (default: `"primary"`)
- `children` - Button text/content
- `onClick` - Click handler
- `disabled` - Disable button
- `type` - HTML button type (`"button"` | `"submit"`)
- `className` - Additional CSS classes

**Variants:**
- `primary` - Blue accent color (main actions)
- `secondary` - Gray color (secondary actions)
- `danger` - Red color (destructive actions)

**CSS Classes:**
- `.button` - Base button styles
- `.button-primary` - Primary variant
- `.button-secondary` - Secondary variant
- `.button-danger` - Danger variant

---

### Stack

Flexbox layout container for spacing elements.

```jsx
import { Stack } from './components/UI';

<Stack direction="column" gap="1rem">
  <Button>Action 1</Button>
  <Button>Action 2</Button>
</Stack>

<Stack direction="row" gap="0.5rem" align="center">
  <span>Price:</span>
  <strong>$0.00003</strong>
</Stack>
```

**Props:**
- `direction` - `"row"` | `"column"` (default: `"column"`)
- `gap` - CSS gap value (default: `"1rem"`)
- `align` - `align-items` CSS property
- `justify` - `justify-content` CSS property
- `className` - Additional CSS classes
- `children` - Stack content

**CSS Class:**
- `.stack` - Flexbox container with configurable direction/gap

---

## Layout Components

### TopBar (`src/components/Layout/TopBar.jsx`)

Top navigation bar with logo and settings.

```jsx
import TopBar from './components/Layout/TopBar';

<TopBar />
```

**Features:**
- Logo display
- Settings button (navigates to `/settings`)
- Responsive mobile layout
- Dark mode compatible

---

### BottomNavigation (`src/components/Layout/BottomNavigation.jsx`)

Bottom navigation for mobile devices.

```jsx
import BottomNavigation from './components/Layout/BottomNavigation';

<BottomNavigation />
```

**Navigation items:**
- Home (`/wallet`)
- Send (`/send`)
- Directory (`/`)
- Favorites (`/favorites`)

**Features:**
- Active state highlighting
- Icons for each section
- Fixed bottom position on mobile
- Hidden on desktop (>768px)

---

### MobileLayout (`src/components/Layout/MobileLayout.jsx`)

Container layout for mobile-first design.

```jsx
import MobileLayout from './components/Layout/MobileLayout';

<MobileLayout>
  <YourContent />
</MobileLayout>
```

**Features:**
- Combines TopBar + content + BottomNavigation
- Responsive padding
- Scroll container
- Safe area handling

---

## Feature Components

### ECashWallet (`src/components/ECashWallet.jsx`)

Wallet connection component.

**Features:**
- Mnemonic input
- Wallet initialization
- Persistent storage
- Loading states

---

### SendXEC (`src/components/SendXEC.jsx`)

XEC transaction component.

**Features:**
- Address validation
- Amount input with validation
- Balance display (sendable amount)
- Dust prevention (6 XEC minimum)
- QR scanner integration

---

### TokenSend (`src/components/TokenSend.jsx`)

Token transaction component.

**Features:**
- Token selection
- Address validation with real-time feedback (✓/❌)
- Amount input with comma→dot conversion
- Balance display
- Form extracted to `TokenSendForm` subcomponent

**Related:**
- `TokenSendForm.jsx` - Reusable form component with validation

---

### QrCodeScanner (`src/components/QrCodeScanner.jsx`)

QR code scanner for receiving addresses.

**Features:**
- Camera access with permissions handling
- QR code detection
- Address validation
- Modal UI with backdrop

---

### ChronikConnectionIndicator (`src/components/ChronikConnectionIndicator.jsx`)

Real-time WebSocket connection status indicator.

**Features:**
- Visual dot indicator (🟢 connected / 🔴 disconnected)
- Auto-hide when connected (clean UI)
- Error messages display
- Reconnection attempt counter
- Pulsating animation

**States:**
- Connected - Green, auto-hidden
- Disconnected - Red, visible with error message
- Reconnecting - Shows attempt count

---

## Utility Components

### Notification (`src/components/Notification.jsx`)

Toast notification system.

```jsx
import { useSetAtom } from 'jotai';
import { notificationAtom } from './atoms';

const setNotification = useSetAtom(notificationAtom);

setNotification({
  type: 'success', // 'success' | 'error' | 'info' | 'warning'
  message: 'Transaction sent successfully!'
});
```

**Features:**
- Auto-dismiss after 5 seconds
- Multiple notification types
- Smooth animations
- Stacked notifications

---

### LoadingScreen (`src/components/LoadingScreen.jsx`)

Full-screen loading indicator.

```jsx
import LoadingScreen from './components/LoadingScreen';

<LoadingScreen />
```

**Use cases:**
- Wallet initialization
- Blockchain data fetching
- Route transitions

---

### ErrorBoundary (`src/components/ErrorBoundary.jsx`)

React error boundary for graceful error handling.

```jsx
import ErrorBoundary from './components/ErrorBoundary';

<ErrorBoundary>
  <YourApp />
</ErrorBoundary>
```

**Features:**
- Catches React component errors
- Displays user-friendly error message
- Logs errors to console
- Prevents full app crash

---

## Styling Guidelines

### CSS Variables

All components use CSS variables from `src/styles/themes.css`:

```css
/* Light mode */
--bg-primary: #ffffff;
--text-primary: #000000;
--accent-primary: #0074e4;

/* Dark mode */
[data-theme="dark"] {
  --bg-primary: #1a1a1a;
  --text-primary: #ffffff;
  --accent-primary: #3b9dff;
}
```

### Responsive Design

Use mobile-first approach with CSS media queries:

```css
/* Mobile first (default) */
.component {
  padding: 1rem;
}

/* Tablet and up */
@media (min-width: 768px) {
  .component {
    padding: 2rem;
  }
}
```

**Breakpoints:**
- `400px` - Very small mobile
- `600px` - Mobile
- `640px` - Small tablet
- `768px` - Tablet

---

## Best Practices

### ✅ DO

```jsx
// Use atomic components
import { Card, Button, Stack } from './components/UI';

<Card>
  <Stack direction="column" gap="1rem">
    <Button variant="primary">Action</Button>
  </Stack>
</Card>

// Use CSS variables
.custom-component {
  background: var(--bg-secondary);
  color: var(--text-primary);
}
```

### ❌ DON'T

```jsx
// Don't use inline styles for colors
<div style={{ background: '#ffffff' }}>...</div>

// Don't use Tailwind classes
<div className="bg-blue-500 p-4">...</div>

// Don't hardcode breakpoints
<div style={{ width: window.innerWidth > 768 ? '50%' : '100%' }}>
```

---

## Testing Components

Use Playwright for E2E component testing:

```javascript
// tests/component-name.spec.js
import { test, expect } from '@playwright/test';

test('should display button with correct text', async ({ page }) => {
  await page.goto('/');
  
  await expect(page.locator('button:has-text("Send")')).toBeVisible();
});
```

See `tests/README.md` for complete testing guide.

---

## Adding New Components

1. **Create component file:**
```jsx
// src/components/MyComponent.jsx
import { Card, Button } from './UI';
import '../styles/my-component.css';

export const MyComponent = ({ title, onAction }) => {
  return (
    <Card>
      <h2>{title}</h2>
      <Button variant="primary" onClick={onAction}>
        Action
      </Button>
    </Card>
  );
};
```

2. **Create CSS file:**
```css
/* src/styles/my-component.css */
.my-component-title {
  color: var(--text-primary);
  font-size: 1.5rem;
}
```

3. **Add tests:**
```javascript
// tests/my-component.spec.js
test('MyComponent renders correctly', async ({ page }) => {
  // ... test implementation
});
```

---

## Resources

- [CSS Variables Reference](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [Flexbox Guide](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)
- [React Component Patterns](https://react.dev/learn/passing-props-to-a-component)
- [Playwright Testing](https://playwright.dev/)

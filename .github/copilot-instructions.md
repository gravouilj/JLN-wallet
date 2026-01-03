# JLN Wallet - AI Coding Agent Instructions

> **Last Updated**: January 2, 2026  
> **Version**: 2.0.0-secure  
> **Status**: ✅ Production-Ready (8.2/10)

## Project Overview

eCash (XEC) wallet for managing profiles and P2P tokens. Built with **React 19 + TypeScript + Vite** with **zero UI frameworks** (no Tailwind, no Shadcn, no Bootstrap). Custom CSS architecture with CSS variables for theming.

### Tech Stack
- **Frontend**: React 19.1 + TypeScript
- **Build**: Vite 6.4
- **State**: Jotai (atomic state management)
- **Blockchain**: chronik-client + ecash-lib
- **Backend**: Supabase (profiles, tickets)
- **i18n**: i18next (FR, EN, DE, ES, IT, PT)
- **Tests**: Playwright (235 E2E tests)

## Critical Architecture Decisions

### 1. CSS Custom Architecture (REQUIRED)
- **NEVER import/suggest UI frameworks** (Tailwind, Shadcn, Bootstrap, Material-UI, etc.)
- All UI components in [`src/components/UI/`](src/components/UI/) - reuse existing components:
  - `Card`, `Button`, `Input`, `Stack`, `Badge`, `Modal`, `Tabs`, `Accordion`
- Design tokens in [`src/styles/themes.css`](src/styles/themes.css):
  ```css
  var(--primary)          /* #0074e4 - eCash blue */
  var(--bg-primary)       /* Background */
  var(--text-primary)     /* Text color */
  var(--spacing-md)       /* 1rem = 16px */
  ```
- Mobile-first breakpoints: 400px, 600px, 640px, 768px
- See [`docs/CONFORMITE_CAHIER_DES_CHARGES.md`](docs/CONFORMITE_CAHIER_DES_CHARGES.md)

### 2. State Management (Jotai)
- All atoms in [`src/atoms.ts`](src/atoms.ts) with `atomWithStorage` for persistence
- Key atoms:
  | Atom | Type | Description |
  |------|------|-------------|
  | `walletAtom` | `EcashWallet \| null` | Wallet instance |
  | `mnemonicAtom` | `string \| null` | Mnemonic (in-memory only!) |
  | `balanceAtom` | `number` | XEC balance |
  | `selectedProfileAtom` | `ProfileData \| null` | Selected profile |
  | `themeAtom` | `string` | 'light' or 'dark' |
  | `localeAtom` | `string` | Language code |
- Custom hooks in [`src/hooks/`](src/hooks/) wrap atom operations

### 3. Blockchain Stack
- **EcashWallet class** ([`src/services/ecashWallet.ts`](src/services/ecashWallet.ts)) - 800 lines
  - Uses `chronik-client` for blockchain queries (UTXOs, token info)
  - Uses `ecash-lib` for transaction building/signing (ALP tokens)
  - HD derivation: `m/44'/1899'/0'/0/0` (Cashtab standard)
  - Key methods:
    ```typescript
    getBalance()                          // Returns WalletBalance
    getTokenBalance(tokenId)              // Returns TokenBalance
    sendXec(toAddress, amountXec)         // Send XEC
    sendToken(tokenId, to, amount, dec)   // Send tokens
    mintToken(tokenId, amount, dec)       // Mint (variable supply)
    burnToken(tokenId, amount, dec)       // Burn tokens
    airdrop(tokenId, totalXec, holders)   // Airdrop XEC
    ```
- **Real-time updates** via Chronik WebSocket ([`src/hooks/useChronikWebSocket.ts`](src/hooks/useChronikWebSocket.ts))
  - Auto-subscribes to wallet address
  - Triggers balance refresh on new transactions
  - Handles blockchain reorgs
- **Configuration** in [`src/config/constants.ts`](src/config/constants.ts)

### 4. Profile System
- Profiles stored in Supabase (`profiles` table)
- Each profile linked to a `tokenId`
- Service: [`src/services/profilService.ts`](src/services/profilService.ts)
- Status flow: `none` → `pending` → `verified` / `info_requested`

### 5. Custom Hooks (20+)
Located in [`src/hooks/`](src/hooks/) - always prefer hooks over direct service calls:
| Hook | Purpose |
|------|---------|
| `useEcashWallet` | Wallet instance, address, connection |
| `useEcashBalance` | Balance with auto-refresh |
| `useSendToken` | Token send with validation |
| `useMintToken` | Token minting logic |
| `useBurnToken` | Token burning logic |
| `useAirdropToken` | Airdrop distribution |
| `useChronikWebSocket` | Real-time blockchain events |
| `useAdmin` | Admin permission checks |
| `useAddressBook` | Contact management |
| `useNetworkFees` | Fee estimation |

## Development Workflow

### Commands
```bash
npm run dev           # Dev server (Vite) - http://localhost:5173
npm run build         # Production build (~4.4s)
npm run lint          # ESLint check
npm run lint:fix      # Auto-fix linting issues
npm test              # Playwright E2E tests (235 tests)
npm run test:ui       # Playwright interactive mode
```

### Key Files Structure
```
src/
├── App.tsx              # Routes, auth guards
├── atoms.ts             # Jotai state (all atoms)
├── main.tsx             # React bootstrap
│
├── components/
│   ├── UI/              # Atomic components (Button, Card, Input, etc.)
│   ├── Admin/           # Admin dashboard components
│   ├── Client/          # Client forms (tickets)
│   ├── eCash/           # Blockchain UI (TokenActions/, WalletDetails)
│   ├── Layout/          # TopBar, BottomNav, MobileLayout
│   ├── TokenPage/       # Token display components
│   └── AddressBook/     # Contact management
│
├── hooks/               # 20+ custom hooks
│   ├── index.ts         # Central exports
│   ├── useEcashWallet.ts
│   ├── useSendToken.ts
│   └── ...
│
├── services/            # Business logic
│   ├── ecashWallet.ts   # 🔑 CORE blockchain logic (800 lines)
│   ├── profilService.ts # Profile CRUD
│   ├── adminService.ts  # Admin operations
│   └── supabaseClient.ts
│
├── pages/               # Route pages
│   ├── DirectoryPage.tsx    # Home (/)
│   ├── ClientWalletPage.tsx # Wallet (/wallet)
│   ├── TokenPage.tsx        # Token details (/token/:id)
│   └── AdminDashboard.tsx   # Admin (lazy loaded)
│
├── styles/              # Pure CSS
│   ├── themes.css       # 🎨 Design tokens
│   ├── layout.css       # Layout structure
│   ├── components.css   # Component styles
│   └── utilities.css    # Utility classes
│
├── types/
│   └── index.ts         # TypeScript definitions
│
└── config/
    └── constants.ts     # App configuration (URLs, keys)
```

### Testing (Playwright)
- Config: [`playwright.config.js`](playwright.config.js)
- Tests in [`tests/`](tests/) directory
- 235 E2E tests, 100% passing
- Auto-launches dev server

## Code Patterns

### Component Structure
```tsx
// ✅ CORRECT - Use existing UI components
import { Card, Button, Stack, Input } from '../components/UI';
import { useTranslation } from 'react-i18next';

interface MyComponentProps {
  tokenId: string;
}

export const MyComponent: React.FC<MyComponentProps> = ({ tokenId }) => {
  const { t } = useTranslation();
  
  return (
    <Card>
      <Stack spacing="md">
        <Input label={t('form.amount')} />
        <Button variant="primary">{t('actions.send')}</Button>
      </Stack>
    </Card>
  );
};

// ❌ WRONG - Don't import UI frameworks
import { Button } from '@shadcn/ui'; // FORBIDDEN
```

### Token Actions Pattern
Token actions (Send/Airdrop/Mint/Burn/Message) in [`src/components/eCash/TokenActions/`](src/components/eCash/TokenActions/):
- Each action = separate component with props from parent
- Use `<ActionFeeEstimate actionType="..." />` for fee calculation
- Use corresponding hooks: `useSendToken`, `useMintToken`, `useBurnToken`, `useAirdropToken`

```tsx
// Example: Using a token action hook
import { useSendToken } from '../hooks';

const { sendToken, loading, error } = useSendToken();

const handleSend = async () => {
  const result = await sendToken(tokenId, toAddress, amount, decimals);
  // Notifications and refresh handled automatically
};
```

### Styling
```tsx
// ✅ CORRECT - CSS variables
<div style={{ color: 'var(--text-primary)', padding: 'var(--spacing-md)' }}>

// ✅ CORRECT - Utility classes from styles/
<div className="flex-column gap-md">

// ❌ WRONG - Framework classes
<div className="flex flex-col gap-4"> // Tailwind syntax - FORBIDDEN
```

### State Access
```typescript
// ✅ CORRECT - Use custom hooks (PREFERRED)
import { useEcashWallet, useEcashBalance } from '../hooks';
const { wallet, address } = useEcashWallet();
const { balance, refreshBalance } = useEcashBalance();

// ✅ OK - Direct atom access when needed
import { useAtomValue, useSetAtom } from 'jotai';
import { themeAtom, localeAtom } from '../atoms';
const theme = useAtomValue(themeAtom);
```

### Blockchain Operations
```typescript
// ✅ CORRECT - Use hooks for transactions
import { useSendToken, useMintToken } from '../hooks';

const { sendToken, loading } = useSendToken();
await sendToken(tokenId, toAddress, amount, decimals);

// ✅ CORRECT - Direct wallet access for reading
import { useEcashWallet } from '../hooks';
const { wallet } = useEcashWallet();
const tokenInfo = await wallet?.getTokenInfo(tokenId);
```

## Internationalization (i18next)
- Config: [`src/i18n/index.ts`](src/i18n/index.ts)
- Translations: [`src/i18n/locales/`](src/i18n/locales/) (fr, en, de, es, it, pt)
- Usage: `const { t } = useTranslation(); <p>{t('wallet.balance')}</p>`

## Supabase Integration
- Client: [`src/services/supabaseClient.ts`](src/services/supabaseClient.ts)
- Tables: `profiles`, `tickets`, `activity_history`
- Schema: [`docs/SUPABASE_SCHEMA.md`](docs/SUPABASE_SCHEMA.md)
- Always handle errors gracefully (network may be unavailable)

## Common Pitfalls
1. **DO NOT** add Tailwind/Shadcn dependencies - this is a hard requirement
2. **DO NOT** use inline Tailwind classes - use CSS variables or custom classes
3. **ALWAYS** check if a UI component exists in `src/components/UI/` before creating new ones
4. **REMEMBER** breakpoints are max-width (mobile-first), not min-width
5. **VERIFY** Node.js polyfills in vite.config.js if adding crypto dependencies
6. **TEST** with `npm test` - E2E tests cover critical flows
7. **USE HOOKS** - prefer custom hooks over direct atom/service access

## Documentation Quick Links
- **Start here:** [`QUICK_START.md`](QUICK_START.md)
- **Current state:** [`PROJECT_STATUS.md`](PROJECT_STATUS.md)
- **Architecture:** [`docs/WALLET_ARCHITECTURE.md`](docs/WALLET_ARCHITECTURE.md)
- **CSS System:** [`docs/CONFORMITE_CAHIER_DES_CHARGES.md`](docs/CONFORMITE_CAHIER_DES_CHARGES.md)
- **Components:** [`docs/COMPONENTS.md`](docs/COMPONENTS.md)
- **Testing:** [`tests/README.md`](tests/README.md)

## Questions to Ask Before Implementing
1. Does this require a new UI component, or can I use/extend existing ones in `src/components/UI/`?
2. Is there already a hook for this operation in `src/hooks/`?
3. Does this need blockchain interaction? (Use EcashWallet methods via hooks)
4. Should this be responsive? (Check breakpoints in themes.css)
5. Is this user-facing text? (Needs i18n translation in all locales)

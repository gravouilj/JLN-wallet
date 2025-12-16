# JLN Wallet - AI Coding Agent Instructions

## Project Overview
eCash (XEC) wallet for managing profiles and P2P tokens. Pure React 19 + Vite app with **zero UI frameworks** (no Tailwind, no Shadcn, no Bootstrap). Custom CSS architecture with CSS variables for theming.

## Critical Architecture Decisions

### 1. CSS Custom Architecture (REQUIRED)
- **NEVER import/suggest UI frameworks** (Tailwind, Shadcn, Bootstrap, Material-UI, etc.)
- All UI components in [`src/components/UI.jsx`](src/components/UI.jsx) - reuse existing `<Card>`, `<Button>`, `<Input>`, `<Stack>`, etc.
- Design system in [`src/styles/themes.css`](src/styles/themes.css) - use CSS variables like `var(--primary)`, `var(--bg-primary)`
- Mobile-first breakpoints: 400px, 600px, 640px, 768px
- See [`docs/CONFORMITE_CAHIER_DES_CHARGES.md`](docs/CONFORMITE_CAHIER_DES_CHARGES.md) for complete CSS spec

### 2. State Management (Jotai)
- All atoms in [`src/atoms.js`](src/atoms.js) with `atomWithStorage` for persistence
- Key atoms: `walletAtom`, `selectedProfileAtom`, `localeAtom`, `currentTokenIdAtom`
- Custom hooks in [`src/hooks/`](src/hooks/) wrap atom operations

### 3. Blockchain Stack
- **EcashWallet service** ([`src/services/ecashWallet.js`](src/services/ecashWallet.js)) - core wallet logic
  - Uses `chronik-client` for blockchain queries
  - Uses `ecash-lib` for transaction building/signing
  - HD derivation path: `m/44'/1899'/0'/0/0` (Cashtab standard)
- **Real-time updates** via Chronik WebSocket ([`src/hooks/useChronikWebSocket.js`](src/hooks/useChronikWebSocket.js))
  - Subscribes to wallet address on mount
  - Auto-refreshes balance on new transactions
  - See [`docs/CHRONIK_WEBSOCKET.md`](docs/CHRONIK_WEBSOCKET.md)

### 4. Profile System (Multi-Token)
- Profiles stored in Supabase (`profiles` table)
- Each profile has a `tokenId` for filtering tokens
- Selected profile persists in localStorage via `selectedProfileAtom`
- Profile service: [`src/services/profilService.js`](src/services/profilService.js)

## Development Workflow

### Commands
```bash
npm run dev           # Dev server (Vite) - http://localhost:5173
npm run build         # Production build
npm run lint          # ESLint check
npm run lint:fix      # Auto-fix linting issues
npm test              # Playwright E2E tests
npm run test:ui       # Playwright interactive mode
```

### Testing (Playwright)
- Config: [`playwright.config.js`](playwright.config.js)
- Tests in [`tests/`](tests/) directory
- Auto-launches dev server
- See [`tests/README.md`](tests/README.md) for details

### Key Files to Check Before Editing
- [`PROJECT_STATUS.md`](PROJECT_STATUS.md) - Current state & known issues
- [`PRIORITIES.md`](PRIORITIES.md) - Task priorities
- [`docs/WALLET_ARCHITECTURE.md`](docs/WALLET_ARCHITECTURE.md) - Blockchain integration

## Code Patterns

### Component Structure
```jsx
// ✅ CORRECT - Use existing UI components
import { Card, Button, Stack, Input } from '../components/UI';

export const MyComponent = () => (
  <Card>
    <Stack spacing="md">
      <Input label="Amount" actionButton={{ label: 'MAX', onClick: handleMax }} />
      <Button variant="primary">Action</Button>
    </Stack>
  </Card>
);

// ❌ WRONG - Don't import UI frameworks
import { Button } from '@shadcn/ui'; // FORBIDDEN
```

### Token Actions (Modular Components)
Token action tabs (Send/Airdrop/Mint/Burn/Message) are in [`src/components/TokenPage/TokenActions/`](src/components/TokenPage/TokenActions/)
- Each action is a separate component accepting props from parent
- Use `<ActionFeeEstimate actionType="..." params={...} />` for dynamic fee calculation
- All components use same UI library and styling patterns
- Network fees displayed conditionally with `<NetworkFeesAvail />` when `isCreator`

Example pattern:
```jsx
// ActionFeeEstimate calculates real tx size-based fees
<ActionFeeEstimate 
  actionType="send" // or 'airdrop', 'mint', 'burn', 'message'
  params={{ recipients: 10, message: "..." }} // optional context
/>
```

### Styling
```jsx
// ✅ CORRECT - CSS variables
<div style={{ color: 'var(--text-primary)', padding: 'var(--spacing-md)' }}>

// ✅ CORRECT - Utility classes from App.css
<div className="flex-column gap-md">

// ❌ WRONG - Framework classes
<div className="flex flex-col gap-4"> // Tailwind syntax - FORBIDDEN
```

### State Access
```javascript
// ✅ CORRECT - Use custom hooks
import { useEcashWallet } from '../hooks';
const { wallet, balance } = useEcashWallet();

// ❌ AVOID - Direct atom access (prefer hooks)
import { useAtom } from 'jotai';
import { walletAtom } from '../atoms';
```

### Blockchain Operations
```javascript
// ✅ CORRECT - Use wallet service methods
const wallet = new EcashWallet(mnemonic, hdPath);
const balance = await wallet.getBalance();
const txid = await wallet.send(destinationAddress, amountSats);

// Token operations
const tokenBalance = await wallet.getTokenBalance(tokenId);
await wallet.sendToken(tokenId, destinationAddress, amount);
```

## Internationalization (i18next)
- Config: [`src/i18n/i18nConfig.js`](src/i18n/i18nConfig.js)
- Translations: [`src/i18n/locales/`](src/i18n/locales/)
- Usage: `const { t } = useTranslation(); <p>{t('wallet.balance')}</p>`
- Support: French (fr) and English (en)

## Supabase Integration
- Client: [`src/services/supabaseClient.js`](src/services/supabaseClient.js)
- Tables: `profiles`, `activity_history`
- Schema: [`docs/SUPABASE_SCHEMA.md`](docs/SUPABASE_SCHEMA.md)
- Always handle errors gracefully (network may be unavailable)

## Common Pitfalls
1. **DO NOT** add Tailwind/Shadcn dependencies - this is a hard requirement
2. **DO NOT** use inline Tailwind classes - use CSS variables or custom classes
3. **ALWAYS** check if a UI component exists in UI.jsx before creating new ones
4. **REMEMBER** breakpoints are max-width (mobile-first), not min-width
5. **VERIFY** Node.js polyfills in vite.config.js if adding crypto dependencies
6. **TEST** with `npm test` - E2E tests cover critical flows

## Documentation Quick Links
- **Start here:** [`QUICK_START.md`](QUICK_START.md)
- **Current state:** [`PROJECT_STATUS.md`](PROJECT_STATUS.md)
- **Architecture:** [`docs/WALLET_ARCHITECTURE.md`](docs/WALLET_ARCHITECTURE.md)
- **CSS System:** [`docs/CONFORMITE_CAHIER_DES_CHARGES.md`](docs/CONFORMITE_CAHIER_DES_CHARGES.md)
- **Components:** [`docs/COMPONENTS.md`](docs/COMPONENTS.md)
- **Testing:** [`tests/README.md`](tests/README.md)

## Questions to Ask Before Implementing
1. Does this require a new UI component, or can I use/extend existing ones in UI.jsx?
2. Is there already a hook for this state/operation in src/hooks/?
3. Does this need blockchain interaction? (Use EcashWallet methods)
4. Should this be responsive? (Check breakpoints in themes.css)
5. Is this user-facing text? (Needs i18n translation)

# Phase 1 Fix Plan - Type Safety (Critical)

## Identified Method Name Mismatches

### Real Method Names (in EcashWallet.ts)
```typescript
// Line 75:   async getBalance(...)
// Line 119:  async getTokenBalance(tokenId)
// Line 132:  async getTokenInfo(tokenId)
// Line 252:  async sendXec(toAddress, amountXec)
// Line 289:  async sendToken(tokenId, toAddress, amountToken, decimals, _protocol, message)
// Line 365:  async sendTokenToMany(tokenId, recipients, decimals, _protocol, message)
// Line 458:  async createToken(params)
// Line 491:  async mintToken(tokenId, amount, decimals)     ← NOT mint()
// Line 533:  async burnToken(tokenId, amount, decimals)     ← NOT burn()
// Line 637:  async airdrop(tokenId, totalAmountXec, ...)     ← NOT airdropToken()
// Line 735:  async sendMessage(message)
```

### Issues Found

| File | Expected Method | Actual Method | Issue |
|------|-----------------|---------------|-------|
| useMintToken.ts:77 | `wallet.mint()` | `wallet.mintToken()` | Wrong method name |
| useBurnToken.ts:62 | `wallet.burn()` | `wallet.burnToken()` | Wrong method name |
| useAirdropToken.ts:80 | `wallet.airdropToken()` | `wallet.airdrop()` | Wrong method name |
| TokenSwitch.tsx:47 | `wallet.address` | NOT A PROPERTY | Missing property getter |

---

## Fix #1: Add Address Property to EcashWallet

**File:** `src/services/ecashWallet.ts`

**Issue:** Class has `addressStr` property but components expect `address`

**Solution:** Add getter property

```typescript
// Add after line ~70:
get address(): string {
  return this.addressStr;
}
```

---

## Fix #2: Fix useMintToken Hook

**File:** `src/hooks/useMintToken.ts`

**Current (Wrong):**
```typescript
const result = await wallet.mint(
```

**Fixed:**
```typescript
const result = await wallet.mintToken(
```

---

## Fix #3: Fix useBurnToken Hook

**File:** `src/hooks/useBurnToken.ts`

**Current (Wrong):**
```typescript
const result = await wallet.burn(tokenId, amountNum, decimals);
```

**Fixed:**
```typescript
const result = await wallet.burnToken(tokenId, amountNum, decimals);
```

---

## Fix #4: Fix useAirdropToken Hook

**File:** `src/hooks/useAirdropToken.ts`

**Current (Wrong):**
```typescript
const result = await wallet.airdropToken(tokenId, recipients, decimals);
```

**Fixed:**
```typescript
const result = await wallet.airdrop(tokenId, ...);
// Check actual signature needed
```

---

## Fix #5: Fix TokenSwitch Component

**File:** `src/components/TokenPage/TokenSwitch.tsx`

**Issue 1 - Line 74:** Wrong method name
```typescript
// WRONG:
const existingProfile = await profilService.getMyProfile(walletAddress);

// CORRECT:
const existingProfile = await profilService.getMyProfil(walletAddress);
```

**Issue 2 - Line 88:** Wrong method name
```typescript
// WRONG:
const updatedProfile = await profilService.getProfileByOwner(walletAddress);

// CORRECT:
const updatedProfile = await profilService.getProfilByOwner(walletAddress);
```

**Issue 3 - Line 47:** Missing address property
```typescript
// Add address getter to EcashWallet first
// Then this will work:
if (wallet?.address) return wallet.address;
```

---

## Fix #6: Fix useSendToken Hook Signature

**File:** `src/hooks/useSendToken.ts`

**Issue:** Hook called with 2 args but expects 0

```typescript
// CURRENT (Wrong):
const { isLoading, error, txId, success, send, reset } = useSendToken(tokenId, decimals);
// Error: 0 arguments expected, but 2 received

// NEED TO CHECK: useSendToken.ts definition
```

---

## Fix #7: Fix Send Component QrCodeScanner Props

**File:** `src/components/eCash/TokenActions/Send.tsx`

**Issue:** Wrong prop name

```typescript
// WRONG:
<QrCodeScanner onScan={handleQrScan} />

// CORRECT (check QrCodeScanner.jsx props):
<QrCodeScanner onAddressDetected={handleQrScan} />
```

---

## Fix #8: Fix Component Props Types

### App.tsx - WalletAuthGuard

**Current:**
```typescript
const WalletAuthGuard = ({ children }) => {
  // ERROR: children implicitly any
}
```

**Fixed:**
```typescript
interface WalletAuthGuardProps {
  children: React.ReactNode;
}

const WalletAuthGuard: React.FC<WalletAuthGuardProps> = ({ children }) => {
  // Properly typed
}
```

### App.tsx - OnboardingModal Missing onClose

**Current:**
```typescript
<OnboardingModal isPageMode={true} />
// ERROR: 'onClose' is required
```

**Fixed:**
```typescript
<OnboardingModal isPageMode={true} onClose={() => {}} />
// OR update component to make onClose optional
```

### Send.tsx - Callback Parameter Types

**Current:**
```typescript
onSelectContact={(address, name) => {
  // ERROR: address and name are implicitly any
}
```

**Fixed:**
```typescript
onSelectContact={(address: string, name: string) => {
  // Properly typed
}
```

---

## Fix #9: Add .d.ts Files for .js Modules

Create type declaration files:

### `src/i18n/index.d.ts`
```typescript
import type i18next from 'i18next';
declare const i18n: i18next.i18n;
export default i18n;
```

### `src/hooks/useEcashWallet.d.ts`
```typescript
export function useEcashWallet(): {
  wallet: EcashWallet | null;
  address: string;
  balance: string;
  loading: boolean;
  error: string | null;
};

// Import types
import type { EcashWallet } from '../services/ecashWallet';
```

### `src/components/HistoryCollapse.d.ts`
```typescript
import React from 'react';

interface HistoryCollapseProps {
  // Add proper props
}

declare const HistoryCollapse: React.FC<HistoryCollapseProps>;
export default HistoryCollapse;
```

### `src/components/eCash/TokenActions/ActionFeeEstimate.d.ts`
```typescript
import React from 'react';

interface ActionFeeEstimateProps {
  actionType: 'send' | 'airdrop' | 'mint' | 'burn' | 'message';
  params?: Record<string, any>;
  onFeeCalculated?: (fee: number) => void;
}

declare const ActionFeeEstimate: React.FC<ActionFeeEstimateProps>;
export default ActionFeeEstimate;
```

---

## Fix #10: Remove Unused Imports

### App.tsx
```typescript
// REMOVE:
import ProtectedRoute from './components/ProtectedRoute';  // Unused
import LazyBoundary from './components/LazyBoundary';     // Unused
import TopBar from './components/Layout/TopBar';          // Unused
```

### TokenSwitch.tsx
```typescript
// REMOVE:
import React from 'react';        // Unused (React 19)
import { useEcashWallet } from '...'; // Unused
```

### Send.tsx
```typescript
// REMOVE:
import { useParams } from 'react-router-dom'; // Unused
```

### Airdrop.tsx
```typescript
// REMOVE:
import { useEffect } from 'react'; // Unused
```

### NetworkFeesAvail.tsx
```typescript
// REMOVE:
const navigate = useNavigate(); // Unused
```

---

## Fix #11: Update ProfilService Calls

**File:** `src/components/TokenPage/TokenSwitch.tsx`

The ProfilService interface uses French naming:
- `getMyProfil()` (NOT getMyProfile)
- `getProfilByOwner()` (NOT getProfileByOwner)

**Fix:**
```typescript
// Line 74 - CHANGE:
const existingProfile = await profilService.getMyProfile(walletAddress);
// TO:
const existingProfile = await profilService.getMyProfil(walletAddress);

// Line 88 - CHANGE:
const updatedProfile = await profilService.getProfileByOwner(walletAddress);
// TO:
const updatedProfile = await profilService.getProfilByOwner(walletAddress);
```

---

## Fix #12: NetworkFeesAvail Type Fixes

**File:** `src/components/eCash/NetworkFeesAvail.tsx`

```typescript
// Line 21 - Add type:
const onRefresh = (): void => {
  // Function body
};

// Line 34 - Fix estimatedFee parameter:
} = useNetworkFees(estimatedFee ?? 0); // Handle null with default
```

---

## Cleanup: Remove Unused @ts-expect-error

These directives are no longer needed:

1. `src/services/ecashWallet.ts:2` - Remove (ecash-lib import still needs it)
2. `src/services/ecashWallet.ts:7` - Remove (ecashaddrjs import still needs it)
3. `src/components/UI/Tabs.tsx:23` - Remove (CSS scrollbar styling)
4. `src/components/UI/Feedback.tsx:102` - Remove (Badge styling)

Actually, keep them if they're fixing real TS errors. Only remove if errors are gone.

---

## Summary of Changes Required

| Category | Count | Files |
|----------|-------|-------|
| Method name fixes | 3 | useMintToken, useBurnToken, useAirdropToken |
| Property addition | 1 | ecashWallet.ts (add address getter) |
| Method call fixes | 2 | TokenSwitch.tsx (getMyProfil, getProfilByOwner) |
| Component type additions | 5+ | App.tsx, Send.tsx, Airdrop.tsx, etc. |
| Remove unused imports | 5+ | App.tsx, TokenSwitch.tsx, Send.tsx |
| Add .d.ts files | 4 | i18n, useEcashWallet, HistoryCollapse, ActionFeeEstimate |
| **TOTAL** | **~20** | - |

**Estimated Time:** 1.5-2 hours

---

## Implementation Order

1. ✅ Add `address` getter to EcashWallet class
2. ✅ Fix method names: `mint()` → `mintToken()`, etc.
3. ✅ Fix ProfilService method calls
4. ✅ Add component prop interfaces
5. ✅ Remove unused imports
6. ✅ Create .d.ts declaration files
7. ✅ Run TypeScript compiler check

---

## Awaiting Confirmation

Before implementing:

- [ ] Confirm approach for .d.ts files vs converting to .ts
- [ ] Confirm useSendToken hook signature (need to check actual)
- [ ] Confirm QrCodeScanner prop name (onScan vs onAddressDetected)
- [ ] Confirm ProfilService French naming is intentional (keep as-is)


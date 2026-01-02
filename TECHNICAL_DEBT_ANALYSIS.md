# Senior Lead Developer - Technical Debt Analysis
**JLN-Wallet Repository**  
**Date:** 2 janvier 2026

---

## Executive Summary

**Total Errors Found:** 167 (showing first 50)  
**Critical Issues:** 8 (Type safety, interface mismatches)  
**Warnings:** 35+ (Unused imports, implicit 'any' types)  
**Quick Wins:** 20+ (Unused imports cleanup)

---

## Error Categories & Root Causes

### 🔴 CRITICAL (Fix Immediately)

#### 1. **EcashWallet Interface Mismatch** (8+ errors)
**Files affected:** TokenSwitch.tsx, useMintToken.ts, useAirdropToken.ts, useBurnToken.ts

**Root cause:** `EcashWallet` type definition missing methods that components expect

```typescript
// ❌ EXPECTED BY CODE:
wallet.address              // TokenSwitch.tsx:47
wallet.airdropToken()       // useAirdropToken.ts:80
wallet.mint()               // useMintToken.ts:77
wallet.burn()               // useBurnToken.ts:62

// ❌ ACTUAL DEFINITION:
// EcashWallet class in ecashWallet.ts doesn't export these properly
// or they're not typed in the interface
```

**Structural Fix Required:**
```typescript
// Need to define proper interface for EcashWallet
interface EcashWalletService {
  address: string;              // Property
  listETokens(): Promise<...>;  // Existing
  airdropToken(...): Promise<>; // Missing
  mint(...): Promise<>;         // Missing
  burn(...): Promise<>;         // Missing
  sendToken(...): Promise<>;    // Existing
}
```

**Impact:** 8+ TypeScript errors cascade through transaction components

---

#### 2. **ProfilService Interface Mismatches** (2 errors)
**Files affected:** TokenSwitch.tsx

**Root cause:** Method name conventions not consistent

```typescript
// ❌ CODE EXPECTS:
profilService.getMyProfile()      // Line 74
profilService.getProfileByOwner() // Line 88

// ✅ ACTUAL AVAILABLE:
profilService.getMyProfil()       // (wrong spelling)
profilService.getProfilByOwner()  // (wrong spelling)
```

**Issue:** French/English naming inconsistency (Profil vs Profile)

**Structural Fix:** Need interface standardization
```typescript
interface ProfilService {
  getMyProfil(ownerAddress: string): Promise<UserProfile | null>;      // ✅
  getProfilByOwner(ownerAddress: string): Promise<UserProfile | null>; // ✅
  // NOT getMyProfile or getProfileByOwner
}
```

---

#### 3. **Implicit 'any' Types from .js Files** (15+ errors)
**Files affected:** App.tsx, useEcashWallet.js imports, HistoryCollapse, ActionFeeEstimate

**Root cause:** Files remain as .js/.jsx without .d.ts type definitions

```typescript
// ❌ TYPESCRIPT CAN'T TYPE:
import i18n from './i18n';                    // './i18n/index.js' has implicit 'any'
import { useEcashWallet } from '...wallet.js'; // implicit 'any'
import HistoryCollapse from '...jsx';          // implicit 'any'
import ActionFeeEstimate from '...jsx';        // implicit 'any'
```

**Solution Needed:**
1. Convert .js/.jsx files to .ts/.tsx
2. OR create .d.ts stub files with proper types
3. OR configure tsconfig to be more lenient

**Impact:** 15+ "file not found" or "implicit any" errors

---

#### 4. **React Component Props Type Issues** (10+ errors)
**Files affected:** App.tsx, Send.tsx, Airdrop.tsx, NetworkFeesAvail.tsx

**Root cause:** Component props lack proper TypeScript interfaces

```typescript
// ❌ WRONG - implicit any
const WalletAuthGuard = ({ children }) => { ... }

const NetworkFeesAvail = ({ onRefresh, ... }) => { ... }

// ❌ WRONG - Arrow function params without types
onSelectContact={(address, name) => { ... }}

// ✅ CORRECT - Explicit types
interface WalletAuthGuardProps {
  children: React.ReactNode;
}
const WalletAuthGuard: React.FC<WalletAuthGuardProps> = ({ children }) => { ... }
```

**Structural Fix:** Need proper React.FC type definitions across all components

---

### 🟡 MEDIUM (Priority 2)

#### 5. **Unused Imports Cleanup** (20+ warnings)
**Files affected:** App.tsx, TokenSwitch.tsx, Send.tsx, etc.

**Examples:**
```typescript
import React from 'react';           // Unused (React 19 doesn't need)
import ProtectedRoute from '...';    // Declared but not used
import LazyBoundary from '...';      // Declared but not used
import TopBar from '...';            // Declared but not used
import { useParams } from 'router';  // Declared but not used
```

**Quick fix:** Remove unused imports
**Strategic fix:** Audit React imports (React 19 doesn't need React for JSX)

---

#### 6. **Unused @ts-expect-error Directives** (4 warnings)
**Files affected:** ecashWallet.ts, Tabs.tsx, Feedback.tsx

**Root cause:** Directives left when issues were already resolved

```typescript
// ❌ These are no longer needed:
// @ts-expect-error - ecash-lib doesn't have TypeScript definitions
import { ... } from 'ecash-lib';

// @ts-expect-error - Non-standard CSS properties for scrollbar styling
// style={{ ... }}
```

**Fix:** Remove unused directives or add comments explaining why kept

---

#### 7. **UseSendToken Hook Signature Mismatch** (1 error)
**Files affected:** Send.tsx

```typescript
// ❌ CALL:
const { isLoading, error, txId, success, send, reset } = useSendToken(tokenId, decimals);

// ERROR: 0 arguments expected, but 2 received
```

**Issue:** Hook signature doesn't match usage

---

### 🟢 LOW (Nice to Have)

#### 8. **tsconfig.node.json Empty Config** (1 warning)
**Issue:** No entries in vite.config.js path

**Fix:** Either populate or remove file

---

## Detailed Problem Map

```
ERROR TREE BY CATEGORY:
├── 🔴 TYPE SAFETY (Critical)
│   ├── EcashWallet interface mismatch (8)
│   ├── ProfilService naming inconsistency (2)
│   ├── Component props missing types (10)
│   └── Implicit 'any' from .js files (15)
│
├── 🟡 UNUSED CODE (Medium)
│   ├── Unused imports (20+)
│   ├── Unused @ts-expect-error (4)
│   └── Unused hook return values (3)
│
└── 🟢 CONFIG (Low)
    ├── tsconfig.node.json (1)
    └── React import cleanup (5)
```

---

## Recommended Fix Order

### Phase 1: Foundation (Type Safety)
**Duration:** 1-2 hours | **Impact:** Fixes 25+ errors

1. **Fix EcashWallet interface**
   - Add missing methods: address, airdropToken, mint, burn
   - Export interface from ecashWallet.ts
   - Update all hook type definitions

2. **Fix ProfilService naming**
   - Standardize all method names to use getMyProfil/getProfilByOwner
   - Update TokenSwitch.tsx calls
   - Document convention

3. **Add Component Prop Types**
   - Create interfaces for all React component props
   - Follow pattern: `interface ComponentNameProps { ... }`
   - Use React.FC<Props> type annotation

4. **Address .js Files**
   - Create .d.ts stub files for:
     - i18n/index.js
     - hooks/useEcashWallet.js
     - components/HistoryCollapse.jsx
     - components/eCash/TokenActions/ActionFeeEstimate.jsx
   - OR convert to .ts/.tsx

### Phase 2: Cleanup (Code Quality)
**Duration:** 30-45 minutes | **Impact:** Fixes 20+ warnings

1. Remove unused imports
2. Remove unused @ts-expect-error directives
3. Remove React import where not needed (React 19)
4. Clean up hook return values

### Phase 3: Configuration
**Duration:** 15 minutes

1. Fix tsconfig.node.json
2. Review tsconfig.json strict mode settings

---

## Architectural Observations

### ✅ Good Practices Found
- Clean Architecture separation: services vs components
- Use of Jotai atoms for state
- Custom React hooks pattern
- TypeScript usage (where configured)

### ⚠️ Issues to Address
- **Type Safety Gap:** Mixing .js and .ts files without proper types
- **Interface Drift:** Service implementations don't match expected interfaces
- **Props Pattern:** Inconsistent React component typing
- **Import Cleanliness:** Unused imports throughout

### 🎯 Strategic Recommendations

**Recommendation 1: Complete TypeScript Migration**
- Convert all .js/.jsx to .ts/.tsx
- Remove @ts-expect-error as much as possible
- Enable strict mode in tsconfig

**Recommendation 2: Interface-First Development**
- Define interfaces BEFORE implementation
- Export interfaces from services/hooks
- Use `satisfies` operator for type checking

**Recommendation 3: Component Type Template**
```typescript
// Always follow this pattern:
interface MyComponentProps {
  prop1: Type1;
  prop2?: Type2;  // Optional
  onAction: (param: Type3) => void;
  children?: React.ReactNode;
}

const MyComponent: React.FC<MyComponentProps> = ({ prop1, onAction, children }) => {
  // Component body
};

export default MyComponent;
```

---

## Questions for Confirmation

Before proceeding with fixes:

1. **EcashWallet Methods:** Should missing methods (airdropToken, mint, burn) be:
   - Added to EcashWallet class in services/ecashWallet.ts?
   - Already exist and just not properly typed?
   - Implemented in useMintToken/useAirdropToken/useBurnToken hooks instead?

2. **ProfilService Naming:** Should we:
   - Standardize on `getMyProfil`/`getProfilByOwner` (current)?
   - Change to `getMyProfile`/`getProfileByOwner` (English)?
   - Update all references globally?

3. **File Migration:** Should we:
   - Convert all .js/.jsx to .ts/.tsx immediately?
   - Create .d.ts stub files for now?
   - Leave as-is with lenient tsconfig?

4. **Component Props:** Should I:
   - Create a shared `types.ts` file for common prop interfaces?
   - Create interface per file alongside component?
   - Use inline interface in component file?

---

## Next Action

**Awaiting your confirmation on:**
- [ ] Confirmation for Phase 1 fixes (type safety)
- [ ] Confirmation for global interface changes
- [ ] Strategy for .js → .ts migration
- [ ] Component props typing approach

**Once confirmed, I will proceed with:**
1. Implement fixes without using `any` types
2. Maintain Clean Architecture principles
3. Update all affected files atomically
4. Provide test verification

---

## Summary Statistics

| Category | Count | Severity | Fixable |
|----------|-------|----------|---------|
| Type mismatches | 8 | Critical | Yes |
| Naming inconsistencies | 2 | Critical | Yes |
| Missing types | 15 | Critical | Yes |
| Component props | 10 | Critical | Yes |
| Unused imports | 20+ | Medium | Yes |
| Unused directives | 4 | Medium | Yes |
| Config issues | 1 | Low | Yes |
| **TOTAL** | **~60** | - | **100%** |

**Estimated Fix Time:** 2-3 hours (all phases)  
**Risk Level:** Low (no breaking changes to features)  
**Quality Improvement:** High (strict type safety)


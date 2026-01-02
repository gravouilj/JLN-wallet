# 🛠️ AUDIT REMEDIATION ROADMAP - Phase 6 & 7
**Based on:** Senior Developer Audit (2 January 2026)  
**Status:** Action items prioritized and planned

---

## 📌 QUICK SUMMARY

**Audit Finding:** JLN-Wallet is production-ready (8.2/10 health score)  
**Critical Actions:** 1 (✅ COMPLETED - qs security update)  
**High Priority:** 2 (unit tests, type safety)  
**Medium Priority:** 3 (build time, code cleanup, RLS verification)  

---

## 🚦 IMMEDIATE ACTIONS (TODAY - COMPLETED ✅)

### Action 1: Security Vulnerability Fix ✅ DONE
```
Status: ✅ COMPLETED
Task:   Update qs to 6.14.1
Time:   5 minutes
Result: 0 vulnerabilities (was 1 HIGH)
Commit: 455b437 "fix(security): Update qs to 6.14.1"
```

**Verification:**
```bash
$ npm audit
# Output: found 0 vulnerabilities ✅
```

---

## 📊 PHASE 6: SECURITY & QUALITY (Weeks 1-2)

### Phase 6.1: Security Hardening Sprint (5-6 hours)

#### Task 6.1.1: Password Attempt Rate Limiting
**Status:** NOT STARTED  
**Files to Create/Modify:**
- `src/services/rateLimitService.ts` (NEW)
- `src/components/Auth/UnlockWallet.tsx` (MODIFY)

**Implementation:**
```typescript
// src/services/rateLimitService.ts
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

export const rateLimitService = {
  recordFailedAttempt: (key: string) => {
    const attempts = localStorage.getItem(`attempt_${key}`);
    const count = attempts ? JSON.parse(attempts) : { count: 0, timestamp: 0 };
    count.count++;
    count.timestamp = Date.now();
    localStorage.setItem(`attempt_${key}`, JSON.stringify(count));
  },
  
  isLocked: (key: string): boolean => {
    const attempts = localStorage.getItem(`attempt_${key}`);
    if (!attempts) return false;
    
    const { count, timestamp } = JSON.parse(attempts);
    const timePassed = Date.now() - timestamp;
    
    if (count >= MAX_ATTEMPTS && timePassed < LOCKOUT_DURATION) {
      return true;
    }
    if (timePassed >= LOCKOUT_DURATION) {
      localStorage.removeItem(`attempt_${key}`);
    }
    return false;
  },
  
  reset: (key: string) => {
    localStorage.removeItem(`attempt_${key}`);
  }
};
```

**In UnlockWallet.tsx:**
```typescript
import { rateLimitService } from '../../services/rateLimitService';

const UnlockWallet: React.FC = () => {
  if (rateLimitService.isLocked('wallet_unlock')) {
    return <InfoBox type="error">
      Trop de tentatives. Réessayez dans 15 minutes.
    </InfoBox>;
  }
  
  const handleUnlock = async (password: string) => {
    try {
      // ... unlock logic
      rateLimitService.reset('wallet_unlock');
    } catch (error) {
      rateLimitService.recordFailedAttempt('wallet_unlock');
    }
  };
};
```

**Estimated Time:** 1.5 hours  
**Acceptance Criteria:**
- [ ] After 5 failed attempts, show lockout message
- [ ] Lockout lasts 15 minutes
- [ ] Counter resets on successful unlock
- [ ] Test with manual attempts

---

#### Task 6.1.2: Session Timeout for Wallets
**Status:** NOT STARTED  
**Files to Create/Modify:**
- `src/hooks/useSessionTimeout.ts` (NEW)
- `src/App.tsx` (MODIFY - add to main layout)

**Implementation:**
```typescript
// src/hooks/useSessionTimeout.ts
import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { mnemonicAtom } from '../atoms';

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes idle

export const useSessionTimeout = () => {
  const setMnemonic = useSetAtom(mnemonicAtom);
  let timeoutId: NodeJS.Timeout | null = null;
  
  const resetTimeout = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      // Clear wallet on timeout
      setMnemonic('');
      localStorage.removeItem('jotai-wallet');
      console.log('Session expired - wallet locked');
    }, SESSION_TIMEOUT);
  };
  
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      window.addEventListener(event, resetTimeout);
    });
    
    resetTimeout();
    
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetTimeout);
      });
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);
};
```

**In App.tsx:**
```typescript
import { useSessionTimeout } from './hooks/useSessionTimeout';

export const App = () => {
  useSessionTimeout(); // Add this line
  
  return (
    // ... existing code
  );
};
```

**Estimated Time:** 1.5 hours  
**Acceptance Criteria:**
- [ ] Wallet auto-locks after 30 minutes inactivity
- [ ] Activity (mouse/keyboard/touch) resets timer
- [ ] User sees no warning (silent lock)
- [ ] Works across tabs
- [ ] Test with DevTools throttling

---

#### Task 6.1.3: Supabase RLS Verification
**Status:** NOT STARTED  
**Effort:** 1 hour (documentation + verification)

**Action:**
1. Review `docs/SUPABASE_SCHEMA.md`
2. Verify all tables have RLS enabled in Supabase dashboard
3. Check policies for each table:
   - `profiles` - Users can only read their own profile
   - `tickets` - Users can only see tickets involving them
   - `admin` table - Only admins can access
   - `activity_history` - Only owner can read their history

**Checklist:**
```
RLS Status in Supabase Console:
[ ] profiles table - RLS enabled
[ ] tickets table - RLS enabled  
[ ] activity_history table - RLS enabled
[ ] admin_users table - RLS enabled
[ ] All policies tested and working

Document in: docs/RLS_VERIFICATION_COMPLETE.md
```

---

#### Task 6.1.4: Security Headers Check
**Status:** NOT STARTED  
**Effort:** 1 hour

**Add to vite.config.js:**
```javascript
export default defineConfig({
  server: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    }
  },
  preview: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    }
  }
});
```

**Verification:**
```bash
# After deployment, check headers:
curl -I https://your-domain.com
# Should show all security headers
```

---

### Phase 6.2: Unit Test Foundation (15-20 hours)

#### Task 6.2.1: Setup Vitest + Testing Library ✅ READY TO START
**Status:** NOT STARTED  
**Files to Create:**
- `src/__tests__/` (NEW directory)
- `vitest.config.ts` (EXISTS, may need update)
- `src/__tests__/setup.ts` (NEW)

**Setup Commands:**
```bash
# Install dependencies (if not already present)
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom

# Create test directory structure
mkdir -p src/__tests__/{services,hooks,utils,components}
```

**Create vitest.config.ts:**
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**/*.d.ts',
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  }
});
```

**Create src/__tests__/setup.ts:**
```typescript
import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;
```

**Update package.json scripts:**
```json
{
  "scripts": {
    "test:unit": "vitest",
    "test:unit:ui": "vitest --ui",
    "test:unit:coverage": "vitest --coverage"
  }
}
```

**Estimated Time:** 2 hours  
**Acceptance Criteria:**
- [ ] `npm run test:unit` runs without errors
- [ ] Test files can be created and executed
- [ ] Coverage reports generated

---

#### Task 6.2.2: EcashWallet Service Tests (6-8 hours)
**Status:** NOT STARTED  
**File:** `src/__tests__/services/ecashWallet.test.ts` (NEW)

**Test Plan:**
```
Test Suite: EcashWallet Service
├── Constructor & Initialization
│   ├── Should create wallet from valid mnemonic
│   ├── Should derive correct address (BIP44)
│   └── Should throw on invalid mnemonic
│
├── Balance Operations
│   ├── Should getBalance() correctly
│   ├── Should handle empty wallet (0 balance)
│   └── Should handle token balances
│
├── Transaction Operations
│   ├── Should prepareSend() with valid params
│   ├── Should calculateFee() correctly
│   ├── Should reject insufficient balance
│   └── Should reject invalid address
│
├── Token Operations
│   ├── Should getTokenBalance()
│   ├── Should sendToken() correctly
│   ├── Should mintToken() with correct params
│   └── Should burnToken() correctly
│
└── Error Handling
    ├── Should handle network errors gracefully
    ├── Should validate input parameters
    └── Should retry on transient failures
```

**Sample Test:**
```typescript
// src/__tests__/services/ecashWallet.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EcashWallet } from '../../services/ecashWallet';
import * as chronikClient from '../../services/chronikClient';

vi.mock('../../services/chronikClient');

describe('EcashWallet Service', () => {
  let wallet: EcashWallet;
  const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
  
  beforeEach(() => {
    wallet = new EcashWallet(testMnemonic);
  });
  
  it('should create wallet from valid mnemonic', () => {
    expect(wallet).toBeDefined();
    expect(wallet.address).toBeDefined();
    expect(wallet.address).toMatch(/^(ecash:|bitcoincash:)/);
  });
  
  it('should derive address from BIP44 path', () => {
    // Address should be deterministic
    const wallet2 = new EcashWallet(testMnemonic);
    expect(wallet.address).toBe(wallet2.address);
  });
  
  it('should throw error on invalid mnemonic', () => {
    expect(() => {
      new EcashWallet('invalid mnemonic');
    }).toThrow();
  });
  
  it('should get balance for valid address', async () => {
    const mockBalance = { sats: BigInt(100000) };
    vi.mocked(chronikClient.getBalance).mockResolvedValue(mockBalance as any);
    
    const balance = await wallet.getBalance();
    expect(balance).toEqual(mockBalance);
  });
  
  it('should reject insufficient balance for send', async () => {
    vi.mocked(chronikClient.getBalance).mockResolvedValue({ sats: BigInt(1000) } as any);
    
    await expect(
      wallet.send('ecash:qz...', 50000)
    ).rejects.toThrow('Insufficient balance');
  });
});
```

**Estimated Time:** 6-8 hours  
**Coverage Target:** 70%+ of ecashWallet.ts

---

#### Task 6.2.3: Hook Tests (3-4 hours)
**Status:** NOT STARTED  
**Files:**
- `src/__tests__/hooks/useEcashWallet.test.ts`
- `src/__tests__/hooks/useNetworkFees.test.ts`
- `src/__tests__/hooks/useProfiles.test.ts`

**Test Structure (Example):**
```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useEcashWallet } from '../../hooks/useEcashWallet';

describe('useEcashWallet Hook', () => {
  it('should initialize with wallet data', async () => {
    const { result } = renderHook(() => useEcashWallet());
    
    await waitFor(() => {
      expect(result.current.wallet).toBeDefined();
    });
  });
  
  it('should update balance on mount', async () => {
    const { result } = renderHook(() => useEcashWallet());
    
    await waitFor(() => {
      expect(result.current.balance).toBeDefined();
    });
  });
  
  it('should handle wallet refresh', async () => {
    const { result } = renderHook(() => useEcashWallet());
    
    await act(async () => {
      await result.current.refresh();
    });
    
    expect(result.current.lastRefresh).toBeDefined();
  });
});
```

**Estimated Time:** 3-4 hours  
**Coverage Target:** 60%+

---

#### Task 6.2.4: Service & Utility Tests (4-6 hours)
**Status:** NOT STARTED  
**Files:**
- `src/__tests__/services/ticketService.test.ts`
- `src/__tests__/services/adminService.test.ts`
- `src/__tests__/utils/formatters.test.ts`
- `src/__tests__/utils/validators.test.ts`

**Key Testing Areas:**
```
Services:
├── ticketService
│   ├── createTicket()
│   ├── getTickets()
│   ├── updateTicketStatus()
│   └── addMessage()
├── adminService
│   ├── isAdmin()
│   ├── banProfile()
│   └── verifyProfile()
└── antifraudService
    ├── checkDuplicateWallet()
    └── blockCreator()

Utilities:
├── formatters
│   ├── formatXEC()
│   ├── formatAddress()
│   └── formatDate()
└── validators
    ├── isValidAddress()
    ├── isValidXEC()
    └── isValidToken()
```

**Estimated Time:** 4-6 hours  
**Coverage Target:** 75%+

---

### Phase 6.3: Type Safety Improvements (6-8 hours)

#### Task 6.3.1: Reduce no-explicit-any Warnings
**Status:** NOT STARTED  
**Files:**
- `src/atoms.ts` (140 warnings)
- `src/services/` (60 warnings)
- `src/types/` (30 warnings)

**Approach:**

1. **atoms.ts refactoring:**
```typescript
// BEFORE:
const getInitialSelectedProfile = (): any => {
  return localStorage.getItem(...);
};

// AFTER:
interface ProfileData {
  tokenId: string;
  [key: string]: string | number | boolean;
}
const getInitialSelectedProfile = (): ProfileData | null => {
  const data = localStorage.getItem(...);
  return data ? JSON.parse(data) : null;
};
```

2. **Service return types:**
```typescript
// BEFORE:
export const getTicketById = async (id: string): Promise<any> => {
  return supabase.from('tickets').select().eq('id', id);
};

// AFTER:
export const getTicketById = async (id: string): Promise<Ticket | null> => {
  const { data, error } = await supabase
    .from('tickets')
    .select()
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data as Ticket;
};
```

3. **Component Props:**
```typescript
// All component props already well-typed ✅
// Just ensure generic types are filled in
export const MyComponent: React.FC<MyComponentProps> = ({ /* ... */ }) => {
  // ...
};
```

**Estimated Time:** 6-8 hours  
**Target:** Reduce from 334 → 150 warnings (55% reduction)

**ESLint Command to Track Progress:**
```bash
npm run lint 2>&1 | grep "no-explicit-any" | wc -l
# Target: < 100 warnings
```

---

#### Task 6.3.2: Component Props Audit
**Status:** NOT STARTED  
**Effort:** 2 hours

**Verify all components have:**
- [ ] Named Props interface (even if empty)
- [ ] React.FC<Props> typing
- [ ] All props with types (no missing ones)
- [ ] Default values for optional props

**Command to find missing Props:**
```bash
grep -r "export const.*React.FC" src/components --include="*.tsx" \
  | grep -v "Props =" | head -20
```

---

---

## 🗓️ TIMELINE & RESOURCE PLANNING

### Week 1 (Jan 6-10)
**Focus:** Security + Unit Test Setup  
**Effort:** 20 hours

```
Mon (4h):  Tasks 6.1.1 + 6.1.2 (rate limiting + timeout)
Tue (4h):  Task 6.1.3 + 6.1.4 (RLS + headers)
Wed (4h):  Task 6.2.1 (vitest setup + first tests)
Thu (4h):  Task 6.2.2 (EcashWallet tests start)
Fri (4h):  Task 6.2.2 (EcashWallet tests complete)
```

**Deliverable:** `docs/PHASE_6_1_SECURITY_COMPLETE.md`

### Week 2 (Jan 13-17)
**Focus:** Unit Tests + Type Safety  
**Effort:** 20 hours

```
Mon (4h):  Task 6.2.3 (Hook tests)
Tue (4h):  Task 6.2.4 (Service tests)
Wed (4h):  Task 6.3.1 (Type safety refactoring)
Thu (4h):  Task 6.3.2 (Props audit)
Fri (4h):  Testing + verification
```

**Deliverable:** `docs/PHASE_6_2_UNIT_TESTS_COMPLETE.md` + `docs/PHASE_6_3_TYPE_SAFETY_COMPLETE.md`

### Week 3-4 (Jan 20-31)
**Focus:** Phase 7 - Performance Optimization  
**Effort:** 10-12 hours

---

## ✅ COMPLETION CHECKLIST

### Phase 6.1: Security (Week 1)
- [ ] Password rate limiting implemented
- [ ] Session timeout working (30 min)
- [ ] Supabase RLS verified
- [ ] Security headers configured
- [ ] `npm audit` shows 0 vulnerabilities
- [ ] All E2E tests still passing
- [ ] Commit: "phase-6-1: Complete security hardening"

### Phase 6.2: Unit Tests (Week 2)
- [ ] Vitest configured and running
- [ ] EcashWallet tests (70%+ coverage)
- [ ] Hook tests (60%+ coverage)
- [ ] Service tests (75%+ coverage)
- [ ] `npm run test:unit` passing
- [ ] Coverage report generated
- [ ] Commit: "phase-6-2: Add unit test suite"

### Phase 6.3: Type Safety (Week 2)
- [ ] no-explicit-any reduced to <100
- [ ] All service return types explicit
- [ ] Component Props fully typed
- [ ] ESLint warnings reduced 60%+
- [ ] `npm run lint` shows improvement
- [ ] Commit: "phase-6-3: Improve type safety"

---

## 📈 SUCCESS METRICS

After completing Phase 6:

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Security vulnerabilities | 0 | 0 | ✅ |
| Unit test coverage | 0% | 50%+ | 🔄 |
| Type safety warnings | 334 | <100 | 🔄 |
| Build time | 4.15s | <4.0s | 🔄 |
| E2E tests passing | 235/235 | 235/235 | ✅ |
| Code quality score | 8/10 | 9/10 | 🔄 |

---

## 📎 RESOURCES & REFERENCES

**Testing Docs:**
- Vitest: https://vitest.dev
- Testing Library: https://testing-library.com/react
- React Testing: https://react.dev/learn/writing-tests

**Security Resources:**
- OWASP Top 10: https://owasp.org/Top10
- MDN Security: https://developer.mozilla.org/en-US/docs/Web/Security

**Supabase RLS:**
- Official docs: https://supabase.com/docs/guides/auth/row-level-security

---

## 🎯 NEXT SESSION AGENDA

1. **Status Check** (5 min)
   - Verify qs update applied ✅
   - Check npm audit = 0 vulnerabilities ✅

2. **Phase 6.1 Start** (2-3 hours)
   - Implement rate limiting
   - Add session timeout
   - Test both features

3. **Phase 6.2 Setup** (1-2 hours)
   - Install vitest
   - Create directory structure
   - Setup first test

4. **Commit & Push** (15 min)
   - Commit all Phase 6.1 work
   - Create GitHub PR if needed
   - Update PROJECT_STATUS.md

---

**Report Date:** 2 January 2026  
**Prepared by:** Senior Full-Stack Engineer  
**Next Review:** End of Week 2 (January 17, 2026)


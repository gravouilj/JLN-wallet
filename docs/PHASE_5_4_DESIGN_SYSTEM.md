# Phase 5.4: Design System Standardization

**Status**: 🟡 PLANNING  
**Priority**: P2 (Important)  
**Estimated Effort**: 1-2 weeks (5-8 hours active work)  
**Start Date**: TBD  

## Objective

Standardize component styling across the codebase by:
1. Migrating inline styles to CSS variables and utility classes
2. Adding accessibility attributes (ARIA labels, roles)
3. Improving theme consistency
4. Reducing CSS duplication

## Current State Analysis

### Inline Styles Usage (Anti-Pattern)
Current components use excessive inline styles:
```typescript
// ❌ CURRENT: Inline styles scattered everywhere
<Input
  style={{
    width: '100%',
    padding: '12px 16px',
    fontSize: '0.9rem',
    border: '1px solid var(--border-color)',
    borderRadius: '8px'
  }}
/>
```

### CSS Variables Available
From `src/styles/themes.css`:
```css
/* Color System */
--primary: #0074e4
--primary-hover: #005bc4
--text-primary: #0f172a
--text-secondary: #64748b
--bg-primary: #ffffff
--bg-secondary: #f8fafc

/* Spacing */
--spacing-xs: 4px
--spacing-sm: 8px
--spacing-md: 16px
--spacing-lg: 24px
--spacing-xl: 32px

/* Border Radius */
--radius-sm: 4px
--radius-md: 8px
--radius-lg: 12px

/* Shadows */
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05)
--shadow-md: 0 4px 6px rgba(0,0,0,0.1)
--shadow-lg: 0 10px 15px rgba(0,0,0,0.2)
```

### Accessibility Gaps
Current components missing:
- `aria-label` on icon buttons
- `aria-describedby` on inputs with helper text
- `role` attributes for custom components
- `aria-busy` on loading states
- `aria-disabled` on disabled inputs
- Keyboard focus indicators

## Implementation Plan

### Phase 5.4a: Component Styling Refactor (Priority 1)

**Files to Refactor** (by impact):
1. `Send.tsx` (heavily styled)
2. `Mint.tsx` (moderately styled)
3. `Burn.tsx` (moderately styled)
4. `AddressBook.tsx` (list styling)
5. `TokenPage.tsx` (grid layouts)

**Approach**:
```typescript
// ❌ OLD: Inline styles
<Input
  style={{
    width: '100%',
    padding: '12px 16px',
    fontSize: '0.9rem',
    border: '1px solid var(--border-color, #e5e7eb)',
    borderRadius: '8px',
  }}
/>

// ✅ NEW: CSS variables + utility classes
<Input
  className="input-primary"
  style={{ width: '100%' }}  // Only layout-specific styles remain
/>
```

**Create `src/styles/components.css`**:
```css
/* Reusable component styles */
.input-primary {
  padding: var(--spacing-md);
  font-size: 0.9rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background-color: var(--bg-input);
  color: var(--text-primary);
  transition: border-color 0.2s;
}

.input-primary:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(0, 116, 228, 0.1);
}

.button-primary {
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.button-primary:hover:not(:disabled) {
  background-color: var(--primary-hover);
  box-shadow: var(--shadow-md);
}
```

### Phase 5.4b: Accessibility Improvements (Priority 2)

**Focus Areas**:
1. Form inputs (aria-label, aria-describedby)
2. Icon buttons (aria-label)
3. Loading states (aria-busy)
4. Disabled states (aria-disabled)
5. List items (role, aria-selected)

**Example Refactor**:
```typescript
// ❌ OLD: No accessibility
<button onClick={() => setShowQrScanner(true)} style={{ ... }}>
  📷
</button>

// ✅ NEW: Accessible
<button
  onClick={() => setShowQrScanner(true)}
  aria-label="Scan QR code to fill recipient address"
  title="Scan QR code"
  style={{ ... }}
>
  📷
</button>
```

**Components Needing ARIA**:
- All `<Input>` elements: add `aria-describedby` to help text
- All icon buttons: add `aria-label`
- Loading indicators: add `aria-busy`
- Disabled inputs: add `aria-disabled`
- List items: add `role="option"`, `aria-selected`

### Phase 5.4c: Theme Consistency (Priority 3)

**Issues to Fix**:
1. Inconsistent spacing (some use 24px, some 32px)
2. Hardcoded colors instead of variables
3. Inconsistent border radius (8px vs 12px)
4. Different shadow depths

**Target Components**:
- Modal styling (currently inline)
- Card styling (currently mixed)
- List item styling (currently inline)
- Form groups (spacing inconsistency)

## Detailed Task Breakdown

### Task 5.4.1: Create CSS Module (2 hours)
Create `src/styles/components.css` with:
- `.input-base`, `.input-primary`, `.input-error`, `.input-disabled`
- `.button-primary`, `.button-secondary`, `.button-danger`
- `.card-base`, `.card-primary`, `.card-secondary`
- `.list-item`, `.list-item-hover`, `.list-item-selected`
- `.modal-overlay`, `.modal-content`
- `.form-group`, `.form-group-error`
- `.badge-success`, `.badge-warning`, `.badge-error`

### Task 5.4.2: Refactor Send.tsx (2-3 hours)
- Replace 20+ inline styles with CSS classes
- Add aria-label to QR scanner button
- Add aria-describedby to inputs with helpers
- Add aria-busy to submit button when loading
- Test that styling is identical after refactor

### Task 5.4.3: Refactor Mint.tsx (1.5 hours)
- Replace inline styles with utility classes
- Add ARIA labels to input fields
- Add aria-disabled to disabled submit button

### Task 5.4.4: Refactor Burn.tsx (1.5 hours)
- Replace modal inline styles with CSS
- Add ARIA labels to form inputs
- Add aria-label to confirmation modal buttons

### Task 5.4.5: Audit Other Components (1 hour)
- AddressBook.tsx
- TokenPage.tsx
- AdminDashboard.tsx
- Any other high-usage components

### Task 5.4.6: Test & Validation (1 hour)
- Visual regression testing (compare before/after)
- Accessibility testing with keyboard navigation
- Theme switching (light/dark mode) if applicable
- Mobile responsiveness check

## Testing Strategy

### Visual Regression Testing
```bash
# Before refactor: Screenshot all components
npm run screenshot:before

# After refactor: Screenshot all components
npm run screenshot:after

# Compare: Check for visual differences
diff screenshot:before screenshot:after
```

### Accessibility Testing
```bash
# Use browser DevTools Accessibility Inspector
# Check:
- All form inputs have labels
- All buttons have aria-label or visible text
- Keyboard navigation works (Tab, Enter, Escape)
- Focus indicators visible
- Loading states have aria-busy
```

### Manual Testing Checklist
- [ ] Send.tsx: All fields styled correctly
- [ ] Send.tsx: QR button has tooltip on hover
- [ ] Mint.tsx: Input fields have proper padding
- [ ] Burn.tsx: Confirmation modal is readable
- [ ] All buttons have visible focus states
- [ ] Disabled states are clearly indicated
- [ ] Helper text is associated with inputs
- [ ] Error messages are styled consistently

## Success Criteria

✅ All components use CSS variables (no hardcoded colors)  
✅ Inline styles reduced by 80%+  
✅ All form inputs have aria-labels  
✅ All icon buttons have aria-labels  
✅ Visual appearance identical to before refactor  
✅ Lighthouse accessibility score > 90  
✅ Build time < 3s  
✅ Zero console warnings  

## Dependencies

- No new dependencies needed
- Uses existing CSS variable system
- Leverages browser-native ARIA support

## Risk Assessment

**Risk: Visual Regression**
- Mitigation: Side-by-side screenshot comparison

**Risk: Accessibility Issues**
- Mitigation: Keyboard navigation testing after each component

**Risk: Build Performance**
- Mitigation: Monitor build time with each change

**Risk: Browser Compatibility**
- Mitigation: Test on major browsers (Chrome, Firefox, Safari)

## Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| 5.4.1 | 2h | Create CSS module |
| 5.4.2 | 2-3h | Refactor Send.tsx |
| 5.4.3 | 1.5h | Refactor Mint.tsx |
| 5.4.4 | 1.5h | Refactor Burn.tsx |
| 5.4.5 | 1h | Audit other components |
| 5.4.6 | 1h | Test & validation |
| **Total** | **8-9h** | **Complete Phase 5.4** |

## Definition of Done

- [ ] All CSS moved to `src/styles/components.css`
- [ ] All components use CSS variables
- [ ] All form inputs have proper ARIA attributes
- [ ] All icon buttons have aria-labels
- [ ] Build passes with no errors
- [ ] Visual appearance unchanged (screenshot verified)
- [ ] E2E tests pass (when test infrastructure is stable)
- [ ] Commit created with detailed message
- [ ] Completion report written

## Related Documentation

- [docs/CONFORMITE_CAHIER_DES_CHARGES.md](CONFORMITE_CAHIER_DES_CHARGES.md) - CSS architecture
- [docs/COMPONENTS.md](COMPONENTS.md) - Component patterns
- [docs/STYLING_GUIDE.md](STYLING_GUIDE.md) - Styling conventions
- [src/styles/themes.css](../src/styles/themes.css) - Available CSS variables

## Notes for Implementation

1. **Don't over-engineer**: Keep utility classes simple and focused
2. **Maintain flexibility**: Some layout-specific inline styles are OK
3. **Test accessibility**: Use browser DevTools Accessibility Inspector
4. **Verify visually**: Side-by-side comparisons are essential
5. **Keep commits small**: One component per commit for easy review

---

**Status**: 📋 Ready for implementation when Phase 5.1-5.3 is verified

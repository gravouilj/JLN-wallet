# 🎨 PHASE 5.4 - Design System Standardization Guide

**Status**: 🚀 Ready to Start  
**Estimated Duration**: 3-5 hours  
**Completion Trigger**: Phase 5.2 ✅ (Custom Hooks Extraction)  

---

## 📋 Overview

Phase 5.4 focuses on standardizing the design system across all components. This involves CSS variable consolidation, accessibility improvements, and component consistency.

**Foundation**: Clean code from Phase 5.2 enables consistent styling implementation.

---

## 🎯 Phase 5.4 Work Items

### 1️⃣ CSS Variable Consolidation (1.5 hours)

**File**: `src/styles/themes.css`

#### Design Tokens to Standardize
```css
/* Color System */
--primary: #0066cc
--secondary: #ff6600
--success: #00aa00
--warning: #ffaa00
--error: #cc0000
--text-primary: #000000
--text-secondary: #666666
--bg-primary: #ffffff
--bg-secondary: #f5f5f5
--border: #cccccc

/* Spacing System */
--spacing-xs: 4px
--spacing-sm: 8px
--spacing-md: 16px
--spacing-lg: 24px
--spacing-xl: 32px
--spacing-2xl: 48px

/* Typography */
--font-family-base: -apple-system, BlinkMacSystemFont
--font-size-xs: 12px
--font-size-sm: 14px
--font-size-md: 16px
--font-size-lg: 18px
--font-size-xl: 20px
--line-height-tight: 1.2
--line-height-normal: 1.5
--line-height-loose: 1.8

/* Shadows & Effects */
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05)
--shadow-md: 0 4px 6px rgba(0,0,0,0.1)
--shadow-lg: 0 10px 15px rgba(0,0,0,0.2)

/* Breakpoints */
--breakpoint-mobile: 400px
--breakpoint-tablet: 600px
--breakpoint-medium: 640px
--breakpoint-large: 768px
```

#### Target Components
- [ ] Card component styling
- [ ] Button component styling
- [ ] Input component styling
- [ ] Stack (layout) component

**Validation**: No visual regressions, consistent appearance across themes.

---

### 2️⃣ ARIA Accessibility Improvements (1.5 hours)

**Target Files**:
- `src/components/AddressBook/AddressBook.tsx`
- `src/components/Client/ClientTicketForm.tsx`
- `src/components/eCash/NetworkFeesAvail.tsx`
- `src/components/TokenPage/TokenPage.tsx`
- `src/components/Send/SendTab.tsx`

#### Accessibility Checklist

**Semantic HTML**
- [ ] Use semantic HTML tags (button, label, nav, main, etc.)
- [ ] Replace div-based buttons with actual `<button>` elements
- [ ] Use form elements (input, select, textarea) properly
- [ ] Structure headings hierarchically (h1 > h2 > h3)

**Keyboard Navigation**
- [ ] Tab order logical and visible
- [ ] Enter/Space triggers buttons
- [ ] Escape closes modals
- [ ] Arrow keys for lists/tabs
- [ ] Focus visible on all interactive elements

**Screen Reader Support**
- [ ] aria-label on icon-only buttons
- [ ] aria-description for complex components
- [ ] aria-live for dynamic content updates
- [ ] aria-current for active navigation items
- [ ] role attributes where semantic HTML insufficient

**Visual Accessibility**
- [ ] Color contrast >= 4.5:1 (AA standard)
- [ ] Focus indicators visible (2px minimum)
- [ ] Text size readable (minimum 14px)
- [ ] Icons have text alternatives

**Form Accessibility**
- [ ] `<label>` associated with inputs (htmlFor)
- [ ] aria-required on required fields
- [ ] aria-invalid on error states
- [ ] Error messages linked to inputs (aria-describedby)
- [ ] Disabled states clearly indicated

**Example Pattern**:
```jsx
// ❌ BEFORE - Not accessible
<div className="button" onClick={handleClick}>
  <img src="send.svg" />
</div>

// ✅ AFTER - Accessible
<button 
  onClick={handleClick}
  aria-label="Send transaction"
  className="button"
>
  <img src="send.svg" alt="" aria-hidden="true" />
  <span className="sr-only">Send transaction</span>
</button>
```

---

### 3️⃣ Component Consistency Audit (1.5 hours)

**Target Components**:
- `Send.tsx` / `SendTab.tsx`
- `Mint.tsx`
- `Burn.tsx`
- `AddressBook.tsx`
- `TokenPage.tsx`

#### Consistency Checklist

**Visual Consistency**
- [ ] Button styles unified (primary, secondary, danger, disabled)
- [ ] Input styling consistent (text color, border, padding)
- [ ] Card/Container spacing aligned
- [ ] Typography sizing consistent
- [ ] Color usage follows palette

**Interaction Patterns**
- [ ] Loading states shown consistently
- [ ] Error messages styled the same
- [ ] Success feedback provided uniformly
- [ ] Tooltips styled identically
- [ ] Modals have same appearance

**Responsive Design**
- [ ] Mobile (400px+) breakpoint applied
- [ ] Tablet (600px+) breakpoint applied
- [ ] Medium (640px+) breakpoint applied
- [ ] Desktop (768px+) breakpoint applied
- [ ] No horizontal scroll on mobile

**Spacing & Layout**
- [ ] Consistent padding inside containers
- [ ] Consistent gaps between items
- [ ] Alignment consistent (left, center, right)
- [ ] Grid/flex layouts uniform

**Example Audit Template**:
```jsx
// Consistency audit for Send component
const consistencyChecklist = {
  buttonStyles: {
    primary: "Uses --primary color ✅",
    disabled: "Uses opacity 0.5 ✅",
    focus: "Shows focus ring ❌ NEEDS FIX"
  },
  spacing: {
    containerPadding: "var(--spacing-lg) ✅",
    itemGap: "var(--spacing-md) ✅",
    topMargin: "inconsistent ❌ NEEDS FIX"
  },
  colors: {
    textPrimary: "var(--text-primary) ✅",
    errorText: "var(--error) ✅"
  }
};
```

---

### 4️⃣ Documentation & Migration Guide (0.5 hours)

**Create**: `docs/DESIGN_SYSTEM_V2.md`

#### Contents

1. **Design Token Reference**
   - Color palette with usage
   - Typography scale with examples
   - Spacing guide with visuals
   - Shadow system
   - Breakpoints documentation

2. **Component Patterns**
   - Button component patterns
   - Form component patterns
   - Layout patterns
   - Modals & overlays
   - Navigation patterns

3. **Accessibility Guidelines**
   - ARIA usage patterns
   - Keyboard navigation patterns
   - Color contrast requirements
   - Focus management

4. **Responsive Design**
   - Mobile-first approach
   - Breakpoint usage
   - Flexible layouts
   - Touch targets (44px minimum)

5. **Dark Mode Support**
   - CSS variable overrides
   - Testing dark mode
   - Contrast verification

---

## 📊 Implementation Order

**Day 1** (3 hours)
1. CSS Variable Consolidation (themes.css review)
2. Component styling audit (visual consistency)
3. Add focus indicators & basic ARIA labels

**Day 2** (2 hours)
1. Full ARIA accessibility sweep
2. Keyboard navigation testing
3. Form accessibility improvements
4. Documentation writing

---

## 🧪 Testing & Validation

### Build Verification
```bash
npm run build  # Should be <3.5s
npm run lint   # Should pass all rules
```

### Accessibility Testing
```bash
# Manual testing with keyboard
- Tab through all components
- Test with screen reader (VoiceOver/NVDA)
- Verify color contrast (use WebAIM tool)
- Check focus indicators visible

# Browser DevTools
- Lighthouse Accessibility audit
- Axe DevTools scanning
```

### Visual Testing
```bash
# Visual regression check
- Compare before/after screenshots
- Test all breakpoints (400px, 600px, 640px, 768px)
- Test light & dark modes
- Verify icons & images
```

---

## 📝 Deliverables Checklist

### Phase 5.4 Completion Criteria

**CSS Variables** ✅
- [ ] All design tokens defined in themes.css
- [ ] Color variables used consistently
- [ ] Spacing variables used consistently
- [ ] Typography variables used consistently
- [ ] No inline colors or values

**Accessibility** ✅
- [ ] All buttons semantic (`<button>` or proper role)
- [ ] All form inputs have labels
- [ ] All interactive elements keyboard accessible
- [ ] Color contrast >= 4.5:1 everywhere
- [ ] Focus indicators visible on all interactive elements
- [ ] Screen reader tested (basic flow)

**Component Consistency** ✅
- [ ] All components use same button styles
- [ ] All components use same spacing
- [ ] All components use same colors
- [ ] All components responsive at all breakpoints
- [ ] All error/success states styled consistently

**Documentation** ✅
- [ ] Design system guide created
- [ ] Component patterns documented
- [ ] Accessibility guidelines documented
- [ ] Migration guide for future development

**Testing** ✅
- [ ] Build passing (<3.5s)
- [ ] All tests passing (235/235)
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Visual regression test passed

---

## 🎯 Success Metrics

| Metric | Target | Method |
|--------|--------|--------|
| Build Time | <3.5s | `npm run build` |
| A11y Score | >90 | Lighthouse audit |
| Color Contrast | 4.5:1+ | WebAIM contrast checker |
| Keyboard Nav | 100% | Manual testing |
| Component Consistency | 95%+ | Visual audit |
| Test Coverage | 235/235 passing | `npm test` |

---

## 🔗 Related Documentation

- **Phase 5.2**: [PHASE_5_2_COMPLETE.md](../PHASE_5_2_COMPLETE.md)
- **CSS Architecture**: [docs/CONFORMITE_CAHIER_DES_CHARGES.md](../docs/CONFORMITE_CAHIER_DES_CHARGES.md)
- **Current Status**: [CURRENT_STATUS.md](../CURRENT_STATUS.md)
- **Components Guide**: [docs/COMPONENTS.md](../docs/COMPONENTS.md)

---

## ⏰ Timeline

**Estimated Start**: Now (Phase 5.2 complete)  
**Estimated Completion**: +3-5 hours  
**Next Phase**: Phase 5.5 (Performance Optimization)  

---

**Phase 5.4 Status**: 🚀 **READY TO START**

# 🚀 NEXT SESSION EXECUTION PLAN

**Session**: Phase 5.4 - Design System Implementation  
**Date**: Next Working Session  
**Duration**: 3-5 hours  
**Prerequisite**: Phase 5.2 Complete ✅  

---

## 📋 Quick Reference

### Current State
- ✅ Phase 5.2 (Custom Hooks): Complete
- ✅ 5 Custom hooks created (625 lines)
- ✅ 3 Major components refactored (-617 lines)
- ✅ All tests passing (235/235)
- ✅ Build stable (3.01s)

### What's Ready
- Phase 5.4 design system guide created
- Target components identified
- ARIA improvements documented
- CSS variable list prepared
- Accessibility checklist created

### Files to Reference
- `PHASE_5_2_COMPLETE.md` - What we just completed
- `PHASE_5_4_DESIGN_SYSTEM.md` - What we're about to do
- `CURRENT_STATUS.md` - Overall project status
- `src/styles/themes.css` - CSS variable definitions
- `docs/CONFORMITE_CAHIER_DES_CHARGES.md` - CSS architecture spec

---

## 🎯 Phase 5.4 Execution Steps

### Step 1: CSS Variable Audit (30 minutes)
**Objective**: Review current variables, identify gaps

**Commands**:
```bash
# Navigate to project
cd /Users/jlngrvl/Documents/GitHub/JLN-wallet

# Review current CSS variables
cat src/styles/themes.css | grep "^\s*--"

# Check which components use CSS variables
grep -r "var(" src/components/ | head -20

# Identify components NOT using variables
grep -r "color:" src/components/ --include="*.tsx" | grep -v "var("
grep -r "padding:" src/components/ --include="*.tsx" | grep -v "var("
```

**Checklist**:
- [ ] List all current CSS variables
- [ ] Identify missing standard variables
- [ ] Find components using hardcoded values
- [ ] Create comprehensive variable list

**Output**: Gap analysis document

---

### Step 2: CSS Variables Update (45 minutes)
**Objective**: Consolidate & standardize all design tokens

**File to Update**: `src/styles/themes.css`

**Tasks**:
1. Review existing variables
2. Add missing standard variables:
   - Color palette completeness
   - Spacing scale completeness
   - Typography completeness
   - Shadow system
   - Border radius system
3. Verify dark mode overrides
4. Test with `npm run build`

**Validation**:
```bash
npm run build  # Should still be ~3.0s
```

**Checklist**:
- [ ] All colors defined as variables
- [ ] All spacing as variables
- [ ] All typography as variables
- [ ] Dark mode variables working
- [ ] Build passes
- [ ] No visual regressions (visual check)

---

### Step 3: Component ARIA Audit (1.5 hours)
**Objective**: Add accessibility attributes to target components

**Target Components** (in order):
1. `src/components/AddressBook/AddressBook.tsx`
2. `src/components/Client/ClientTicketForm.tsx`
3. `src/components/eCash/NetworkFeesAvail.tsx`
4. `src/components/TokenPage/TokenPage.tsx`
5. `src/components/Send/SendTab.tsx` (if time)

**For Each Component**:
```
1. Convert divs to semantic HTML where possible
2. Add button role/aria-label to icon buttons
3. Add aria-label to form inputs
4. Add aria-required to required fields
5. Add aria-invalid to error states
6. Verify tab order is logical
7. Check focus indicators visible
8. Build & test (npm run build)
```

**Example Changes**:
```tsx
// ❌ BEFORE
<div onClick={handleDelete} className="button-icon">
  <TrashIcon />
</div>

// ✅ AFTER
<button 
  onClick={handleDelete}
  className="button-icon"
  aria-label="Delete contact"
  title="Delete contact"
>
  <TrashIcon aria-hidden="true" />
</button>
```

**Checklist** (per component):
- [ ] Buttons converted to `<button>` elements
- [ ] Form labels associated (htmlFor)
- [ ] Icon buttons have aria-label
- [ ] ARIA attributes added where needed
- [ ] Focus indicators visible
- [ ] Tab order logical
- [ ] Build passes

---

### Step 4: Component Consistency Pass (1 hour)
**Objective**: Ensure visual & interaction consistency

**Target**: Send, Mint, Burn, AddressBook, TokenPage

**Consistency Checks**:
1. Button styling
   - [ ] Primary buttons look the same
   - [ ] Secondary buttons look the same
   - [ ] Disabled states consistent
   - [ ] Hover/focus states consistent

2. Form styling
   - [ ] Input fields consistent
   - [ ] Label styling consistent
   - [ ] Error messages consistent
   - [ ] Help text consistent

3. Spacing & layout
   - [ ] Container padding consistent
   - [ ] Item gaps consistent
   - [ ] Alignment consistent
   - [ ] Responsive breakpoints applied

4. Colors
   - [ ] Primary color used consistently
   - [ ] Error color used consistently
   - [ ] Success color used consistently
   - [ ] Text colors consistent

**Validation Tool**:
```bash
# Create visual comparison (manual)
npm run dev  # localhost:5173
# Open 2 browsers side-by-side
# Compare Send vs Mint vs Burn tabs
# Verify consistent button styles, spacing, colors
```

**Checklist**:
- [ ] Visual consistency confirmed
- [ ] Responsive at all breakpoints
- [ ] No orphaned styles/colors
- [ ] All components follow design system

---

### Step 5: Documentation & Testing (30 minutes)
**Objective**: Document design system & verify all changes

**Tasks**:
1. Create design system guide
2. Run full test suite
3. Verify build performance
4. Visual regression check

**Commands**:
```bash
# Build verification
npm run build

# Lint verification
npm run lint

# Test verification
npm test

# Optional: Accessibility audit
# Use browser DevTools > Lighthouse > Accessibility
```

**Documentation**:
Create/update `docs/DESIGN_SYSTEM_V2.md` with:
- Design token reference
- Component patterns
- Accessibility guidelines
- Responsive design guide
- Dark mode support info

**Checklist**:
- [ ] Build passes (<3.5s)
- [ ] Linting passes
- [ ] Tests pass (235/235)
- [ ] No visual regressions
- [ ] Design system documented

---

## 📊 Phase 5.4 Completion Checklist

### CSS Variables
- [ ] All colors defined as variables
- [ ] All spacing as variables
- [ ] All typography as variables
- [ ] Shadows defined as variables
- [ ] Dark mode working correctly

### ARIA Accessibility
- [ ] All buttons semantic (`<button>` or role)
- [ ] All form inputs have labels
- [ ] All interactive elements keyboard accessible
- [ ] Color contrast >= 4.5:1 verified
- [ ] Focus indicators visible on all interactive elements
- [ ] Screen reader tested (basic flow)

### Component Consistency
- [ ] Button styles consistent across all components
- [ ] Form styling consistent
- [ ] Spacing consistent
- [ ] Colors used consistently
- [ ] Responsive at all breakpoints

### Testing & Documentation
- [ ] Build passing (<3.5s)
- [ ] All tests passing (235/235)
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Design system documented
- [ ] Accessibility guide documented

---

## 📁 Files to Create/Update

### New Files
- `docs/DESIGN_SYSTEM_V2.md` - Design system documentation

### Files to Update
- `src/styles/themes.css` - Add/consolidate CSS variables
- Target components (5 total):
  - `src/components/AddressBook/AddressBook.tsx`
  - `src/components/Client/ClientTicketForm.tsx`
  - `src/components/eCash/NetworkFeesAvail.tsx`
  - `src/components/TokenPage/TokenPage.tsx`
  - `src/components/Send/SendTab.tsx` (optional)

---

## ⏱️ Time Allocation

| Task | Duration | Start | End |
|------|----------|-------|-----|
| CSS Variable Audit | 30 min | 0:00 | 0:30 |
| CSS Variables Update | 45 min | 0:30 | 1:15 |
| ARIA Audit (5 components) | 90 min | 1:15 | 3:45 |
| Consistency Pass | 60 min | 3:45 | 4:45 |
| Documentation & Testing | 30 min | 4:45 | 5:15 |
| **Total** | **5h 15m** | | |

---

## 🎯 Success Criteria

**Phase 5.4 Complete When**:
- ✅ CSS variables consolidated & used throughout
- ✅ ARIA attributes added to 5 target components
- ✅ Button/form/spacing consistency verified
- ✅ All tests still passing (235/235)
- ✅ Build stable (<3.5s)
- ✅ No TypeScript/ESLint errors
- ✅ Design system documented

---

## 🔗 Related Resources

**Documentation Files**:
- [PHASE_5_2_COMPLETE.md](PHASE_5_2_COMPLETE.md) - What we completed
- [PHASE_5_4_DESIGN_SYSTEM.md](PHASE_5_4_DESIGN_SYSTEM.md) - Detailed Phase 5.4 guide
- [CURRENT_STATUS.md](CURRENT_STATUS.md) - Project status
- [docs/CONFORMITE_CAHIER_DES_CHARGES.md](docs/CONFORMITE_CAHIER_DES_CHARGES.md) - CSS architecture

**Code References**:
- `src/styles/themes.css` - CSS variables
- `src/components/UI.jsx` - UI component library
- `docs/COMPONENTS.md` - Component documentation

---

## 🚀 Git Workflow

**Commits for Phase 5.4**:
```bash
# After CSS variables update
git add src/styles/themes.css
git commit -m "refactor(Phase 5.4): Consolidate & standardize CSS variables"

# After ARIA audit
git add src/components/*/
git commit -m "accessibility(Phase 5.4): Add ARIA attributes to 5 target components"

# After consistency pass
git add src/components/
git commit -m "style(Phase 5.4): Ensure component consistency & update design tokens"

# After documentation
git add docs/
git commit -m "docs(Phase 5.4): Add comprehensive design system documentation"
```

---

## ⚠️ Important Notes

### Don't Forget
- [ ] Test at all breakpoints (400px, 600px, 640px, 768px)
- [ ] Verify dark mode still works
- [ ] Check focus indicators are visible
- [ ] Build after each major change
- [ ] Git commit frequently

### Common Pitfalls to Avoid
- ❌ Don't add Tailwind/Shadcn classes
- ❌ Don't use hardcoded colors (use variables)
- ❌ Don't forget ARIA labels on icon buttons
- ❌ Don't change component structure without reason
- ❌ Don't forget to test keyboard navigation

### Tools to Have Ready
- Terminal with `npm run dev` (watch mode)
- Browser DevTools (Accessibility audit)
- WebAIM Contrast Checker (online tool)
- Git for version control

---

## 📞 Quick Links

**Start Commands**:
```bash
cd /Users/jlngrvl/Documents/GitHub/JLN-wallet
npm run dev           # Start dev server (localhost:5173)
npm run build         # Verify build
npm run lint          # Check linting
npm test              # Run tests
```

**Review Files Before Starting**:
1. `PHASE_5_4_DESIGN_SYSTEM.md` - Phase overview
2. `src/styles/themes.css` - Current CSS variables
3. `src/components/UI.jsx` - UI component library

---

## 🎯 Final Checklist Before Starting

- [ ] Read `PHASE_5_4_DESIGN_SYSTEM.md` completely
- [ ] Review `src/styles/themes.css`
- [ ] Check `CURRENT_STATUS.md` for overall state
- [ ] Ensure all tests passing (`npm test`)
- [ ] Verify build working (`npm run build`)
- [ ] Terminal ready for commands
- [ ] Browser ready for visual testing

---

**Ready to Start Phase 5.4**: 🚀 **YES**

Execute this plan systematically, commit frequently, and verify build/tests after each major change.

**Expected Output**: Phase 5.4 Complete ✅ → Ready for Phase 5.5 Performance Optimization

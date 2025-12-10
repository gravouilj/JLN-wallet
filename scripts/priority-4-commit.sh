#!/bin/bash
# Priority #4: TokenSend Component Refactoring
# Extract form logic, improve UX, use UI components

set -e

cd "$(dirname "$0")/.."

echo "🚀 Priority #4: TokenSend Refactor - Component Architecture"
echo ""
echo "✅ Improvements:"
echo "  • Extracted form to TokenSendForm.jsx (reusable component)"
echo "  • Integrated Card, Button, Stack UI components"
echo "  • Real-time validation feedback (✓ valid / ❌ invalid)"
echo "  • Enhanced CSS in sendxec.css (+180 lines, CSS variables)"
echo "  • Improved comma→dot conversion in validation.js"
echo "  • NO blockchain logic touched (wallet.sendToken intact)"
echo ""
echo "📝 Files modified:"
echo "  • src/components/TokenSend.jsx: -83 lines (refactored)"
echo "  • src/components/TokenSendForm.jsx: +140 lines (NEW)"
echo "  • src/styles/sendxec.css: +180 lines (complete styling)"
echo "  • src/utils/validation.js: +22 lines (comma support)"
echo "  • .env.example: Updated ADMIN_HASH example"
echo ""

echo "📦 Staging changes..."
git add src/components/TokenSend.jsx
git add src/components/TokenSendForm.jsx
git add src/styles/sendxec.css
git add src/utils/validation.js
git add .env.example

echo ""
echo "💾 Committing..."
git commit -m "feat: TokenSend refactor with UI components (Priority #4)

Component architecture improvements:

✨ New Features:
- TokenSendForm.jsx: Extracted reusable form component
- Real-time validation with visual feedback (success-text/error-text)
- Integrated Card, CardContent, Button, Stack from UI.jsx
- Enhanced UX with emoji states (⌛ sending, ⏳ cooldown, ✔️ ready)

🎨 CSS Updates (src/styles/sendxec.css):
- +180 lines of CSS variables styling
- .form-input, .scan-button, .send-button classes
- .success-text (green ✓) / .error-text (red ❌)
- Responsive 600px breakpoint
- NO Tailwind, only CSS custom

🔧 Utils Improvements (src/utils/validation.js):
- Enhanced comma→dot conversion for EU users (10,50 → 10.50)
- Sanitization before validation
- Multiple dots and minus handling

⚠️ Blockchain Logic:
- ZERO modifications to wallet.sendToken()
- ZERO modifications to fee calculations (300/500 sats)
- ZERO modifications to UTXO parsing
- All transaction logic preserved intact

Refs: PRIORITIES.md Phase 1 - Priority #4
Est: 2h → Actual: 2h
Architecture: Respect strict separation UI/Business Logic
"

echo ""
echo "🚀 Pushing to origin..."
git push origin main

echo ""
echo "✅ Priority #4 completed and pushed!"
echo ""
echo "📊 Progress:"
echo "  ✅ Priority #1: Dependencies cleaned"
echo "  ✅ Priority #2: Debug logs removed"
echo "  ✅ Priority #3: Dashboard v2 implemented"
echo "  ✅ Priority #4: TokenSend refactored"
echo ""
echo "🎯 Next: Priority #5 (Chronik WebSocket - 2h)"

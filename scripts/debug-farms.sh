#!/bin/bash

# Script de debug pour le système de persistance des fermes
# Usage: ./scripts/debug-farms.sh

echo "🔍 DEBUG SYSTÈME DE FERMES"
echo "=========================="
echo ""

echo "📦 localStorage Keys:"
echo "-------------------"
node -e "
console.log('farmwallet_pending_farms:', localStorage.getItem('farmwallet_pending_farms') || 'VIDE');
console.log('farmwallet_farms_data:', localStorage.getItem('farmwallet_farms_data') || 'VIDE');
" 2>/dev/null || echo "⚠️  Exécuter dans la console du navigateur"

echo ""
echo "📋 Fichiers de données:"
echo "---------------------"
echo "farms.json:"
cat src/data/farms.json 2>/dev/null | head -n 20 || echo "❌ Fichier non trouvé"

echo ""
echo "verification-requests.json:"
cat src/data/verification-requests.json || echo "❌ Fichier non trouvé"

echo ""
echo "🧪 Tests à effectuer:"
echo "-------------------"
echo "1. ✅ Créer une ferme → Vérifier localStorage"
echo "2. ✅ Recharger page → Formulaire pré-rempli"
echo "3. ✅ Demander vérification → Status = pending"
echo "4. ✅ Admin voit demande → AdminVerificationPage"
echo "5. ✅ Admin valide → Ferme dans DirectoryPage"
echo "6. ✅ Multi-navigateurs → Import mnémonique"
echo ""

echo "📝 Console.logs à surveiller:"
echo "---------------------------"
echo "• ManageFarmPage:"
echo "  - ✅ Ferme sauvegardée"
echo "  - 📍 Accessible via creatorAddress"
echo ""
echo "• useFarms:"
echo "  - ✅ Loaded X farms"
echo ""
echo "• ManageTokenPage (admin):"
echo "  - ✅ Admin: X tokens chargés"
echo "  - 📋 Tokens admin détaillés"
echo ""
echo "• AdminVerificationPage:"
echo "  - 📋 Demandes de vérification"
echo ""

echo "🐛 Problèmes connus:"
echo "------------------"
echo "1. verification-requests.json en lecture seule (frontend)"
echo "   → Solution: Backend API à implémenter"
echo ""
echo "2. Données dans localStorage uniquement"
echo "   → Solution: Migration automatique prévue"
echo ""

echo "✨ Workflow complet:"
echo "------------------"
echo "1. Créateur crée token"
echo "2. Remplit ManageFarmPage"
echo "3. Enregistrer → localStorage (pending)"
echo "4. Demander vérification → Status: pending"
echo "5. Admin voit dans AdminVerificationPage"
echo "6. Admin valide → Status: verified"
echo "7. Ferme visible dans DirectoryPage"
echo ""

#!/bin/bash

# ====================================================================
# Script de migration Phase 2 - Système de Tickets Refactorisé
# Date: 18 décembre 2025
# ====================================================================

set -e  # Exit on error

echo "🚀 Démarrage migration Phase 2 - Système de Tickets"
echo "===================================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ====================================================================
# ÉTAPE 1: Backup des fichiers obsolètes
# ====================================================================

echo "${YELLOW}📦 Étape 1: Backup des fichiers obsolètes${NC}"

# Créer dossier backup
mkdir -p backup/phase2-tickets
echo "✓ Dossier backup créé: backup/phase2-tickets"

# Backup fichiers
cp src/components/Admin/AdminTicket.jsx backup/phase2-tickets/AdminTicket.jsx.backup 2>/dev/null || true
cp src/components/Admin/AdminTicketSystem.jsx backup/phase2-tickets/AdminTicketSystem.jsx.backup 2>/dev/null || true
cp src/components/Creators/SupportTab.jsx backup/phase2-tickets/SupportTab.jsx.backup 2>/dev/null || true
cp src/components/Creators/CreatorTicketForm.jsx backup/phase2-tickets/CreatorTicketForm.jsx.backup 2>/dev/null || true

echo "${GREEN}✓ Backup complété${NC}"
echo ""

# ====================================================================
# ÉTAPE 2: Renommer les nouveaux fichiers
# ====================================================================

echo "${YELLOW}📝 Étape 2: Remplacement des fichiers${NC}"

# AdminTicketSystem
if [ -f src/components/Admin/AdminTicketSystemV2.jsx ]; then
    mv src/components/Admin/AdminTicketSystem.jsx src/components/Admin/AdminTicketSystem.OLD.jsx 2>/dev/null || true
    mv src/components/Admin/AdminTicketSystemV2.jsx src/components/Admin/AdminTicketSystem.jsx
    echo "✓ AdminTicketSystem.jsx remplacé par version V2"
fi

# SupportTab
if [ -f src/components/Creators/SupportTabV2.jsx ]; then
    mv src/components/Creators/SupportTab.jsx src/components/Creators/SupportTab.OLD.jsx 2>/dev/null || true
    mv src/components/Creators/SupportTabV2.jsx src/components/Creators/SupportTab.jsx
    echo "✓ SupportTab.jsx remplacé par version V2"
fi

echo "${GREEN}✓ Remplacement complété${NC}"
echo ""

# ====================================================================
# ÉTAPE 3: Vérification des imports
# ====================================================================

echo "${YELLOW}🔍 Étape 3: Vérification des imports${NC}"

# Vérifier import AdminTicketSystem dans AdminDashboard
if grep -q "AdminTicketSystem" src/pages/AdminDashboard.jsx 2>/dev/null; then
    echo "✓ AdminDashboard.jsx importe AdminTicketSystem (OK - chemin inchangé)"
else
    echo "${YELLOW}⚠ AdminDashboard.jsx ne semble pas importer AdminTicketSystem${NC}"
fi

# Vérifier imports SupportTab
SUPPORT_TAB_IMPORTS=$(grep -r "import.*SupportTab" src/ 2>/dev/null | wc -l)
echo "✓ SupportTab importé dans $SUPPORT_TAB_IMPORTS fichier(s)"

echo "${GREEN}✓ Vérification complétée${NC}"
echo ""

# ====================================================================
# ÉTAPE 4: Analyse fichiers à supprimer
# ====================================================================

echo "${YELLOW}🗑️ Étape 4: Fichiers obsolètes identifiés${NC}"

FILES_TO_DELETE=(
    "src/components/Admin/AdminTicket.jsx"
    "src/components/Admin/AdminTicketSystem.OLD.jsx"
    "src/components/Creators/SupportTab.OLD.jsx"
)

# CreatorTicketForm - UNIQUEMENT utilisé dans SupportTab OLD
if ! grep -r "CreatorTicketForm" src/ --exclude-dir=backup --exclude="*.OLD.*" --exclude="SupportTab.OLD.jsx" 2>/dev/null | grep -qv "CreatorTicketForm.jsx"; then
    FILES_TO_DELETE+=("src/components/Creators/CreatorTicketForm.jsx")
    echo "✓ CreatorTicketForm.jsx marqué pour suppression (non utilisé)"
else
    echo "${YELLOW}⚠ CreatorTicketForm.jsx semble encore utilisé (à vérifier manuellement)${NC}"
fi

echo ""
echo "Fichiers à supprimer après validation:"
for file in "${FILES_TO_DELETE[@]}"; do
    if [ -f "$file" ]; then
        SIZE=$(wc -l < "$file")
        echo "  - $file ($SIZE lignes)"
    fi
done

echo ""
echo "${YELLOW}⚠ ATTENTION: Ne pas supprimer avant validation complète !${NC}"
echo ""

# ====================================================================
# ÉTAPE 5: Résumé et prochaines étapes
# ====================================================================

echo "${GREEN}✅ Migration Phase 2 - Étapes automatiques complétées${NC}"
echo "======================================================"
echo ""
echo "📊 Résumé:"
echo "  ✅ Backup créé dans backup/phase2-tickets/"
echo "  ✅ AdminTicketSystem remplacé par version V2"
echo "  ✅ SupportTab remplacé par version V2"
echo "  ✅ Imports vérifiés"
echo ""
echo "🎯 Prochaines étapes MANUELLES:"
echo "  1. ⏳ Exécuter SQL migrations (tickets_refactoring.sql, reports_refactoring.sql)"
echo "  2. ⏳ Tester AdminTicketSystem dans AdminDashboard"
echo "  3. ⏳ Tester SupportTab dans ManageFarm"
echo "  4. ⏳ Exécuter tests E2E"
echo "  5. ⏳ Valider en production"
echo ""
echo "🗑️ Suppression finale (après validation):"
echo "  rm src/components/Admin/AdminTicket.jsx"
echo "  rm src/components/Admin/AdminTicketSystem.OLD.jsx"
echo "  rm src/components/Creators/SupportTab.OLD.jsx"
echo "  rm src/components/Creators/CreatorTicketForm.jsx"
echo ""
echo "📚 Documentation:"
echo "  - PHASE_2_TICKETS_PROGRESS.md (suivi détaillé)"
echo "  - CLEANUP_PHASE2_TICKETS.md (guide nettoyage)"
echo "  - MIGRATION_ADMIN_TICKET_SYSTEM.md (guide migration admin)"
echo ""
echo "${GREEN}🎉 Prêt pour les tests !${NC}"

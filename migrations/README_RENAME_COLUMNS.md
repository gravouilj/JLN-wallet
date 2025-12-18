# Migration de renommage des colonnes - Instructions

## Date : 2025-12-18

### Modifications apportées

#### 1. Migration SQL créée
**Fichier :** `migrations/2025-12-18_rename_columns_consistency.sql`

Cette migration renomme :
- `tickets.farm_id` → `tickets.profile_id`
- `profile_reports.visible_to_farmer` → `profile_reports.visible_to_profile` (si existante)

#### 2. Fichiers JavaScript/JSX mis à jour (10 fichiers)

✅ **Services**
- `src/services/antifraudService.js` : `.eq('profile_id', profileId)`
- `src/services/tokenLinkedService.js` : `.eq('profile_id', profilId)`

✅ **Composants**
- `src/components/NotificationBell.jsx` : 3 occurrences corrigées
- `src/components/Creators/SupportTab.jsx` : 3 requêtes Supabase corrigées
- `src/components/Creators/CreatorTicketForm.jsx` : `profile_id: profilId`
- `src/components/Client/ClientTicketForm.jsx` : `ticketData.profile_id`
- `src/components/Client/ClientTicketsList.jsx` : `!ticket.profile_id`

✅ **Migrations**
- `migrations/2025-12-18_anti_fraud_system.sql` : 2 occurrences corrigées

### Ordre d'exécution

1. **Exécuter la migration SQL dans Supabase** :
   ```sql
   -- Copier/coller le contenu de migrations/2025-12-18_rename_columns_consistency.sql
   ```

2. **Vérifier que la colonne a bien été renommée** :
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'tickets' 
   AND column_name = 'profile_id';
   ```

3. **Redémarrer l'application** (si nécessaire)
   ```bash
   npm run dev
   ```

### Cohérence de la nomenclature

Après cette migration, toutes les tables utilisent la nomenclature cohérente :
- ✅ `profiles` (table principale)
- ✅ `profile_reports.profil_id` (signalements)
- ✅ `profile_history` (historique suppressions)
- ✅ `tickets.profile_id` (tickets support)
- ✅ `admin_whitelist` (admins)
- ✅ `admin_actions` (actions admin)

### Tables de l'ancien système (à ignorer)
- ❌ `farms` → migrée vers `profiles`
- ❌ `farm_reports` → migrée vers `profile_reports`
- ❌ `farm_id` → renommée `profile_id`

### Impact sur les RLS policies

Les policies RLS dans `2025-12-16_tickets_rls_policies.sql` référencent `farm_id`.
**Note :** Ces policies seront automatiquement mises à jour par Supabase lors du renommage de colonne via `ALTER TABLE RENAME COLUMN`.

### Vérifications post-migration

1. ✅ Connexion wallet fonctionne
2. ✅ Chargement des tickets dans SupportTab
3. ✅ Création de tickets (créateur + client)
4. ✅ Notifications de tickets
5. ✅ Système anti-fraude (blocage création/import)

---

**Status :** Prêt à déployer
**Temps estimé :** < 5 secondes (renommage de colonnes)
**Rollback possible :** Oui (renommer profile_id → farm_id)

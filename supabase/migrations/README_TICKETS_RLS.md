# Application de la Migration RLS pour les Tickets

## Problème résolu
L'erreur `new row violates row-level security policy for table "tickets"` se produit car Supabase a activé RLS (Row Level Security) sur la table `tickets` mais aucune policy n'a été définie pour permettre les insertions.

## Solution

### Option 1 : Via l'interface Supabase Dashboard (Recommandé)

1. **Connectez-vous à votre projet Supabase** : https://app.supabase.com

2. **Accédez au SQL Editor** :
   - Dans le menu latéral gauche, cliquez sur "SQL Editor"

3. **Exécutez la migration** :
   - Copiez le contenu du fichier `2025-12-16_tickets_rls_policies.sql`
   - Collez-le dans l'éditeur SQL
   - Cliquez sur "Run" pour exécuter

4. **Vérifiez que les policies sont créées** :
   - Allez dans "Database" → "Policies"
   - Recherchez la table `tickets`
   - Vous devriez voir plusieurs policies créées

### Option 2 : Via Supabase CLI

```bash
# Si vous avez Supabase CLI installé
supabase db push

# Ou appliquez la migration manuellement
supabase db reset --db-url "your-connection-string"
```

### Option 3 : Désactiver temporairement RLS (Non recommandé pour production)

**⚠️ ATTENTION : Cette option désactive la sécurité au niveau des lignes. À utiliser uniquement en développement.**

```sql
-- Désactiver RLS sur la table tickets (TEMPORAIRE)
ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;

-- Désactiver RLS sur ticket_messages
ALTER TABLE ticket_messages DISABLE ROW LEVEL SECURITY;
```

## Policies créées

La migration crée les policies suivantes :

### Pour la table `tickets` :
1. **"Creators can create their own tickets"** - Permet aux créateurs et clients de créer des tickets
2. **"Creators can read their own tickets"** - Permet de lire ses propres tickets
3. **"Admins have full access to tickets"** - Accès complet pour les admins
4. **"Anyone can create tickets"** - Fallback pour utilisateurs non authentifiés
5. **"Users can view their own tickets via created_by"** - Lecture via l'adresse created_by

### Pour la table `ticket_messages` :
1. **"Users can read messages from their tickets"** - Lecture des messages de ses tickets
2. **"Users can add messages to their tickets"** - Ajout de messages à ses tickets
3. **"Admins have full access to ticket messages"** - Accès complet admin

## Test après migration

1. Essayez de créer un ticket depuis l'interface
2. Vérifiez que "Mes tickets de support" affiche correctement les tickets
3. Testez la création de ticket depuis Settings (ClientTicketForm)

## En cas de problème

Si les erreurs persistent :

1. **Vérifiez que la migration a bien été appliquée** :
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'tickets';
   ```

2. **Vérifiez que RLS est activé** :
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'tickets';
   ```

3. **Consultez les logs Supabase** :
   - Dans le dashboard, allez dans "Logs" → "Database"
   - Recherchez les erreurs liées aux policies

## Alternative simple (si les policies ne fonctionnent pas)

Si vous rencontrez toujours des problèmes avec les policies JWT/wallet_address, utilisez cette version simplifiée :

```sql
-- Supprimer toutes les policies existantes
DROP POLICY IF EXISTS "Creators can create their own tickets" ON tickets;
DROP POLICY IF EXISTS "Creators can read their own tickets" ON tickets;
DROP POLICY IF EXISTS "Admins have full access to tickets" ON tickets;
DROP POLICY IF EXISTS "Anyone can create tickets" ON tickets;
DROP POLICY IF EXISTS "Users can view their own tickets via created_by" ON tickets;

-- Policy ultra-permissive pour le développement
CREATE POLICY "Allow all operations on tickets"
ON tickets
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Même chose pour ticket_messages
DROP POLICY IF EXISTS "Users can read messages from their tickets" ON ticket_messages;
DROP POLICY IF EXISTS "Users can add messages to their tickets" ON ticket_messages;
DROP POLICY IF EXISTS "Admins have full access to ticket messages" ON ticket_messages;

CREATE POLICY "Allow all operations on ticket_messages"
ON ticket_messages
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);
```

**⚠️ Cette version ultra-permissive est à utiliser uniquement en développement !**

# Schéma Supabase - Tables Principales

**Dernière mise à jour** : Janvier 2026  
**Client** : `src/services/supabaseClient.ts`

---

## Table `profiles`

Table principale pour les profils créateurs/entreprises.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_address TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Statut
  status TEXT DEFAULT 'active',
  -- Valeurs: 'active', 'banned', 'deleted', 'suspended', 'draft'
  
  -- Vérification
  verification_status TEXT DEFAULT 'none',
  -- Valeurs: 'none', 'pending', 'verified', 'rejected', 'info_requested'
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP WITH TIME ZONE,
  admin_message TEXT,
  
  -- Localisation
  location_country TEXT,
  location_region TEXT,
  location_department TEXT,
  city TEXT,
  postal_code TEXT,
  street_address TEXT,
  address_complement TEXT,
  
  -- Contact
  phone TEXT,
  email TEXT,
  website TEXT,
  
  -- Réseaux sociaux (JSONB)
  socials JSONB DEFAULT '{}'::jsonb,
  -- Structure: { facebook, instagram, tiktok, youtube, whatsapp, telegram }
  
  -- Activité
  products JSONB DEFAULT '[]'::jsonb,
  services JSONB DEFAULT '[]'::jsonb,
  
  -- Certifications (JSONB)
  certifications JSONB DEFAULT '{}'::jsonb,
  -- Structure: { label, url, is_active }
  
  -- Tokens associés (JSONB Array)
  tokens JSONB DEFAULT '[]'::jsonb,
  -- Structure: [{ tokenId, ticker, name, decimals, image, purpose, counterpart, isVisible, isLinked, isActive, isDeleted }]
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_profiles_owner_address ON profiles(owner_address);
CREATE INDEX idx_profiles_verification_status ON profiles(verification_status);
CREATE INDEX idx_profiles_verified ON profiles(verified);
CREATE INDEX idx_profiles_status ON profiles(status);
```

---

## Table `tickets`

Système de support et communication.

```sql
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open',
  -- Valeurs: 'open', 'awaiting_reply', 'in_progress', 'resolved', 'closed'
  priority TEXT DEFAULT 'normal',
  -- Valeurs: 'low', 'normal', 'high', 'urgent'
  category TEXT,
  
  -- Création
  created_by_address TEXT NOT NULL,
  created_by_role TEXT DEFAULT 'client',
  -- Valeurs: 'client', 'creator', 'admin'
  
  -- Relations
  token_id TEXT,
  profile_id UUID REFERENCES profiles(id),
  
  -- Messages (JSONB Array)
  messages JSONB DEFAULT '[]'::jsonb,
  -- Structure: [{ id, author, author_address, message, type, timestamp, read, attachments }]
  
  -- Métadonnées
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_created_by ON tickets(created_by_address);
CREATE INDEX idx_tickets_token ON tickets(token_id);
```

---

## Table `admins`

Gestion des administrateurs.

```sql
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL UNIQUE,
  admin_name TEXT NOT NULL,
  admin_role TEXT DEFAULT 'moderator',
  -- Valeurs: 'moderator', 'super_admin'
  
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by TEXT
);

CREATE INDEX idx_admins_wallet ON admins(wallet_address);
```

---

## Table `admin_actions`

Historique des actions administratives.

```sql
CREATE TABLE admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  -- Valeurs: 'add_admin', 'remove_admin', 'unblock_profile', 'block_profile'
  admin_wallet TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_actions_type ON admin_actions(action_type);
CREATE INDEX idx_admin_actions_wallet ON admin_actions(admin_wallet);
```

---

## Types TypeScript

Les types correspondants sont définis dans `src/types/index.ts` :

```typescript
interface UserProfile {
  id: string;
  owner_address: string;
  name: string;
  description?: string;
  status?: 'active' | 'banned' | 'deleted' | 'suspended' | 'draft';
  verification_status?: 'none' | 'pending' | 'verified' | 'rejected' | 'info_requested';
  verified?: boolean;
  tokens?: TokenDataFromProfile[];
  location_country?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
  socials?: { facebook?, instagram?, tiktok?, youtube?, whatsapp?, telegram? };
  // ...
}

interface Ticket {
  id: string;
  subject: string;
  status: 'open' | 'awaiting_reply' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  messages: TicketMessage[];
  // ...
}
```

---

## Workflow de Vérification

1. **Création profil** : `verification_status = 'none'`, `verified = false`
2. **Demande de vérification** : `verification_status = 'pending'`
3. **Admin valide** : `verification_status = 'verified'`, `verified = true`, `verified_at = NOW()`
4. **Admin demande info** : `verification_status = 'info_requested'`, `admin_message = "..."`
5. **Admin rejette** : `verification_status = 'rejected'`

---

## Services Associés

- **profilService.ts** : CRUD profils, vérification
- **ticketService.ts** : Gestion tickets
- **adminService.ts** : Actions admin

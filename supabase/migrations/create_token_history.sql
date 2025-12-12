-- Création de la table token_history pour l'historique des actions sur les tokens
CREATE TABLE IF NOT EXISTS token_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_address TEXT NOT NULL,
  token_id TEXT NOT NULL,
  token_ticker TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('SEND', 'MINT', 'BURN', 'AIRDROP', 'CREATE', 'IMPORT')),
  amount TEXT,
  tx_id TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances des requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_token_history_owner ON token_history(owner_address);
CREATE INDEX IF NOT EXISTS idx_token_history_token_id ON token_history(token_id);
CREATE INDEX IF NOT EXISTS idx_token_history_created_at ON token_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_history_action_type ON token_history(action_type);

-- Activation du Row Level Security (RLS)
ALTER TABLE token_history ENABLE ROW LEVEL SECURITY;

-- Politique : Tout le monde peut lire
CREATE POLICY "Allow public read access"
  ON token_history
  FOR SELECT
  USING (true);

-- Politique : Tout le monde peut insérer
CREATE POLICY "Allow public insert access"
  ON token_history
  FOR INSERT
  WITH CHECK (true);

-- Politique : Tout le monde peut mettre à jour (optionnel, pour corrections futures)
CREATE POLICY "Allow public update access"
  ON token_history
  FOR UPDATE
  USING (true);

-- Commentaires pour documentation
COMMENT ON TABLE token_history IS 'Historique des actions effectuées sur les tokens (envoi, mint, burn, airdrop, etc.)';
COMMENT ON COLUMN token_history.owner_address IS 'Adresse eCash de l''utilisateur ayant effectué l''action';
COMMENT ON COLUMN token_history.token_id IS 'ID du token concerné par l''action';
COMMENT ON COLUMN token_history.token_ticker IS 'Ticker du token pour affichage rapide';
COMMENT ON COLUMN token_history.action_type IS 'Type d''action : SEND, MINT, BURN, AIRDROP, CREATE, IMPORT';
COMMENT ON COLUMN token_history.amount IS 'Montant de tokens concernés (stocké en texte pour préserver la précision)';
COMMENT ON COLUMN token_history.tx_id IS 'ID de transaction blockchain (peut être null pour les imports)';
COMMENT ON COLUMN token_history.details IS 'Détails supplémentaires en JSON (destinataire, nombre de holders, etc.)';
COMMENT ON COLUMN token_history.created_at IS 'Date et heure de l''action';

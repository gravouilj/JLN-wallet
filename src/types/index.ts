// Definitions globales pour JLN Wallet

// --- Wallet & Blockchain ---

export interface Utxo {
  outpoint: {
    txid: string;
    outIdx: number;
  };
  value?: number;
  sats?: number | bigint; // Chronik peut renvoyer l'un ou l'autre
  script?: string;
  isBlockCoinbase?: boolean;
  token?: {
    tokenId: string;
    amount: string; // Souvent string dans l'API
    atoms?: string | bigint;
    isMintBaton: boolean;
  };
}

export interface BalanceBreakdown {
  spendableBalance: number;
  totalBalance: number;
  tokenDustValue: number;
  pureXecUtxos: number;
  tokenUtxos: number;
}

export interface WalletBalance {
  balance: number; // En XEC (float)
  balanceSats: number; // En Satoshis (int)
  totalBalance: number;
  balanceBreakdown: BalanceBreakdown;
  utxos: {
    pureXec: Utxo[];
    token: Utxo[];
  };
}

export interface TokenBalance {
  balance: string; // BigInt converti en string
  utxos: Utxo[];
}

export interface GenesisInfo {
  tokenName?: string;
  tokenTicker?: string;
  url?: string;
  decimals?: number;
  authPubkey?: string; // Si présent = MintBaton existe potentiellement
  circulatingSupply?: string;
  genesisSupply?: string;
  mintAmount?: string;
}

export interface TokenInfo {
  tokenId: string;
  tokenType: string;
  ticker: string;
  name: string;
  decimals: number;
  url: string;
  hash?: string;
  timeFirstSeen: string | number;
  genesisInfo: GenesisInfo;
}

export interface MintBaton {
  tokenId: string;
  utxo: Utxo;
  isMintBaton: boolean;
  protocol: string;
}

// --- App & Profils ---

export interface TokenDataFromProfile {
  tokenId: string;
  ticker?: string;
  name?: string;
  decimals?: number;
  image?: string;
  purpose?: string;
  counterpart?: string;
  isVisible?: boolean;
  isLinked?: boolean;
}

export interface UserProfile {
  id: string;
  owner_address: string;
  name: string;
  description?: string;
  status?: 'active' | 'banned' | 'deleted';
  verification_status?: 'none' | 'pending' | 'verified' | 'rejected';
  verified?: boolean;
  tokens?: TokenDataFromProfile[];
  // Ajoute les champs sociaux si besoin
}
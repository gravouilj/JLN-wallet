import React from 'react';

// --- Base UI (Pour régler les erreurs de props 'style', 'className', etc.) ---
export interface BaseUIProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
}

// --- Wallet & Blockchain ---
export interface Utxo {
  outpoint: {
    txid: string;
    outIdx: number;
  };
  value?: number;
  sats?: number | bigint;
  script?: string;
  isBlockCoinbase?: boolean;
  token?: {
    tokenId: string;
    amount: string;
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
  balance: number;
  balanceSats: number;
  totalBalance: number;
  balanceBreakdown: BalanceBreakdown;
  utxos: {
    pureXec: Utxo[];
    token: Utxo[];
  };
}

export interface GenesisInfo {
  tokenName?: string;
  tokenTicker?: string;
  url?: string;
  decimals?: number;
  authPubkey?: string;
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
  isFromJlnWallet?: boolean;
  isActive?: boolean;
  isDeleted?: boolean;
}

export interface UserProfile {
  id: string;
  owner_address: string;
  name: string;
  description?: string;
  status?: 'active' | 'banned' | 'deleted' | 'suspended' | 'draft';
  verification_status?: 'none' | 'pending' | 'verified' | 'rejected' | 'info_requested';
  verified?: boolean;
  tokens?: TokenDataFromProfile[];
  
  // Champs manquants identifiés dans l'audit
  location_country?: string;
  location_region?: string;
  location_department?: string;
  city?: string;
  postal_code?: string;
  street_address?: string;
  address_complement?: string;
  phone?: string;
  email?: string;
  website?: string;
  socials?: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    whatsapp?: string;
    telegram?: string;
  };
  products?: any[]; // À affiner si possible
  services?: any[]; // À affiner si possible
  certifications?: {
    label?: string;
    url?: string;
    is_active?: boolean;
  };
  
  communication_history?: Array<TicketMessage>;
  conversation_closed?: boolean;
  admin_message?: string;
  admin_status?: string;
  verified_at?: string | null;
  updated_at?: string;
  created_at?: string;
  profile_reports?: Array<any>;
}

// --- Admin System ---
export interface AdminRecord {
  id: string;
  admin_name: string;
  admin_role: 'moderator' | 'super_admin';
  wallet_address: string;
  added_at: string;
  added_by: string | null;
}

export interface AdminAction {
  id: string;
  action_type: 'add_admin' | 'remove_admin' | 'unblock_profile' | 'block_profile';
  admin_wallet: string;
  created_at: string;
  reason: string;
}

// --- Support & Ticket System ---
export interface TicketMessage {
  id?: string;
  author: string; // address ou 'admin'
  author_address?: string;
  message: string;
  content?: string; // Alias pour message
  type?: 'text' | 'image' | 'system';
  timestamp?: string;
  read?: boolean;
  attachments?: string[];
}

export interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: 'open' | 'awaiting_reply' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: string;
  created_at: string;
  updated_at: string;
  created_by_address: string;
  created_by_role: 'client' | 'creator' | 'admin';
  token_id?: string | null;
  profile_id?: string | null;
  messages: TicketMessage[];
  metadata?: Record<string, any>;
}
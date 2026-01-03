import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAtom } from 'jotai';
import { useTranslation } from '../../../hooks/useTranslation';
import { useEcashBalance, useEcashToken, useEcashWallet } from '../../../hooks/useEcashWallet';
import { currencyAtom } from '../../../atoms';
import { useXecPrice } from '../../../hooks/useXecPrice';
import { formatTokenBalance } from '../utils/formatTokenBalance';
import { 
  TokenHeroSection, 
  TokenPurposeCard, 
  CreatorSocialLinks, 
  CreatorContactCard, 
  CreatorActions 
} from './ImmersionComponents';
import QrCodeScanner from '../../../components/eCash/QrCodeScanner';
import AddressBook from '../../../components/AddressBook/AddressBook';

interface Profile {
  id: string;
  name: string;
  tokenId: string;
  ticker?: string;
  protocol?: string;
  verified?: boolean;
  description?: string;
  socials?: Record<string, string>;
  location_country?: string;
  location_region?: string;
  city?: string;
  website?: string;
  email?: string;
  phone?: string;
  [key: string]: unknown;
}

interface TokenData {
  tokenId: string;
  image?: string;
  purpose?: string;
  counterpart?: string;
}

interface SendFormState {
  address: string;
  amount: string;
}

interface TokenDetailViewProps {
  selectedProfile: Profile;
  resolvedProfile: Profile | null;
  profileDisplayName: string;
  profileDisplayTicker: string;
  selectedProfileProtocol: string;
  isCreator: boolean;
  selectedTokenData: TokenData | null;
  sendForm: SendFormState;
  setSendForm: React.Dispatch<React.SetStateAction<SendFormState>>;
  sendLoading: boolean;
  handleSendSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  setMaxAmount: () => void;
  onCopyAddress: () => void;
  onAddressDetected: (address: string) => void;
}

/**
 * Token Detail View - Shows details when a specific token is selected
 * Extracted from ClientWalletPage to reduce complexity
 */
export const TokenDetailView: React.FC<TokenDetailViewProps> = ({
  selectedProfile,
  resolvedProfile,
  profileDisplayName,
  profileDisplayTicker,
  selectedProfileProtocol: _selectedProfileProtocol, // Prefixed with _ to indicate unused
  isCreator,
  selectedTokenData,
  sendForm,
  setSendForm,
  sendLoading,
  handleSendSubmit,
  setMaxAmount,
  onCopyAddress,
  onAddressDetected,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'receive' | 'send'>('receive');
  const [showScanner, setShowScanner] = useState(false);
  const [showAddressBookModal, setShowAddressBookModal] = useState(false);
  const [activeTokenBalance, setActiveTokenBalance] = useState<string | null>(null);
  
  const { address } = useEcashWallet();
  const { balance, balanceBreakdown, loading: balanceLoading } = useEcashBalance();
  const { tokenInfo, tokenBalance, loading: tokenLoading } = useEcashToken(selectedProfile.tokenId);
  const price = useXecPrice();
  const [currency] = useAtom(currencyAtom);

  // Calculate active token balance
  useEffect(() => {
    setActiveTokenBalance(null);
    
    if (selectedProfile && tokenInfo && selectedProfile.tokenId) {
      const formatted = formatTokenBalance(tokenBalance, tokenInfo.genesisInfo?.decimals || 0);
      setActiveTokenBalance(formatted);
    }
  }, [selectedProfile, tokenInfo, tokenBalance]);

  const handleAddressDetectedInternal = (detectedAddress: string) => {
    onAddressDetected(detectedAddress);
    setShowScanner(false);
  };

  return (
    <>
      {/* Balance Display (Side by Side) */}
      <div className="balance-card-split">
        {/* Left: Token Balance (70%) */}
        <div className="balance-left">
          <div className="balance-main-amount">
            {tokenLoading ? (
              <span className="loading-pulse">...</span>
            ) : activeTokenBalance !== null ? (
              activeTokenBalance
            ) : (
              '0'
            )}
          </div>
          <div className="balance-token-ticker">
            {profileDisplayTicker}
          </div>
          <div className="balance-profile-name">{profileDisplayName}</div>
        </div>

        {/* Vertical Separator */}
        <div className="balance-separator"></div>

        {/* Right: Network Fuel */}
        <div 
          className="balance-right clickable-balance" 
          onClick={() => navigate('/settings')}
          style={{ cursor: 'pointer' }}
          title="Carburant réseau (XEC) - Nécessaire pour envoyer des jetons"
        >
          <div className="balance-xec-label">⛽ {t('wallet.networkFuel') || 'Carburant Réseau'}</div>
          <div className="balance-xec-amount">
            {balanceLoading ? (
              <span className="loading-pulse">...</span>
            ) : (
              Number(balance).toFixed(2)
            )}
          </div>
          {price && typeof price.convert === 'function' && !balanceLoading && (() => {
            const converted = price.convert(balanceBreakdown?.totalBalance || 0, currency);
            return converted !== null ? (
              <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                ≈ {converted.toFixed(2)} {currency}
              </div>
            ) : null;
          })()}
          <div className="balance-xec-sublabel">XEC</div>
        </div>
      </div>

      {/* Immersion: Brand Universe Section */}
      {resolvedProfile && (
        <>
          {isCreator && (
            <CreatorActions
              tokenId={selectedProfile.tokenId}
              onNavigateToTokenPage={() => navigate(`/token/${selectedProfile.tokenId}`)}
            />
          )}

          <TokenHeroSection
            name={profileDisplayName}
            description={resolvedProfile.description}
            image={selectedTokenData?.image}
            verified={resolvedProfile.verified}
            ticker={profileDisplayTicker}
          />

          <TokenPurposeCard
            purpose={selectedTokenData?.purpose}
            counterpart={selectedTokenData?.counterpart}
          />

          <CreatorSocialLinks socials={resolvedProfile.socials} />

          <CreatorContactCard
            country={resolvedProfile.location_country}
            region={resolvedProfile.location_region}
            city={resolvedProfile.city}
            website={resolvedProfile.website}
            email={resolvedProfile.email}
            phone={resolvedProfile.phone}
          />
        </>
      )}

      {/* Action Tabs */}
      <div className="action-tabs">
        <button 
          className={`tab-button ${activeTab === 'receive' ? 'active' : ''}`}
          onClick={() => setActiveTab('receive')}
        >
          📥 {t('wallet.receive') || 'Recevoir'}
        </button>
        <button 
          className={`tab-button ${activeTab === 'send' ? 'active' : ''}`}
          onClick={() => setActiveTab('send')}
          title="Envoyer ce jeton"
        >
          📤 {t('wallet.sendToken') || 'Envoyer'} {profileDisplayTicker}
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'receive' && address && (
          <ReceiveTab address={address} onCopy={onCopyAddress} />
        )}

        {activeTab === 'send' && (
          <SendTab
            sendForm={sendForm}
            setSendForm={setSendForm}
            sendLoading={sendLoading}
            handleSendSubmit={handleSendSubmit}
            setMaxAmount={setMaxAmount}
            activeTokenBalance={activeTokenBalance}
            profileDisplayTicker={profileDisplayTicker}
            balance={balance}
            showScanner={showScanner}
            setShowScanner={setShowScanner}
            showAddressBookModal={showAddressBookModal}
            setShowAddressBookModal={setShowAddressBookModal}
            onAddressDetected={handleAddressDetectedInternal}
          />
        )}
      </div>
    </>
  );
};

// Sub-components

interface ReceiveTabProps {
  address: string;
  onCopy: () => void;
}

const ReceiveTab: React.FC<ReceiveTabProps> = ({ address, onCopy }) => {
  const { t } = useTranslation();
  
  return (
    <div className="receive-content">
      <div 
        className="qr-code-display" 
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}
      >
        <QRCodeSVG
          value={address}
          size={220}
          bgColor="#ffffff"
          fgColor="#000000"
          level="M"
          includeMargin={true}
          style={{ cursor: 'pointer' }}
          onClick={onCopy}
        />
        
        <p 
          className="break-all text-xs text-center select-all" 
          style={{ 
            fontSize: '0.75rem',
            color: 'var(--text-secondary, #666)',
            wordBreak: 'break-all',
            userSelect: 'all',
            maxWidth: '280px',
            padding: '8px 10px',
            backgroundColor: 'var(--bg-secondary, #f5f5f5)',
            borderRadius: '8px',
            margin: 0
          }}>
          {address}
        </p>
        
        <button 
          className="copy-btn"
          onClick={onCopy}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '500',
            borderRadius: '8px',
            cursor: 'pointer',
            border: '1px solid var(--border-color, #ddd)',
            backgroundColor: 'var(--bg-primary, #fff)',
            color: 'var(--text-primary, #000)'
          }}
        >
          📋 {t('common.copy') || 'Copier'}
        </button>
      </div>
    </div>
  );
};

interface SendTabProps {
  sendForm: SendFormState;
  setSendForm: React.Dispatch<React.SetStateAction<SendFormState>>;
  sendLoading: boolean;
  handleSendSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  setMaxAmount: () => void;
  activeTokenBalance: string | null;
  profileDisplayTicker: string;
  balance: number;
  showScanner: boolean;
  setShowScanner: (show: boolean) => void;
  showAddressBookModal: boolean;
  setShowAddressBookModal: (show: boolean) => void;
  onAddressDetected: (address: string) => void;
}

const SendTab: React.FC<SendTabProps> = ({
  sendForm,
  setSendForm,
  sendLoading,
  handleSendSubmit,
  setMaxAmount,
  activeTokenBalance,
  profileDisplayTicker,
  balance,
  showScanner,
  setShowScanner,
  showAddressBookModal,
  setShowAddressBookModal,
  onAddressDetected,
}) => {
  return (
    <div className="send-content" style={{ marginTop: '16px' }}>
      <form onSubmit={handleSendSubmit} style={{ maxWidth: '100%' }}>
        {/* Address Input */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>
            Adresse destinataire
          </label>
          <div className="input-group">
            <input
              type="text"
              value={sendForm.address}
              onChange={(e) => setSendForm(prev => ({ ...prev, address: e.target.value }))}
              placeholder="ecash:qp..."
              disabled={sendLoading}
            />
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              disabled={sendLoading}
              className="input-group-btn"
              title="Scanner QR"
            >
              📱
            </button>
            <button
              type="button"
              onClick={() => setShowAddressBookModal(true)}
              disabled={sendLoading}
              className="input-group-btn"
              title="Ouvrir le carnet d'adresses"
            >
              📇
            </button>
          </div>

          {/* QR Scanner Modal */}
          {showScanner && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}>
              <button
                type="button"
                onClick={() => setShowScanner(false)}
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: '#fff',
                  color: '#000',
                  cursor: 'pointer'
                }}
              >
                ✕ Fermer
              </button>
              <QrCodeScanner onAddressDetected={onAddressDetected} />
            </div>
          )}
        </div>

        {/* Amount Input */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>
            Montant {profileDisplayTicker}
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="number"
              step="any"
              value={sendForm.amount}
              onChange={(e) => setSendForm(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="0"
              disabled={sendLoading}
              style={{
                flex: 1,
                height: '44px',
                padding: '0 12px',
                fontSize: '14px',
                border: '1px solid var(--border-color, #ddd)',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-primary, #fff)',
                boxSizing: 'border-box'
              }}
            />
            <button
              type="button"
              onClick={setMaxAmount}
              disabled={sendLoading}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '600',
                border: '1px solid var(--primary-color, #0074e4)',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-primary, #fff)',
                color: 'var(--primary-color, #0074e4)',
                cursor: 'pointer'
              }}
            >
              MAX
            </button>
          </div>
          <small style={{ display: 'block', marginTop: '6px', color: '#666', fontSize: '12px' }}>
            Disponible: {activeTokenBalance || '...'} {profileDisplayTicker}
          </small>
        </div>

        {/* Fee info */}
        <div style={{ 
          padding: '10px', 
          marginBottom: '14px',
          backgroundColor: 'var(--bg-secondary, #f5f5f5)',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#666'
        }}>
          ⛽ Frais réseau: ~1-2 XEC | ⛽ Carburant: {Number(balance).toFixed(2)} XEC
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={sendLoading || !sendForm.address || !sendForm.amount}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            fontWeight: '600',
            border: 'none',
            borderRadius: '8px',
            backgroundColor: sendLoading || !sendForm.address || !sendForm.amount ? '#ccc' : 'var(--primary-color, #0074e4)',
            color: '#fff',
            cursor: sendLoading || !sendForm.address || !sendForm.amount ? 'not-allowed' : 'pointer'
          }}
        >
          {sendLoading ? '⌛ Envoi en cours...' : `✔️ Envoyer ${profileDisplayTicker}`}
        </button>
      </form>

      {/* Address Book Modal */}
      {showAddressBookModal && (
        <div className="address-book-modal-overlay" onClick={() => setShowAddressBookModal(false)}>
          <div className="address-book-modal" onClick={(e) => e.stopPropagation()}>
            <div className="address-book-modal-header">
              <h2 className="address-book-modal-title">📇 Carnet d'adresses</h2>
              <button 
                className="address-book-modal-close"
                onClick={() => setShowAddressBookModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="address-book-modal-content">
              <AddressBook 
                tokenId={null} 
                compact={false}
                onSelectAddress={(address) => {
                  setSendForm(prev => ({ ...prev, address }));
                  setShowAddressBookModal(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenDetailView;

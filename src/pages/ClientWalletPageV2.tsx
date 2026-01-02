import { useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '../components/Layout/MobileLayout';
import AddressBook from '../components/AddressBook/AddressBook';
import { useTranslation } from '../hooks/useTranslation';
import { useWalletScan } from '../hooks/useWalletScan';
import { useEcashWallet } from '../hooks/useEcashWallet';
import { useXecPrice } from '../hooks/useXecPrice';
import {
  selectedProfileAtom,
  notificationAtom,
  currencyAtom,
  walletAtom
} from '../atoms';

// Import new reusable components
import {
  TokenBalanceCard,
  ReceiveZone,
  GasIndicator,
  ProfileDropdown,
  TabButton,
  TokenList
} from '../components/ClientWallet/WalletComponents';
import { SendTokenForm } from '../components/ClientWallet/SendTokenForm';

/**
 * ClientWalletPage - Refactored wallet interface
 * Architecture: Hub (all tokens) vs Detail (single token)
 * UX: Gas/Fuel metaphor, Dynamic labels, React 19 useTransition
 * 
 * Key improvements:
 * - Scan logic extracted to useWalletScan hook
 * - Reusable components (TokenBalanceCard, TabButton, etc.)
 * - Clear separation: Hub view (token list) vs Detail view (send/receive)
 * - Gas indicator for network credit status
 * - Dynamic button labels based on selected token
 */
const ClientWalletPageV2 = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // ========== State Management ==========
  const [activeTab, setActiveTab] = useState<'send' | 'receive' | 'addressbook'>('receive');
  const [selectedProfile, setSelectedProfile] = useAtom(selectedProfileAtom);
  const [currency] = useAtom(currencyAtom);
  const [wallet] = useAtom(walletAtom);
  const setNotification = useSetAtom(notificationAtom);

  // ========== Hooks ==========
  const { address } = useEcashWallet();
  const price = useXecPrice();

  // NEW: Extract scan logic into reusable hook
  const {
    myTokens,
    tokenBalances,
    scanLoading,
    formatTokenBalance
  } = useWalletScan();

  // ========== Derived State ==========
  const isHubMode = selectedProfile === null;

  // Current token in detail view
  const currentToken = !isHubMode
    ? myTokens.find(t => t.id === selectedProfile?.id)
    : null;

  // Gas availability check (XEC balance)
  const xecBalance = tokenBalances['NATIVE'] || '0';
  const xecBalanceNum = parseFloat(xecBalance);
  const hasGas = xecBalanceNum >= 0.003; // Minimum for fees
  const lowGas = xecBalanceNum < 5.0;

  // ========== Handlers ==========
  const handleProfileSelect = (profile: any) => {
    setSelectedProfile(profile);
    setActiveTab('send'); // Switch to send when selecting token
  };

  const handleHubMode = () => {
    setSelectedProfile(null);
    setActiveTab('receive');
  };

  const handleSendSuccess = () => {
    // Reset form and show notification
    setNotification({
      type: 'success',
      message: '✓ Token envoyé avec succès!'
    });

    // Stay in send tab for follow-up transactions
    setActiveTab('receive');
  };

  const handleTabChange = (tab: 'send' | 'receive' | 'addressbook') => {
    setActiveTab(tab);
  };

  // ========== Rendering ==========

  // PAGE TITLE
  const pageTitle = isHubMode
    ? '💼 Mon Portefeuille eCash'
    : `💰 ${currentToken?.name || 'Token'}`;

  return (
    <MobileLayout title={pageTitle} onBack={isHubMode ? null : handleHubMode}>
      <div style={{
        padding: '0',
        display: 'flex',
        flexDirection: 'column',
        gap: '0'
      }}>
        {/* ============ HUB MODE: Token List ============ */}
        {isHubMode ? (
          <>
            {/* Header: XEC Balance & Gas Status */}
            <div style={{
              padding: '20px',
              backgroundColor: 'var(--bg-primary, #fff)',
              borderBottom: '1px solid var(--border-color, #eee)'
            }}>
              <TokenBalanceCard
                profile={{ name: 'eCash (XEC)', ticker: 'XEC' }}
                balance={xecBalance}
                decimals={8}
                hasGas={hasGas}
              />

              {/* Gas Indicator */}
              <div style={{ marginTop: '16px' }}>
                <GasIndicator balance={xecBalanceNum} />
              </div>

              {/* Low Gas Warning */}
              {lowGas && !hasGas && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  backgroundColor: '#ffebee',
                  borderLeft: '4px solid #d32f2f',
                  borderRadius: '4px',
                  fontSize: '13px',
                  color: '#c62828'
                }}>
                  ⚠️ Crédit réseau insuffisant pour les transactions. Contactez votre créateur.
                </div>
              )}
            </div>

            {/* Token List */}
            <div style={{ padding: '20px' }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '12px',
                color: 'var(--text-secondary, #666)'
              }}>
                Mes Jetons ({myTokens.length})
              </h3>

              {scanLoading ? (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: 'var(--text-secondary, #999)'
                }}>
                  ⌛ Scan en cours...
                </div>
              ) : myTokens.length === 0 ? (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: 'var(--text-secondary, #999)'
                }}>
                  📭 Aucun jeton détecté
                </div>
              ) : (
                <TokenList
                  tokens={myTokens.map(token => ({
                    id: token.id,
                    name: token.name,
                    ticker: token.ticker,
                    balance: formatTokenBalance(
                      tokenBalances[token.id] || '0',
                      token.decimals || 0
                    ),
                    verified: token.isCreatorVerified,
                    protocol: token.protocol
                  }))}
                  loading={scanLoading}
                  onSelect={handleProfileSelect}
                />
              )}
            </div>
          </>
        ) : (
          /* ============ DETAIL MODE: Single Token ============ */
          <>
            {/* Header: Token Balance */}
            <div style={{
              padding: '20px',
              backgroundColor: 'var(--bg-primary, #fff)',
              borderBottom: '1px solid var(--border-color, #eee)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '16px'
              }}>
                <div>
                  <p style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary, #666)',
                    marginBottom: '4px'
                  }}>
                    Solde
                  </p>
                  <h2 style={{
                    fontSize: '28px',
                    fontWeight: '700',
                    margin: '0',
                    color: 'var(--text-primary, #000)'
                  }}>
                    {formatTokenBalance(
                      tokenBalances[currentToken?.id] || '0',
                      currentToken?.decimals || 0
                    )}
                  </h2>
                </div>

                {/* Gas Status Badge */}
                {hasGas ? (
                  <div style={{
                    padding: '8px 12px',
                    backgroundColor: '#e8f5e9',
                    border: '1px solid #4caf50',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#2e7d32'
                  }}>
                    ✓ Réseau OK
                  </div>
                ) : (
                  <div style={{
                    padding: '8px 12px',
                    backgroundColor: '#ffebee',
                    border: '1px solid #d32f2f',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#c62828'
                  }}>
                    ⚠ Gaz faible
                  </div>
                )}
              </div>

              <p style={{
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--text-primary, #000)',
                margin: '0'
              }}>
                {currentToken?.ticker}
              </p>

              {/* Creator/Verified Badge */}
              {currentToken?.isCreatorVerified && (
                <div style={{
                  marginTop: '8px',
                  display: 'inline-block',
                  padding: '4px 8px',
                  backgroundColor: '#e3f2fd',
                  border: '1px solid #1976d2',
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: '#1565c0',
                  fontWeight: '500'
                }}>
                  ✓ Créateur Vérifié
                </div>
              )}
            </div>

            {/* Tab Navigation */}
            <div style={{
              padding: '12px 20px',
              display: 'flex',
              gap: '8px',
              backgroundColor: 'var(--bg-secondary, #f5f5f5)',
              borderBottom: '1px solid var(--border-color, #eee)',
              overflowX: 'auto'
            }}>
              <TabButton
                active={activeTab === 'receive'}
                onClick={() => handleTabChange('receive')}
              >
                Recevoir
              </TabButton>

              <TabButton
                active={activeTab === 'send'}
                onClick={() => handleTabChange('send')}
              >
                Envoyer {currentToken?.ticker}
              </TabButton>

              <TabButton
                active={activeTab === 'addressbook'}
                onClick={() => handleTabChange('addressbook')}
              >
                Carnet
              </TabButton>
            </div>

            {/* Tab Content */}
            <div style={{ padding: '20px' }}>
              {/* RECEIVE Tab */}
              {activeTab === 'receive' && (
                <ReceiveZone
                  address={address}
                  onCopy={() => {
                    navigator.clipboard.writeText(address);
                    setNotification({
                      type: 'success',
                      message: '✓ Adresse copiée'
                    });
                  }}
                />
              )}

              {/* SEND Tab */}
              {activeTab === 'send' && currentToken && (
                <SendTokenForm
                  token={{
                    tokenId: currentToken.id,
                    name: currentToken.name,
                    ticker: currentToken.ticker,
                    protocol: currentToken.protocol
                  }}
                  balance={formatTokenBalance(
                    tokenBalances[currentToken.id] || '0',
                    currentToken.decimals || 0
                  )}
                  decimals={currentToken.decimals || 0}
                  gasAvailable={hasGas}
                  onSuccess={handleSendSuccess}
                />
              )}

              {/* ADDRESS BOOK Tab */}
              {activeTab === 'addressbook' && (
                <AddressBook />
              )}
            </div>
          </>
        )}

        {/* ========== Hub Mode Toggle (always visible) ========== */}
        <div style={{
          padding: '20px',
          borderTop: '1px solid var(--border-color, #eee)',
          backgroundColor: 'var(--bg-secondary, #f5f5f5)'
        }}>
          {!isHubMode && (
            <button
              onClick={handleHubMode}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                fontWeight: '600',
                border: '1px solid var(--primary-color, #0074e4)',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                color: 'var(--primary-color, #0074e4)',
                cursor: 'pointer'
              }}
            >
              ← Retour à la liste
            </button>
          )}
        </div>
      </div>
    </MobileLayout>
  );
};

export default ClientWalletPageV2;

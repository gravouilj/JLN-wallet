import { useState, useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { QRCodeSVG } from 'qrcode.react';
import MobileLayout from '../components/Layout/MobileLayout';
import WalletDetails from '../components/WalletDetails';
import SendXEC from '../components/SendXEC';
import BlockchainStatus from '../components/BlockchainStatus';
import ErrorBoundary from '../components/ErrorBoundary';
import { useTranslation } from '../hooks/useTranslation';
import { useEcashWallet } from '../hooks/useEcashWallet';
import { useXecPrice } from '../hooks/useXecPrice';
import { walletConnectedAtom, walletAtom, notificationAtom, currencyAtom, localeAtom } from '../atoms';
import '../styles/settings.css';

const SettingsPage = () => {
  const { t, changeLanguage } = useTranslation();
  const setNotification = useSetAtom(notificationAtom);
  
  // Page title
  const pageTitle = '⚙️ Paramètres';
  
  // State atoms
  const [walletConnected] = useAtom(walletConnectedAtom);
  const [wallet] = useAtom(walletAtom);
  const [currency, setCurrency] = useAtom(currencyAtom);
  const [locale] = useAtom(localeAtom);
  
  // Collapsible sections
  const [showReceive, setShowReceive] = useState(true);
  const [showEmptyWallet, setShowEmptyWallet] = useState(false);
  const [showWalletInfo, setShowWalletInfo] = useState(false);
  
  // Wallet hooks
  const { address, wallet: walletInstance } = useEcashWallet();
  const price = useXecPrice();
  
  // State local pour le solde (FIX BUG: utilise UNIQUEMENT wallet.getBalance())
  const [balance, setBalance] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(true);
  
  // Charger le solde avec wallet.getBalance() - FIX BUG 198 vs 7
  useEffect(() => {
    if (!walletInstance || !walletConnected) {
      setBalanceLoading(false);
      return;
    }
    
    const loadBalance = async () => {
      try {
        setBalanceLoading(true);
        const balanceData = await walletInstance.getBalance();
        // CRITICAL: Utiliser balanceData.balance (solde XEC pur)
        setBalance(balanceData.balance || 0);
      } catch (err) {
        console.error('Error loading balance:', err);
        setBalance(0);
      } finally {
        setBalanceLoading(false);
      }
    };
    
    loadBalance();
  }, [walletInstance, walletConnected]);

  const handleCopyAddress = () => {
    if (address && address.length > 0) {
      navigator.clipboard.writeText(address).then(
        () => {
          setNotification({ type: 'success', message: t('wallet.addressCopied') || 'Adresse copiée !' });
        },
        (err) => {
          console.error('❌ Échec de la copie:', err);
          setNotification({ type: 'error', message: t('wallet.copyFailed') || 'Échec de la copie' });
        }
      );
    }
  };

  const handleContactEmail = () => {
    window.location.href = 'mailto:support@farmwallet.example.com';
  };

  const handleTelegram = () => {
    window.open('https://t.me/farmwallet', '_blank');
  };

  const handleTwitter = () => {
    window.open('https://twitter.com/', '_blank');
  };

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    changeLanguage(newLang);
  };

  const handleCurrencyChange = (e) => {
    const newCurrency = e.target.value;
    setCurrency(newCurrency);
    setNotification({ 
      type: 'success', 
      message: `💱 ${t('settings.currency')}: ${newCurrency}` 
    });
  };

  if (!walletConnected || !wallet) {
    return (
      <MobileLayout title={t('settings.title')}>
        <div className="settings-page-content">
          <h1 className="page-header-title">{pageTitle}</h1>
          <div className="settings-empty">
            <p>{t('token.walletNotConnected')}</p>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title={t('settings.title')}>
      <div className="settings-page-content">
        <h1 className="page-header-title">{pageTitle}</h1>

        {/* SECTION: Préférences */}
        <div className="settings-section">
          <h2 className="section-title">
            <span className="section-icon">⚙️</span>
            {t('settings.preferences')}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Sélecteur Langue */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label htmlFor="language-select" style={{
                fontSize: '0.9rem',
                fontWeight: '600',
                color: 'var(--text-primary, #000)'
              }}>
                🌐 {t('settings.language')}
              </label>
              <select
                id="language-select"
                value={locale}
                onChange={handleLanguageChange}
                style={{
                  padding: '12px',
                  fontSize: '1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #ddd)',
                  backgroundColor: 'var(--bg-primary, #fff)',
                  color: 'var(--text-primary, #000)',
                  cursor: 'pointer'
                }}
              >
                <option value="fr" defaultValue={true}>🇫🇷 Français</option>
                <option value="en">🇬🇧 English</option>
                <option value="es">🇪🇸 Espanol</option>
                <option value="de">🇩🇪 Deutsch</option>
                <option value="pt">🇵🇹 Portugues</option>
                <option value="it">🇮🇹 Italian</option>
                <option value="en-us"> 🇺🇸 USA</option>
                
              </select>
            </div>

            {/* Sélecteur Monnaie */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label htmlFor="currency-select" style={{
                fontSize: '0.9rem',
                fontWeight: '600',
                color: 'var(--text-primary, #000)'
              }}>
                💱 {t('settings.currency')}
              </label>
              <select
                id="currency-select"
                value={currency}
                onChange={handleCurrencyChange}
                style={{
                  padding: '12px',
                  fontSize: '1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #ddd)',
                  backgroundColor: 'var(--bg-primary, #fff)',
                  color: 'var(--text-primary, #000)',
                  cursor: 'pointer'
                }}
              >
                <option value="EUR" defaultValue={true}>EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="USD">USD ($)</option>

              </select>
            </div>
          </div>
        </div>

{/* EN-TÊTE: Prix du Marché */}
        <div style={{
          padding: '16px',
          marginBottom: '20px',
          backgroundColor: 'var(--bg-secondary, #f0f9ff)',
          borderRadius: '12px',
          textAlign: 'center',
          border: '1px solid var(--border-color, #ddd)'
        }}>
          <div style={{
            fontSize: '0.85rem',
            color: 'var(--text-secondary, #666)',
            marginBottom: '6px',
            fontWeight: '500'
          }}>
            💰 {t('settings.marketPrice')}
          </div>
          {price && typeof price.convert === 'function' ? (
            <div style={{
              fontSize: '1.1rem',
              fontWeight: '700',
              color: 'var(--accent-primary)'
            }}>
              1 XEC = {price.convert(1, currency)?.toFixed(6) || '...'} {currency}
            </div>
          ) : (
            <div style={{
              fontSize: '1.1rem',
              fontWeight: '700',
              color: 'var(--text-secondary)'
            }}>
              {t('common.loading')}...
            </div>
          )}
        </div>
        
        {/* SECTION: Sécurité & Fonds */}
        <div className="settings-section">
          <h2 className="section-title">
            <span className="section-icon">🔐</span>
            {t('settings.securityAndFunds')}
          </h2>

          {/* Recevoir - collapsible */}
          <div className="settings-subsection">
            <h3
              className="subsection-title clickable"
              onClick={() => setShowReceive(!showReceive)}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span className="toggle-icon">{showReceive ? '▼' : '▶'}</span>
              {t('settings.receiveXec')}
            </h3>
            {showReceive && (
              <div className="xec-receive-container" style={{ marginTop: '12px' }}>
                {/* Solde Disponible - GAP RÉDUIT */}
                <div style={{
                  padding: '16px',
                  backgroundColor: 'var(--bg-secondary, #f5f5f5)',
                  borderRadius: '12px',
                  marginBottom: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary, #666)',
                    marginBottom: '6px',
                    fontWeight: '500'
                  }}>
                    💰 {t('wallet.balance') || 'Solde Disponible'}
                  </div>
                  <div style={{
                    fontSize: '1.8rem',
                    fontWeight: '700',
                    color: 'var(--text-primary, #000)',
                    marginBottom: '4px'
                  }}>
                    {balanceLoading ? (
                      <span style={{ color: '#999' }}>...</span>
                    ) : (
                      `${Number(balance).toFixed(2)} XEC`
                    )}
                  </div>
                  {price && typeof price.convert === 'function' && !balanceLoading && (() => {
                    const converted = price.convert(Number(balance), currency);
                    return converted !== null ? (
                      <div style={{
                        fontSize: '0.95rem',
                        color: 'var(--text-secondary, #666)',
                        fontWeight: '400'
                      }}>
                        ≈ {converted.toFixed(4)} {currency}
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* QR Code */}
                <div style={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '20px',
                  backgroundColor: 'var(--bg-secondary, #f5f5f5)',
                  borderRadius: '12px'
                }}>
                  {address ? (
                    <>
                      <h4 style={{ 
                        fontSize: '1rem',
                        fontWeight: '600',
                        marginBottom: '4px',
                        textAlign: 'center',
                        color: 'var(--text-primary, #000)'
                      }}>
                        📥 {t('wallet.receive') || 'Recevoir'}
                      </h4>
                      
                      <div 
                        onClick={handleCopyAddress}
                        style={{ 
                          cursor: 'pointer',
                          padding: '16px',
                          backgroundColor: '#fff',
                          borderRadius: '12px',
                          transition: 'transform 0.2s',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                        }}
                      >
                        <QRCodeSVG
                          value={address}
                          size={200}
                          bgColor="#ffffff"
                          fgColor="#000000"
                          level="M"
                          includeMargin={true}
                        />
                      </div>
                      
                      <p style={{ 
                        fontSize: '0.7rem',
                        color: 'var(--text-secondary, #666)',
                        wordBreak: 'break-all',
                        userSelect: 'all',
                        maxWidth: '280px',
                        padding: '8px 10px',
                        backgroundColor: 'var(--bg-primary, #fff)',
                        borderRadius: '8px',
                        margin: '0',
                        lineHeight: '1.4',
                        textAlign: 'center'
                      }}>
                        {address}
                      </p>
                      
                      <button 
                        onClick={handleCopyAddress}
                        style={{
                          padding: '10px 20px',
                          fontSize: '14px',
                          fontWeight: '500',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          border: '1px solid var(--border-color, #ddd)',
                          backgroundColor: 'var(--bg-primary, #fff)',
                          color: 'var(--text-primary, #000)',
                          transition: 'all 0.2s'
                        }}
                      >
                        📋 {t('common.copy') || 'Copier'}
                      </button>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                      <div style={{ 
                        display: 'inline-block',
                        width: '40px',
                        height: '40px',
                        border: '4px solid var(--bg-secondary)',
                        borderTop: '4px solid var(--accent-primary)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        marginBottom: '16px'
                      }} />
                      <p style={{ 
                        fontSize: '0.9rem',
                        color: 'var(--text-secondary, #666)'
                      }}>
                        {t('common.loading')}...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Vider le Portefeuille - collapsible */}
          <div className="settings-subsection">
            <h3
              className="subsection-title clickable"
              onClick={() => setShowEmptyWallet(!showEmptyWallet)}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span className="toggle-icon">{showEmptyWallet ? '▼' : '▶'}</span>
              {t('xec.title')}
            </h3>
            {showEmptyWallet && (
              <ErrorBoundary>
                <SendXEC />
              </ErrorBoundary>
            )}
          </div>

          {/* Phrase de Récupération - collapsible */}
          <div className="settings-subsection">
            <h3
              className="subsection-title clickable"
              onClick={() => setShowWalletInfo(!showWalletInfo)}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span className="toggle-icon">{showWalletInfo ? '▼' : '▶'}</span>
              {t('settings.walletInfo')}
            </h3>
            {showWalletInfo && (
              <ErrorBoundary>
                <WalletDetails />
              </ErrorBoundary>
            )}
          </div>
        </div>

        {/* SECTION: Support */}
        <div className="settings-section">
          <h2 className="section-title">
            <span className="section-icon">💬</span>
            {t('settings.support')}
          </h2>
          <div className="support-buttons">
            <button className="support-button" onClick={handleContactEmail}>
              <span className="support-icon">📧</span>
              {t('settings.contactEmail')}
            </button>
            <button className="support-button" onClick={handleTelegram}>
              <span className="support-icon">✈️</span>
              {t('settings.telegram')}
            </button>
            <button className="support-button" onClick={handleTwitter}>
              <span className="support-icon">🐦</span>
              {t('settings.twitter')}
            </button>
          </div>
        </div>

        {/* SECTION: Système */}
        <div className="settings-section">
          <h2 className="section-title">
            <span className="section-icon">🔧</span>
            {t('settings.system')}
          </h2>
          
          {/* Statut Blockchain */}
          <div style={{ marginBottom: '16px' }}>
            <ErrorBoundary>
              <BlockchainStatus />
            </ErrorBoundary>
          </div>
          
          {/* Version */}
          <div className="settings-version" style={{ textAlign: 'center' }}>
            <p>{t('settings.version')} <strong>v1.0.0</strong></p>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};

export default SettingsPage;

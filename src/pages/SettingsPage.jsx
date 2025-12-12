import { useState, useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { QRCodeSVG } from 'qrcode.react';
import MobileLayout from '../components/Layout/MobileLayout';
import WalletDetails from '../components/WalletDetails';
import BlockchainStatus from '../components/BlockchainStatus';
import ErrorBoundary from '../components/ErrorBoundary';
import { useTranslation } from '../hooks/useTranslation';
import { useEcashWallet } from '../hooks/useEcashWallet';
import { useXecPrice } from '../hooks/useXecPrice';
import { walletConnectedAtom, walletAtom, notificationAtom, currencyAtom, localeAtom } from '../atoms';
import { Card, CardContent, Button, Input, Stack, PageLayout, PageHeader, Select } from '../components/UI';

const SettingsPage = () => {
  const { t, changeLanguage } = useTranslation();
  const setNotification = useSetAtom(notificationAtom);
  
  const [walletConnected] = useAtom(walletConnectedAtom);
  const [wallet] = useAtom(walletAtom);
  const [currency, setCurrency] = useAtom(currencyAtom);
  const [locale] = useAtom(localeAtom);
  
  const [showReceive, setShowReceive] = useState(false);
  const [showEmptyWallet, setShowEmptyWallet] = useState(false);
  const [showWalletInfo, setShowWalletInfo] = useState(false);
  
  const { address, wallet: walletInstance } = useEcashWallet();
  const price = useXecPrice();
  const [balance, setBalance] = useState(0);

  // Etats pour Vider le portefeuille
  const [sendAddress, setSendAddress] = useState('');
  const [sendLoading, setSendLoading] = useState(false);

  useEffect(() => {
    if (walletInstance) {
      walletInstance.getBalance().then(res => setBalance(res.balance || 0));
    }
  }, [walletInstance]);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(address);
    setNotification({ type: 'success', message: 'Adresse copiée !' });
  };

  const handleEmptyWallet = async (e) => {
    e.preventDefault();
    if (!sendAddress) return;
    setSendLoading(true);
    try {
      const maxAmount = Math.max(0, balance - 5);
      if (maxAmount <= 0) throw new Error("Solde insuffisant");
      const result = await walletInstance.sendXec(sendAddress, maxAmount.toString());
      setNotification({ type: 'success', message: `Envoyé ! TXID: ${result.txid.substring(0,8)}...` });
      setShowEmptyWallet(false);
    } catch (err) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setSendLoading(false);
    }
  };

  if (!walletConnected) return <MobileLayout><div>Connectez votre wallet</div></MobileLayout>;

  return (
    <MobileLayout title={t('settings.title')}>
      <PageLayout hasBottomNav>
        <Stack spacing="lg">
          <PageHeader icon="⚙️" title={t('settings.title')} />

          {/* PRIX DU MARCHÉ */}
          <Card>
            <CardContent className="text-center">
              <div style={{ fontSize: '0.9rem', color: '#666' }}>💰 {t('settings.marketPrice')}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                1 XEC = {price ? price.convert(1, currency)?.toFixed(6) : '...'} {currency}
              </div>
            </CardContent>
          </Card>

          {/* PRÉFÉRENCES */}
          <Stack spacing="sm">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginLeft: '8px' }}>Préférences</h2>
            <Card>
              <CardContent>
                <Stack spacing="md">
                  <Select 
                    label={`🌐 ${t('settings.language')}`}
                    value={locale} 
                    onChange={(e) => changeLanguage(e.target.value)}
                    options={[
                      { value: 'fr', label: '🇫🇷 Français' },
                      { value: 'en', label: '🇬🇧 English' },
                      { value: 'es', label: '🇪🇸 Español' }
                    ]}
                  />
                  <Select 
                    label={`💱 ${t('settings.currency')}`}
                    value={currency} 
                    onChange={(e) => setCurrency(e.target.value)}
                    options={[
                      { value: 'EUR', label: 'EUR (€)' },
                      { value: 'USD', label: 'USD ($)' },
                      { value: 'GBP', label: 'GBP (£)' }
                    ]}
                  />
                </Stack>
              </CardContent>
            </Card>
          </Stack>

          {/* SÉCURITÉ & FONDS */}
          <Stack spacing="sm">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginLeft: '8px' }}>Sécurité & Fonds</h2>
            
            {/* Recevoir */}
            <Card>
              <CardContent>
                <div onClick={() => setShowReceive(!showReceive)} style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer', fontWeight: '600' }}>
                  <span>📥 {t('settings.receiveXec')}</span>
                  <span>{showReceive ? '▲' : '▼'}</span>
                </div>
                {showReceive && (
                  <div style={{ marginTop: '16px', textAlign: 'center' }}>
                     <div style={{ background: '#fff', padding: '16px', display: 'inline-block', borderRadius: '12px' }}>
                       <QRCodeSVG value={address} size={180} />
                     </div>
                     <p style={{ fontSize: '0.8rem', wordBreak: 'break-all', margin: '12px 0' }}>{address}</p>
                     <Button onClick={handleCopyAddress} variant="outline" size="sm">Copier l'adresse</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Vider le portefeuille */}
            <Card>
              <CardContent>
                <div onClick={() => setShowEmptyWallet(!showEmptyWallet)} style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer', fontWeight: '600' }}>
                  <span>💸 {t('xec.title')} (Tout envoyer)</span>
                  <span>{showEmptyWallet ? '▲' : '▼'}</span>
                </div>
                {showEmptyWallet && (
                  <form onSubmit={handleEmptyWallet} style={{ marginTop: '16px' }}>
                    <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '12px' }}>
                      Transfère tout le solde ({balance.toFixed(2)} XEC) moins les frais.
                    </p>
                    <Input 
                      label="Adresse de destination" 
                      value={sendAddress} 
                      onChange={(e) => setSendAddress(e.target.value)} 
                      placeholder="ecash:..." 
                    />
                    <Button type="submit" disabled={sendLoading || !sendAddress} fullWidth>
                      {sendLoading ? 'Envoi...' : 'Tout envoyer'}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Phrase de récupération */}
            <Card>
              <CardContent>
                <div onClick={() => setShowWalletInfo(!showWalletInfo)} style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer', fontWeight: '600' }}>
                  <span>🔑 {t('settings.walletInfo')}</span>
                  <span>{showWalletInfo ? '▲' : '▼'}</span>
                </div>
                {showWalletInfo && <WalletDetails />}
              </CardContent>
            </Card>
          </Stack>

          {/* SYSTEME */}
          <Stack spacing="sm">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginLeft: '8px' }}>Système</h2>
            <BlockchainStatus />
            <div className="text-center text-sm text-gray-400">v1.0.0</div>
          </Stack>

        </Stack>
      </PageLayout>
    </MobileLayout>
  );
};

export default SettingsPage;
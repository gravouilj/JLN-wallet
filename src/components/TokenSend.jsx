import { useState, useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import {
  walletAtom,
  walletConnectedAtom,
  tokenIdAtom,
  notificationAtom,
  busyAtom,
  balanceRefreshTriggerAtom,
  tokenRefreshTriggerAtom,
  coinSelectionStrategyAtom,
  balanceBreakdownAtom,
  selectedFarmAtom
} from '../atoms';
import { Card, CardContent } from './UI';
import TokenSendForm from './TokenSendForm';
import QrCodeScanner from './QrCodeScanner';
import XecFeeBalance from './XecFeeBalance';
import { useTranslation } from '../hooks/useTranslation';
import { useToken } from '../hooks/useToken';
import { useFarms } from '../hooks/useFarms';
import { sanitizeInput, isValidXECAddress, isValidAmount } from '../utils/validation';
import { handleError } from '../utils/errorHandler';
import '../styles/sendxec.css';

const TokenSend = () => {
  const { t } = useTranslation();
  const [wallet] = useAtom(walletAtom);
  const [walletConnected] = useAtom(walletConnectedAtom);
  const { token } = useToken();
  const [tokenId] = useAtom(tokenIdAtom);
  const [selectedFarm] = useAtom(selectedFarmAtom);
  const { farms } = useFarms();
  const setNotification = useSetAtom(notificationAtom);
  const [busy, setBusy] = useAtom(busyAtom);
  const setBalanceRefreshTrigger = useSetAtom(balanceRefreshTriggerAtom);
  const setTokenRefreshTrigger = useSetAtom(tokenRefreshTriggerAtom);
  const [strategy] = useAtom(coinSelectionStrategyAtom);
  const [balanceBreakdown] = useAtom(balanceBreakdownAtom);

  const [sendForm, setSendForm] = useState({
    address: '',
    amount: ''
  });
  const [showScanner, setShowScanner] = useState(false);
  const [lastTransactionTime, setLastTransactionTime] = useState(0);
  const [countdown, setCountdown] = useState(0);

  // Update countdown timer for transaction cooldown
  useEffect(() => {
    if (lastTransactionTime === 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastTx = now - lastTransactionTime;
      const minInterval = 5000; // 5 seconds
      const remaining = Math.max(0, Math.ceil((minInterval - timeSinceLastTx) / 1000));

      setCountdown(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        // Trigger token balance refresh after cooldown ends
        // Add a small delay to account for network propagation
        setTimeout(() => {
          setTokenRefreshTrigger(Date.now());
          setBalanceRefreshTrigger(Date.now());
        }, 1000);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastTransactionTime, setTokenRefreshTrigger, setBalanceRefreshTrigger]);

  const handleInputChange = (field, value) => {
    setSendForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddressDetected = (scannedData) => {
    if (!walletConnected) {
      setNotification({ type: 'error', message: t('token.walletNotConnected') });
      return;
    }

    try {
      if (Array.isArray(scannedData) && scannedData.length > 0) {
        const rawAddress = scannedData[0].rawValue;
        const sanitizedAddress = sanitizeInput(rawAddress, 'address');

        if (!isValidXECAddress(sanitizedAddress)) {
          setNotification({ type: 'error', message: t('token.invalidAddress') });
          return;
        }

        handleInputChange('address', sanitizedAddress);
        setNotification({ type: 'success', message: t('token.addressScanned') });
      } else {
        setNotification({ type: 'error', message: t('token.qrScanFailed') });
      }
    } catch (error) {
      const handledError = handleError(error, 'qr_scan');
      setNotification({ type: 'error', message: handledError.message });
    }
    setShowScanner(false);
  };

  const handleSend = async (e) => {
    e.preventDefault();

    if (!walletConnected) {
      setNotification({ type: 'error', message: t('token.walletNotConnected') });
      return;
    }

    // Prevent rapid consecutive transactions
    if (countdown > 0) {
      setNotification({
        type: 'error',
        message: t('token.transactionCooldown', { countdown })
      });
      return;
    }

    if (!tokenId) {
      setNotification({ type: 'error', message: t('token.tokenNotFound') });
      return;
    }

    try {
      // Validate and sanitize inputs
      const sanitizedRecipient = sanitizeInput(sendForm.address, 'address');
      const sanitizedAmount = sanitizeInput(sendForm.amount, 'amount');

      if (!sanitizedRecipient) {
        setNotification({ type: 'error', message: t('token.addressRequired') });
        return;
      }

      if (!isValidXECAddress(sanitizedRecipient)) {
        setNotification({ type: 'error', message: t('token.invalidAddress') });
        return;
      }

      if (!isValidAmount(sanitizedAmount, 'etoken')) {
        setNotification({ type: 'error', message: t('token.amountRequired') });
        return;
      }

      const amount = parseFloat(sanitizedAmount);
      if (amount <= 0) {
        setNotification({ type: 'error', message: t('token.amountPositive') });
        return;
      }

      // Check if we have enough balance
      if (!token) {
        setNotification({ type: 'error', message: t('token.tokenNotFound') });
        return;
      }

      const tokenBalance = typeof token.balance === 'object' ? token.balance.display : (token.balance || 0);

      // Check balance - using display amount for comparison
      if (amount > tokenBalance) {
        setNotification({
          type: 'error',
          message: t('token.insufficientBalance', {
            balance: tokenBalance,
            symbol: token.symbol || 'tokens'
          })
        });
        return;
      }

      // Check if we have enough spendable XEC for transaction fees and dust prevention
      const spendableXEC = balanceBreakdown?.spendableBalance || 0;
      const minimumXECRequired = 5.46; // Dust prevention + fee buffer

      // Ensure minimum XEC balance for dust prevention
      if (spendableXEC < minimumXECRequired) {
        setNotification({
          type: 'error',
          message: t('xec.validation.dustPreventionTokens', {
            required: minimumXECRequired,
            available: spendableXEC.toFixed(2)
          })
        });
        return;
      }

      setBusy(true);

      // Clean amount: force exactly 2 decimals to avoid floating point issues
      const cleanAmount = String(amount).replace(',', '.');
      
      // Récupérer les métadonnées blockchain du token
      const tokenInfo = await wallet.getTokenInfo(tokenId);
      const tokenProtocol = tokenInfo.tokenType?.protocol || 'ALP';
      const tokenDecimals = tokenInfo.genesisInfo?.decimals || 0;
      
      console.log(`🚀 Envoi Token ${token.symbol} (Protocol: ${tokenProtocol}, Decimals: ${tokenDecimals})`);
      
      // Use new sendToken method with protocol and decimals support
      const result = await wallet.sendToken(
        tokenId,
        sanitizedRecipient,
        cleanAmount,
        tokenDecimals,              // Support decimals (important for EVA: 2)
        tokenProtocol               // Support ALP/SLP (important for EVA: ALP)
      );

      // Record successful transaction time
      setLastTransactionTime(Date.now());

      // Trigger balance and token refresh after successful transaction
      setBalanceRefreshTrigger(Date.now());
      setTokenRefreshTrigger(Date.now());

      // Reset form and show success
      setSendForm({
        address: '',
        amount: ''
      });

      setNotification({
        type: 'success',
        message: t('token.sendSuccess', {
          amount,
          symbol: token.symbol || 'tokens',
          address: sanitizedRecipient.substring(0, 15),
          txid: result.txid.substring(0, 8)
        })
      });

    } catch (error) {
      console.error('Token transaction failed:', error);

      // More specific error analysis for WASM-related issues
      if (error.message?.includes('wbindgen') ||
          error.message?.includes('WebAssembly') ||
          error.message?.includes('WASM') ||
          error.message?.includes('function import requires a callable')) {
        setNotification({
          message: t('errors.browserCompatibility'),
          type: 'error'
        });
        setBusy(false);
        return;
      }

      // Check for specific fee/balance related errors
      if (error.message?.includes('Insufficient XEC for transaction fees') ||
          error.message?.includes('insufficient funds') ||
          error.message?.includes('Not enough XEC')) {

        const spendableXEC = balanceBreakdown?.spendableBalance || 0;
        const tokenDustValue = balanceBreakdown?.tokenDustValue || 0;

        setNotification({
          message: t('fees.transactionFailed', {
            spendable: spendableXEC.toFixed(2),
            tokenDustInfo: tokenDustValue > 0 ? t('fees.withTokenDust', {
              tokenDust: tokenDustValue.toFixed(2)
            }) : ''
          }),
          type: 'error'
        });

        // Trigger balance refresh to get fresh UTXO data
        setBalanceRefreshTrigger(Date.now());
        setBusy(false);
        return;
      }

      // Check for specific crypto/signing failures that might be WASM-related
      if (error.message?.includes('signing') ||
          error.message?.includes('crypto') ||
          error.message?.includes('hash') ||
          error.message?.includes('Unable to sign')) {
        setNotification({
          message: t('errors.signingFailed'),
          type: 'error'
        });
        setBusy(false);
        return;
      }

      const handledError = handleError(error, 'send_tokens');

      // If error is related to mempool conflicts or UTXO issues, trigger balance refresh
      const errorMessage = error?.message || error?.toString() || '';
      if (errorMessage.includes('txn-mempool-conflict') ||
          errorMessage.includes('mempool conflict') ||
          errorMessage.includes('missing inputs') ||
          errorMessage.includes('inputs-missingorspent')) {
        setBalanceRefreshTrigger(Date.now());
      }

      setNotification({ type: 'error', message: handledError.message });
    } finally {
      setBusy(false);
    }
  };

  const setMaxAmount = () => {
    if (token) {
      const balance = typeof token.balance === 'object' ? token.balance.display : (token.balance || 0);
      handleInputChange('amount', balance.toString());
    }
  };

  if (!walletConnected) {
    return (
      <Card className="send-tokens-container">
        <CardContent>
          <h2>{t('token.send')}</h2>
          <div className="send-tokens-empty">
            <p>{t('token.walletNotConnected')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!token) {
    return (
      <Card className="send-tokens-container">
        <CardContent>
          <h2>{t('token.send')}</h2>
          <div className="send-tokens-empty">
            <h3>{t('token.noTokensAvailable')}</h3>
            <p>{t('token.noTokensMessage')}</p>
            <p>{t('token.tokensWillAppear')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="send-tokens-container">
      <CardContent>
        <h2>{t('token.send')}</h2>

        {/* XEC Fee Balance Display */}
        <XecFeeBalance />

        {/* Refactored form component */}
        <TokenSendForm
          sendForm={sendForm}
          onInputChange={handleInputChange}
          onSubmit={handleSend}
          onScanClick={() => setShowScanner(true)}
          onMaxClick={setMaxAmount}
          showScanner={showScanner}
          onCloseScanner={() => setShowScanner(false)}
          token={token}
          busy={busy}
          countdown={countdown}
          walletConnected={walletConnected}
          t={t}
          QrCodeScanner={QrCodeScanner}
          onAddressDetected={handleAddressDetected}
        />
      </CardContent>
    </Card>
  );
};

export default TokenSend;

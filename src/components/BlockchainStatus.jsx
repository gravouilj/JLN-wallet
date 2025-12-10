/**
 * Blockchain Connection Status Component
 * Shows the status of the eCash blockchain connection
 */

import { useState, useEffect } from 'react';
import { ChronikClient } from 'chronik-client';
import { useTranslation } from '../hooks/useTranslation';
import '../styles/blockchain-status.css';

// Direct Chronik client - same as ecashWallet.js
const chronik = new ChronikClient('https://chronik-native2.fabien.cash');

const BlockchainStatus = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState({
    connected: false,
    blockHeight: 0,
    checking: true,
    error: null
  });

  useEffect(() => {
    const checkConnection = async () => {
      try {
        console.log('🔍 BlockchainStatus: Checking connection...');
        const blockchainInfo = await chronik.blockchainInfo();
        console.log('✅ BlockchainStatus: Connected, block height:', blockchainInfo.tipHeight);
        
        setStatus({
          connected: true,
          blockHeight: blockchainInfo.tipHeight,
          checking: false,
          error: null
        });
      } catch (error) {
        console.error('❌ BlockchainStatus: Connection error:', error);
        setStatus({
          connected: false,
          blockHeight: 0,
          checking: false,
          error: error.message
        });
      }
    };

    checkConnection();
    
    // Refresh every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (status.checking) {
    return (
      <div className="blockchain-status checking">
        <div className="status-indicator"></div>
        <span>{t('blockchain.checking') || 'Checking blockchain...'}</span>
      </div>
    );
  }

  if (!status.connected) {
    return (
      <div className="blockchain-status error">
        <div className="status-indicator"></div>
        <span>{t('blockchain.disconnected') || 'Blockchain disconnected'}</span>
      </div>
    );
  }

  return (
    <div className="blockchain-status connected">
      <div className="status-indicator"></div>
      <span>
        {t('blockchain.connected') || 'Connected'} • Block {status.blockHeight.toLocaleString()}
      </span>
    </div>
  );
};

export default BlockchainStatus;
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetAtom } from 'jotai';
import { Card, CardContent, Button, Badge } from '../UI';
import { notificationAtom } from '../../atoms';
import { useEcashWallet } from '../../hooks/useEcashWallet';
import TokenLinked from './TokenLinked';
import TokenVisible from './TokenVisible';
import TokenOffer from './TokenOffer';
import HoldersDetails from '../eCash/TokenActions/HoldersDetails';

const TokenCard = ({ 
  token, 
  profileId, 
  onUpdate, 
  showLinkedToggle = true,
  showVisibleToggle = true 
}) => {
  const navigate = useNavigate();
  const { wallet } = useEcashWallet();
  const setNotification = useSetAtom(notificationAtom);
  
  const [holderCount, setHolderCount] = useState(token.holdersCount || 0);
  const [loadingHolders, setLoadingHolders] = useState(false);
  const [showHoldersDetails, setShowHoldersDetails] = useState(false);
  const [holdersData, setHoldersData] = useState(null);

  useEffect(() => {
    if (token.holdersCount !== undefined) {
      setHolderCount(token.holdersCount);
    }
  }, [token.holdersCount]);

  const loadTokenHolders = async () => {
    if (showHoldersDetails) {
      setShowHoldersDetails(false);
      return;
    }

    setLoadingHolders(true);
    try {
      const airdropData = await wallet.calculateAirdropHolders(token.tokenId, 0);
      setHoldersData({
        holdersCount: airdropData.count,
        calculatedHolders: airdropData.holders
      });
      setHolderCount(airdropData.count);
      setShowHoldersDetails(true);
    } catch (err) {
      console.error('Erreur chargement détenteurs:', err);
      setNotification({ type: 'error', message: 'Impossible de charger les détenteurs' });
    } finally {
      setLoadingHolders(false);
    }
  };

  const isDeleted = token.isDeleted || false;
  const isActive = token.isActive !== false; 
  const canToggleVisible = token.isLinked !== false;

  return (
    <Card style={{ 
      opacity: isDeleted ? 0.6 : 1,
      border: isDeleted ? '2px solid #ef4444' : '1px solid var(--border-color)',
      marginBottom: '16px',
      transition: 'all 0.2s ease',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    }}>
      <CardContent style={{ padding: '16px' }}>
        
        {/* --- HEADER --- */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
          {/* Image */}
          <div style={{ position: 'relative' }}>
            <img 
              src={token.image || 'https://placehold.co/56x56'} 
              alt={token.name}
              style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://placehold.co/56x56?text=Token'; }}
            />
            {token.isFromFarmWallet && (
              <div style={{ position: 'absolute', bottom: -4, right: -4, backgroundColor: '#10b981', color: 'white', borderRadius: '50%', padding: '3px', border: '2px solid white', fontSize: '10px', lineHeight: 1 }}>🏡</div>
            )}
          </div>

          {/* Infos */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ marginBottom: '4px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {token.name}
              </h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>{token.ticker}</span>
              <TokenOffer tokenId={token.tokenId} isCreator={true} showIcon={true} />
            </div>
          </div>

          {/* Solde */}
          <div style={{ textAlign: 'right' }}>
             <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--primary-color)' }}>{token.balance}</div>
             <Button
                onClick={() => navigate(`/token/${token.tokenId}`)}
                variant="outline"
                style={{ padding: '0 12px', height: '32px', fontSize: '0.8rem', marginTop: '4px' }}
              >
                Gérer →
              </Button>
          </div>
        </div>

        {/* --- FOOTER ACTIONS --- */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          paddingTop: '12px', 
          marginTop: '4px',
          borderTop: '1px solid #f1f5f9',
          gap: '12px'
        }}>
          {/* Visibilité */}
          <div style={{ flex: 1 }}>
            {showVisibleToggle && (
              <div style={{ transform: 'scale(0.9)', transformOrigin: 'left center' }}>
                <TokenVisible 
                  tokenId={token.tokenId} 
                  profileId={profileId}
                  isVisible={token.isVisible}
                  disabled={!canToggleVisible}
                  onUpdate={(val) => onUpdate && onUpdate({ ...token, isVisible: val })}
                />
              </div>
            )}
          </div>

          {/* Détenteurs (Cliquable) */}
          <div 
            onClick={loadTokenHolders}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', 
              padding: '6px 12px', backgroundColor: showHoldersDetails ? '#e0f2fe' : '#f8fafc', 
              borderRadius: '20px', border: '1px solid #e2e8f0', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s'
            }}
          >
            <span style={{ fontSize: '1rem' }}>👥</span>
            <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#475569' }}>
              {loadingHolders ? '...' : holderCount}
            </span>
            <span style={{ fontSize: '0.7rem' }}>{showHoldersDetails ? '▲' : '▼'}</span>
          </div>

          {/* Lien Profil */}
          <div style={{ flex: 0 }}>
            {showLinkedToggle && (
              <div style={{ transform: 'scale(0.9)', transformOrigin: 'right center' }}>
                <TokenLinked
                  tokenId={token.tokenId}
                  profileId={profileId}
                  isLinked={token.isLinked !== false}
                  onUpdate={(val) => onUpdate && onUpdate({ ...token, isLinked: val })}
                />
              </div>
            )}
          </div>
        </div>

        {/* --- DÉTAILS DÉTENTEURS (Expandable) --- */}
        {showHoldersDetails && holdersData && (
          <div style={{ marginTop: '16px', borderTop: '1px dashed #e2e8f0', paddingTop: '16px' }}>
            <HoldersDetails
              holdersCount={holdersData.holdersCount}
              calculatedHolders={holdersData.calculatedHolders}
              tokenId={token.tokenId}
              setNotification={setNotification}
              onHoldersUpdate={loadTokenHolders}
            />
          </div>
        )}

      </CardContent>
    </Card>
  );
};

export default TokenCard;
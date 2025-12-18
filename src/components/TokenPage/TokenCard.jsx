import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, Button, Badge } from '../UI';
import TokenLinked from './TokenLinked';
import TokenVisible from './TokenVisible';
import TokenOffer from './TokenOffer';

/**
 * TokenCard - Carte d'affichage pour un jeton avec toutes les informations et actions
 */
const TokenCard = ({ 
  token, 
  profileId, 
  onUpdate, 
  showAdminActions = false,
  showLinkedToggle = true,
  showVisibleToggle = true 
}) => {
  const navigate = useNavigate();
  const [holderCount, setHolderCount] = useState(null);
  const [loadingHolders, setLoadingHolders] = useState(true);

  // Charger le nombre de détenteurs depuis la blockchain
  useEffect(() => {
    const loadHolderCount = async () => {
      // Utiliser holdersCount passé en prop si disponible
      setLoadingHolders(false);
      setHolderCount(token.holdersCount || 0);
    };
    
    loadHolderCount();
  }, [token.tokenId, token.holdersCount]);

  const isDeleted = token.isDeleted || false;
  const isActive = token.isActive !== false;
  
  // Si isLinked est false, isVisible devrait être désactivé
  const canToggleVisible = token.isLinked !== false;

  return (
    <Card style={{ 
      opacity: isDeleted ? 0.6 : 1,
      border: isDeleted ? '2px solid #ef4444' : '1px solid var(--border-color)'
    }}>
      <CardContent style={{ padding: '20px' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
        
          <Button
            onClick={() => navigate(`/token/${token.tokenId}`)}
            variant="primary"
            style={{ 
              padding: '8px 16px',
              fontSize: '0.875rem',
              minHeight: 'auto'
            }}
          >
            Gérer →
          </Button>
        </div>

        {/* Stats Row - Nombre détenteurs et Solde */}
        <div className="token-stats">
          <div className="token-stat-item">
            <div className="token-stat-label">
              👥 Détenteurs
            </div>
            <div className="token-stat-value">
              {loadingHolders ? '...' : holderCount || 0}
            </div>
          </div>
          
          <div className="token-stat-item">
            <div className="token-stat-label">
              💰 Votre solde
            </div>
            <div className="token-stat-value">
              {token.balance || 0}
            </div>
          </div>
        </div>

        {/* Toggles - isVisible et isLinked superposés */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
          {showVisibleToggle && (
            <TokenVisible
              tokenId={token.tokenId}
              profileId={profileId}
              isVisible={token.isVisible}
              disabled={!canToggleVisible}
              onUpdate={(newValue) => onUpdate && onUpdate({ ...token, isVisible: newValue })}
            />
          )}
          
          {showLinkedToggle && (
            <TokenLinked
              tokenId={token.tokenId}
              profileId={profileId}
              isLinked={token.isLinked !== false}
              onUpdate={(newValue) => onUpdate && onUpdate({ ...token, isLinked: newValue })}
            />
          )}
        </div>
        {/* Description si présente */}
        {token.description && (
          <div style={{ 
            marginTop: '16px',
            padding: '12px',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '8px',
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
            lineHeight: '1.5'
          }}>
            {token.description}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TokenCard;

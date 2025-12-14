import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, Button, Badge } from '../UI';
import TokenLinked from './TokenLinked';
import TokenVisible from './TokenVisible';

/**
 * TokenCard - Carte d'affichage pour un jeton avec toutes les informations et actions
 */
const TokenCard = ({ 
  token, 
  farmId, 
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
      // TODO: Implémenter avec Chronik
      // Simulé pour l'instant
      setLoadingHolders(false);
      setHolderCount(token.holderCount || 0);
    };
    
    loadHolderCount();
  }, [token.tokenId]);

  const isDeleted = token.isDeleted || false;
  const isActive = token.isActive !== false;

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
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <h3 style={{ 
                fontSize: '1.25rem', 
                fontWeight: '700', 
                margin: 0,
                color: 'var(--text-primary)'
              }}>
                {token.ticker || token.name || 'Token'}
              </h3>
              
              {isDeleted && (
                <Badge variant="danger" style={{ fontSize: '0.75rem' }}>
                  🗑️ Supprimé
                </Badge>
              )}
              
              {!isActive && !isDeleted && (
                <Badge variant="secondary" style={{ fontSize: '0.75rem' }}>
                  ⚫ Inactif
                </Badge>
              )}
              
              {token.isFromFarmWallet && (
                <Badge variant="success" style={{ fontSize: '0.75rem' }}>
                  ✅ Farm Wallet
                </Badge>
              )}
            </div>
            
            {token.name && token.name !== token.ticker && (
              <p style={{ 
                fontSize: '0.875rem', 
                color: 'var(--text-secondary)',
                margin: '0 0 4px 0'
              }}>
                {token.name}
              </p>
            )}
            
            <p style={{ 
              fontSize: '0.75rem', 
              color: 'var(--text-secondary)',
              fontFamily: 'monospace',
              margin: 0,
              wordBreak: 'break-all'
            }}>
              {token.tokenId?.substring(0, 16)}...
            </p>
          </div>
          
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {showVisibleToggle && (
            <TokenVisible
              tokenId={token.tokenId}
              farmId={farmId}
              isVisible={token.isVisible}
              onUpdate={(newValue) => onUpdate && onUpdate({ ...token, isVisible: newValue })}
            />
          )}
          
          {showLinkedToggle && (
            <TokenLinked
              tokenId={token.tokenId}
              farmId={farmId}
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

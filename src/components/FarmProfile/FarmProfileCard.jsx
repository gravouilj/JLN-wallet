import React, { useState } from 'react';
import { useAtom } from 'jotai';
import { useNavigate } from 'react-router-dom';
import { 
  favoriteFarmsAtom, 
  toggleFarmFavoriteAtom, 
  walletConnectedAtom,
  selectedFarmAtom,
  currentTokenIdAtom 
} from '../../atoms';
import { useEcashToken } from '../../hooks/useEcashWallet';
import { StatusBadge, Badge } from '../UI';

/**
 * FarmProfileCard - Carte de profil standardisée pour Directory et Favorites
 * Affiche : Nom, Badge vérifié, localisation, description, tokens, solde, tags, boutons
 */
const FarmProfileCard = ({ farm, farmTickers = {}, onCardClick }) => {
  const navigate = useNavigate();
  const [walletConnected] = useAtom(walletConnectedAtom);
  const [favoriteFarmIds] = useAtom(favoriteFarmsAtom);
  const [, toggleFavorite] = useAtom(toggleFarmFavoriteAtom);
  const [, setSelectedFarm] = useAtom(selectedFarmAtom);
  const [, setCurrentTokenId] = useAtom(currentTokenIdAtom);
  
  const isFavorite = favoriteFarmIds.includes(farm.id);
  
  // Get visible tokens
  const visibleTokens = farm.tokens?.filter(token => token.isVisible) || [];
  const primaryToken = visibleTokens[0];
  
  // Check token balance for primary token
  const { tokenBalance, loading: balanceLoading } = useEcashToken(primaryToken?.tokenId);
  const hasBalance = walletConnected && Number(tokenBalance) > 0;
  
  // Extract certifications
  const certifications = farm.certifications || {};
  const nationalCert = certifications.national;
  const internationalCert = certifications.international;
  
  // Get country flag emoji
  const getCountryFlag = (country) => {
    const flags = {
      'France': '🇫🇷',
      'Belgique': '🇧🇪',
      'Suisse': '🇨🇭',
      'Canada': '🇨🇦',
      'Luxembourg': '🇱🇺'
    };
    return flags[country] || '🌍';
  };
  
  // Get French department code from zip code
  const getFrenchDepartmentCode = (postalCode) => {
    if (!postalCode) return null;
    const zipMatch = postalCode.match(/\b(\d{5})\b/);
    if (zipMatch) {
      return zipMatch[1].substring(0, 2);
    }
    return null;
  };
  
  const handlePayClick = (e) => {
    e.stopPropagation();
    if (primaryToken) {
      setSelectedFarm(farm);
      setCurrentTokenId(primaryToken.tokenId);
      navigate('/wallet');
    }
  };
  
  const handleSelectClick = (e) => {
    e.stopPropagation();
    onCardClick(farm);
  };
  
  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    if (walletConnected) {
      toggleFavorite(farm.id);
    }
  };
  
  const frDeptCode = farm.location_country === 'France' ? getFrenchDepartmentCode(farm.postal_code) : null;
  
  return (
    <div 
      style={{
        backgroundColor: 'var(--bg-primary, #fff)',
        borderRadius: '16px',
        border: '1px solid var(--border-color, #e5e7eb)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s',
        position: 'relative'
      }}
      onClick={() => onCardClick(farm)}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Favorite Icon - Top Right */}
      {walletConnected && (
        <button
          onClick={handleFavoriteClick}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(255,255,255,0.9)',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '1.2rem',
            zIndex: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          {isFavorite ? '⭐' : '☆'}
        </button>
      )}
      
      <div style={{ padding: '20px' }}>
        {/* Header: Name + Badge */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingRight: '40px' }}>
            <h3 style={{ 
              fontSize: '1.25rem', 
              fontWeight: '700', 
              color: 'var(--text-primary)',
              margin: 0
            }}>
              {farm.name}
            </h3>
            {farm.verification_status === 'verified' && (
              <StatusBadge status="verified" type="verification" />
            )}
          </div>
        </div>
        
        {/* Location: Country Flag + City + ZIP/Dept Code */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '1.2rem' }}>
            {getCountryFlag(farm.location_country || farm.country)}
          </span>
          {(farm.city || farm.location_region) && (
            <Badge variant="neutral">
              📍 {farm.city || farm.location_region}
            </Badge>
          )}
          {farm.location_country === 'France' ? (
            frDeptCode && (
              <Badge variant="info">
                {frDeptCode}
              </Badge>
            )
          ) : (
            (farm.location_department || farm.department) && (
              <Badge variant="info">
                🏛️ {farm.location_department || farm.department}
              </Badge>
            )
          )}
        </div>
        
        {/* Description */}
        <p style={{
          fontSize: '0.875rem',
          color: 'var(--text-secondary)',
          lineHeight: '1.5',
          marginBottom: '16px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical'
        }}>
          {farm.description}
        </p>
        
        {/* Tokens Section */}
        {visibleTokens.length > 0 && (
          <div style={{
            marginBottom: '16px',
            padding: '12px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '10px',
            color: 'white'
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', marginBottom: '6px', opacity: 0.9 }}>
              💎 {visibleTokens.length === 1 ? 'Jeton disponible' : `${visibleTokens.length} Jetons disponibles`}
            </div>
            {visibleTokens.map((token, idx) => (
              <div key={token.tokenId} style={{
                marginTop: idx > 0 ? '8px' : '0',
                paddingTop: idx > 0 ? '8px' : '0',
                borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.2)' : 'none'
              }}>
                <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>
                  {farmTickers[token.tokenId] || token.ticker || 'Jeton'}
                  {token.name && token.name !== farm.name && (
                    <span style={{ fontWeight: '400', opacity: 0.9, marginLeft: '4px' }}>
                      - {token.name}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Balance Display */}
        {hasBalance && !balanceLoading && primaryToken && (
          <div style={{
            padding: '8px 12px',
            backgroundColor: 'var(--bg-success, #dcfce7)',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: '600' }}>
              💰 Votre solde : {Number(tokenBalance).toLocaleString()} {farmTickers[primaryToken.tokenId] || primaryToken.ticker}
            </div>
          </div>
        )}
        
        {/* Tags: Products + Services + Certifications */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
          {farm.products?.slice(0, 3).map((product, idx) => (
            <Badge key={`p-${idx}`} variant="success">
                {product}
            </Badge>
          ))}
          {farm.services?.slice(0, 2).map((service, idx) => (
            <Badge key={`s-${idx}`} variant="info">
              {service}
            </Badge>
          ))}
          {nationalCert && (
            <Badge variant="warning">
              🏅 {nationalCert}
            </Badge>
          )}
          {internationalCert && (
            <Badge variant="warning">
              🏅 {internationalCert}
            </Badge>
          )}
        </div>
        
        {/* Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: hasBalance ? '1fr 1fr' : '1fr', gap: '8px' }}>
          <button
            onClick={handleSelectClick}
            style={{
              padding: '10px 16px',
              backgroundColor: 'var(--primary-color, #3b82f6)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.opacity = '0.9'}
            onMouseLeave={(e) => e.target.style.opacity = '1'}
          >
            Voir le profil
          </button>
          {hasBalance && (
            <button
              onClick={handlePayClick}
              style={{
                padding: '10px 16px',
                backgroundColor: '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.opacity = '0.9'}
              onMouseLeave={(e) => e.target.style.opacity = '1'}
            >
              💳 Payer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FarmProfileCard;

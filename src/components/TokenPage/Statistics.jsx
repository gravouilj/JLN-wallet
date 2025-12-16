import React, { useState } from 'react';
import { Card, CardContent } from '../UI';

/**
 * Statistics - Affiche les statistiques d'un token avec option compact
 * @param {object} genesisInfo - Informations blockchain du token
 * @param {string} myBalance - Solde de l'utilisateur
 * @param {number} decimals - Nombre de décimales
 * @param {object} tokenInfo - Informations complètes du token
 * @param {number} holdersCount - Nombre de détenteurs
 * @param {boolean} loadingHolders - Chargement du nombre de détenteurs
 * @param {function} formatAmount - Fonction pour formater les montants
 * @param {function} formatDate - Fonction pour formater les dates
 * @param {boolean} compact - Mode compact initial
 */
const Statistics = ({ 
  genesisInfo, 
  myBalance, 
  decimals, 
  tokenInfo, 
  holdersCount, 
  loadingHolders,
  formatAmount,
  formatDate,
  compact = false 
}) => {
  const [isCompact, setIsCompact] = useState(compact);

  const stats = [
    {
      label: 'En Circulation',
      value: formatAmount(genesisInfo.circulatingSupply || '0', decimals),
      icon: '🔄'
    },
    {
      label: 'Genèse',
      value: formatAmount(genesisInfo.genesisSupply || '0', decimals),
      icon: '🌱'
    },
    {
      label: 'Mon Solde',
      value: formatAmount(myBalance, decimals),
      icon: '💰'
    },
    {
      label: 'Date Création',
      value: formatDate(tokenInfo?.timeFirstSeen),
      icon: '📅',
      small: true
    },
    {
      label: 'Décimales',
      value: decimals,
      icon: '🔢'
    },
    {
      label: 'Détenteurs',
      value: loadingHolders ? '⏳...' : holdersCount !== null ? holdersCount : 'N/A',
      icon: '👥'
    }
  ];

  return (
    <Card>
      <CardContent style={{ padding: isCompact ? '16px' : '24px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: isCompact ? '12px' : '16px'
        }}>
          <h3 style={{
            fontSize: isCompact ? '0.9rem' : '1rem',
            fontWeight: '600',
            color: 'var(--text-primary)',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📊 Statistiques
          </h3>
          <button
            onClick={() => setIsCompact(!isCompact)}
            style={{
              padding: '6px 12px',
              fontSize: '0.85rem',
              backgroundColor: 'transparent',
              color: 'var(--primary-color, #0074e4)',
              border: '1px solid var(--primary-color, #0074e4)',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            title={isCompact ? 'Mode normal' : 'Mode compact'}
          >
            {isCompact ? '📖' : '📋'}
          </button>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: isCompact ? '1fr' : 'repeat(2, 1fr)',
          gap: isCompact ? '8px' : '12px'
        }}>
          {stats.map((stat, index) => (
            <div 
              key={index}
              style={{
                padding: isCompact ? '8px' : '12px',
                backgroundColor: 'var(--bg-secondary, #f5f5f5)',
                borderRadius: '8px',
                display: isCompact ? 'flex' : 'block',
                alignItems: isCompact ? 'center' : 'flex-start',
                justifyContent: isCompact ? 'space-between' : 'flex-start'
              }}
            >
              <div style={{
                fontSize: isCompact ? '0.7rem' : '0.75rem',
                fontWeight: '600',
                color: 'var(--text-secondary, #6b7280)',
                marginBottom: isCompact ? '0' : '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {isCompact && <span>{stat.icon}</span>}
                {stat.label}
              </div>
              <div style={{
                fontSize: stat.small && !isCompact ? '0.9rem' : isCompact ? '0.85rem' : '1.25rem',
                fontWeight: '700',
                color: 'var(--text-primary)'
              }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default Statistics;
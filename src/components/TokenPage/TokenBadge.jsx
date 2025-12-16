import React from 'react';
import { Badge } from '../UI';

/**
 * TokenBadge - Affiche les badges d'état du token
 * @param {string} protocol - Protocole du token (ALP, SLP, etc.)
 * @param {boolean} isCreator - True si l'utilisateur est le créateur
 * @param {object} genesisInfo - Informations de genèse du token
 */
const TokenBadge = ({ protocol, isCreator, genesisInfo }) => {
  const circulatingSupply = BigInt(genesisInfo?.circulatingSupply || '0');
  const hasAuthPubkey = !!genesisInfo?.authPubkey;

  return (
    <div style={{ 
      display: 'flex', 
      gap: '8px', 
      flexWrap: 'wrap',
      marginTop: '12px'
    }}>
      <Badge variant="primary">{protocol}</Badge>
      
      {isCreator ? (
        <Badge variant="success">
          {hasAuthPubkey ? '🔄 Variable' : '🔒 Fixe'}
        </Badge>
      ) : (
        <Badge variant="warning">🔒 Fixe</Badge>
      )}
     
      {circulatingSupply > 0n ? (
        <Badge variant="success">
          🟢 En Circulation
        </Badge>
      ) : (
        <Badge variant="secondary">
          ⚫ Inactif
        </Badge>
      )}
    </div>
  );
};

export default TokenBadge;
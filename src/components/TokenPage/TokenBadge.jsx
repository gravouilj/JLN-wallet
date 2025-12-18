import React from 'react';
import { Badge } from '../UI';
import TokenOffer from './TokenOffer';

/**
 * TokenBadge - Affiche les badges d'état du token
 * @param {string} tokenId - ID du token
 * @param {string} protocol - Protocole du token (ALP, SLP, etc.)
 * @param {boolean} isCreator - True si l'utilisateur est le créateur
 * @param {object} genesisInfo - Informations de genèse du token
 */
const TokenBadge = ({ tokenId, protocol, isCreator, genesisInfo }) => {
  const circulatingSupply = BigInt(genesisInfo?.circulatingSupply || '0');

  return (
    <div style={{ 
      display: 'flex', 
      gap: '8px', 
      flexWrap: 'wrap',
      marginTop: '12px'
    }}>
      <TokenOffer 
        tokenId={tokenId}
        isCreator={isCreator}
      />
     
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
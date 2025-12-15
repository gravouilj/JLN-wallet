import React, { useState, useEffect } from 'react';
import { FarmService } from '../../services/profilService';
import { useEcashWallet } from '../../hooks/useEcashWallet';
import { Switch } from '../UI';

/**
 * TokenLinked - Switch pour lier/dissocier un jeton du profil de ferme
 * Si dissocié : n'apparaît pas dans ManageFarmPage mais reste visible dans ManageTokenPage
 */
const TokenLinked = ({ tokenId, farmId, isLinked: initialIsLinked = true, onUpdate }) => {
  const { address } = useEcashWallet();
  const [isLinked, setIsLinked] = useState(initialIsLinked);
  const [loading, setLoading] = useState(false);

  // Synchroniser avec les changements de props
  useEffect(() => {
    setIsLinked(initialIsLinked);
  }, [initialIsLinked]);

  const handleToggle = async () => {
    if (!address) {
      console.error('Erreur : Aucune adresse wallet');
      return;
    }

    setLoading(true);
    try {
      // Utiliser FarmService.updateTokenMetadata pour la cohérence
      await FarmService.updateTokenMetadata(address, tokenId, {
        isLinked: !isLinked
      });

      setIsLinked(!isLinked);
      if (onUpdate) onUpdate(!isLinked);

      console.log(`✅ Jeton ${!isLinked ? 'lié' : 'dissocié'} du profil Public`);
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour:', error);
      // Restaurer l'état précédent en cas d'erreur
      setIsLinked(isLinked);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px',
      backgroundColor: 'var(--bg-secondary)',
      borderRadius: '8px'
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ 
          fontSize: '0.875rem', 
          fontWeight: '600',
          color: 'var(--text-primary)',
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span>🔗</span>
          <span>Lié au profil Public</span>
        </div>
        <div style={{ 
          fontSize: '0.75rem', 
          color: 'var(--text-secondary)'
        }}>
          {isLinked ? 'Affiché dans votre profil Public' : 'Non affiché dans votre profil Public'}
        </div>
      </div>
      <Switch 
        checked={isLinked}
        onChange={handleToggle}
        disabled={loading}
      />
    </div>
  );
};

export default TokenLinked;

import React, { useState, useEffect } from 'react';
import { FarmService } from '../../services/profilService';
import { useEcashWallet } from '../../hooks/useEcashWallet';
import { Switch } from '../UI';

/**
 * TokenVisible - Switch pour afficher/masquer un jeton sur le profil public (DirectoryPage)
 */
const TokenVisible = ({ tokenId, farmId, isVisible: initialIsVisible = true, onUpdate, disabled = false }) => {
  const { address } = useEcashWallet();
  const [isVisible, setIsVisible] = useState(initialIsVisible);
  const [loading, setLoading] = useState(false);

  // Synchroniser avec les changements de props
  useEffect(() => {
    setIsVisible(initialIsVisible);
  }, [initialIsVisible]);

  const handleToggle = async () => {
    if (!address) {
      console.error('Erreur : Aucune adresse wallet');
      return;
    }

    setLoading(true);
    try {
      // Utiliser FarmService.updateTokenMetadata pour la cohérence
      await FarmService.updateTokenMetadata(address, tokenId, {
        isVisible: !isVisible
      });

      setIsVisible(!isVisible);
      if (onUpdate) onUpdate(!isVisible);

      console.log(`✅ Jeton ${!isVisible ? 'visible' : 'masqué'} dans l'annuaire`);
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour:', error);
      // Restaurer l'état précédent en cas d'erreur
      setIsVisible(isVisible);
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
      borderRadius: '8px',
      opacity: disabled ? 0.6 : 1
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
          <span>👁️</span>
          <span>Visibilité publique</span>
        </div>
        <div style={{ 
          fontSize: '0.75rem', 
          color: 'var(--text-secondary)'
        }}>
          {disabled 
            ? 'Désactivé (jeton non lié au profil)'
            : isVisible ? 'Visible dans l\'annuaire' : 'Masqué de l\'annuaire'}
        </div>
      </div>
      <Switch 
        checked={isVisible}
        onChange={handleToggle}
        disabled={loading || disabled}
      />
    </div>
  );
};

export default TokenVisible;

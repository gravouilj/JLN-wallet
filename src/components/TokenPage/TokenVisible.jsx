import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Switch } from '../UI';

/**
 * TokenVisible - Switch pour afficher/masquer un jeton sur le profil public (DirectoryPage)
 */
const TokenVisible = ({ tokenId, farmId, isVisible: initialIsVisible = true, onUpdate }) => {
  const [isVisible, setIsVisible] = useState(initialIsVisible);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (!farmId) {
      alert('Erreur : Aucune ferme associée');
      return;
    }

    setLoading(true);
    try {
      // Mettre à jour dans la table farms le tableau tokens
      const { data: farm, error: fetchError } = await supabase
        .from('farms')
        .select('tokens')
        .eq('id', farmId)
        .single();

      if (fetchError) throw fetchError;

      const tokens = farm.tokens || [];
      const updatedTokens = tokens.map(t => {
        if (t.tokenId === tokenId) {
          return { ...t, isVisible: !isVisible };
        }
        return t;
      });

      const { error: updateError } = await supabase
        .from('farms')
        .update({ tokens: updatedTokens })
        .eq('id', farmId);

      if (updateError) throw updateError;

      setIsVisible(!isVisible);
      if (onUpdate) onUpdate(!isVisible);

      console.log(`✅ Jeton ${!isVisible ? 'visible' : 'masqué'} dans l'annuaire`);
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour:', error);
      alert('Erreur lors de la mise à jour');
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
          <span>👁️</span>
          <span>Visibilité publique</span>
        </div>
        <div style={{ 
          fontSize: '0.75rem', 
          color: 'var(--text-secondary)'
        }}>
          {isVisible ? 'Visible dans l\'annuaire' : 'Masqué de l\'annuaire'}
        </div>
      </div>
      <Switch 
        checked={isVisible}
        onChange={handleToggle}
        disabled={loading}
      />
    </div>
  );
};

export default TokenVisible;

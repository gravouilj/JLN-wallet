import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Switch } from '../UI';

/**
 * TokenLinked - Switch pour lier/dissocier un jeton du profil de ferme
 * Si dissocié : n'apparaît pas dans ManageFarmPage mais reste visible dans ManageTokenPage
 */
const TokenLinked = ({ tokenId, farmId, isLinked: initialIsLinked = true, onUpdate }) => {
  const [isLinked, setIsLinked] = useState(initialIsLinked);
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
          return { ...t, isLinked: !isLinked };
        }
        return t;
      });

      const { error: updateError } = await supabase
        .from('farms')
        .update({ tokens: updatedTokens })
        .eq('id', farmId);

      if (updateError) throw updateError;

      setIsLinked(!isLinked);
      if (onUpdate) onUpdate(!isLinked);

      console.log(`✅ Jeton ${!isLinked ? 'lié' : 'dissocié'} du profil Public`);
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

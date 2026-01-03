import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../../hooks';
import { supabase } from '../../../services/supabaseClient';

/**
 * ProfileMiniCard - Affiche les informations essentielles d'un profil créateur dans un ticket
 * Utilisé dans TicketDetailModal pour donner le contexte au support
 * 
 * @param {string} profileId - UUID du profil créateur
 * @param {boolean} compact - Mode compact (1 ligne)
 */
export const ProfileMiniCard = ({ profileId, compact = false }) => {
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileId) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, email, is_verified, wallet_address')
          .eq('id', profileId)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (err) {
        console.error('Error fetching profile for ticket:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [profileId]);

  if (!profileId) {
    return (
      <div style={{
        padding: '12px 16px',
        backgroundColor: 'var(--bg-secondary, #f1f5f9)',
        borderRadius: '8px',
        border: '1px solid var(--border-color, #e5e7eb)',
        color: 'var(--text-secondary, #64748b)',
        fontSize: '0.875rem',
        fontStyle: 'italic'
      }}>
        {t('ticket.noProfileLinked')}
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        padding: compact ? '8px 12px' : '16px',
        backgroundColor: 'var(--bg-secondary, #f1f5f9)',
        borderRadius: compact ? '6px' : '12px',
        border: '1px solid var(--border-color, #e5e7eb)',
        color: 'var(--text-secondary)',
        fontSize: '0.875rem'
      }}>
        {t('common.loading')}...
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{
        padding: '12px 16px',
        backgroundColor: 'var(--bg-warning-light, #fef3c7)',
        borderRadius: '8px',
        border: '1px solid var(--warning, #f59e0b)',
        color: 'var(--text-primary)',
        fontSize: '0.875rem'
      }}>
        ⚠️ {t('ticket.profileNotFound')}
      </div>
    );
  }

  if (compact) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        backgroundColor: 'var(--bg-secondary, #f1f5f9)',
        borderRadius: '6px',
        fontSize: '0.875rem'
      }}>
        <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
          {profile.name}
        </span>
        {profile.is_verified && (
          <span style={{ fontSize: '1rem' }} title={t('profile.verified')}>
            ✓
          </span>
        )}
      </div>
    );
  }

  return (
    <div style={{
      padding: '16px',
      backgroundColor: 'var(--bg-secondary, #f1f5f9)',
      borderRadius: '12px',
      border: '1px solid var(--border-color, #e5e7eb)'
    }}>
      {/* Header: Name + Badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px'
      }}>
        <span style={{
          fontSize: '1.125rem',
          fontWeight: '700',
          color: 'var(--text-primary)'
        }}>
          {profile.name}
        </span>
        {profile.is_verified && (
          <span 
            style={{ 
              fontSize: '1.25rem',
              color: 'var(--success, #10b981)'
            }} 
            title={t('profile.verified')}
          >
            ✓
          </span>
        )}
      </div>

      {/* Email */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          marginBottom: '4px',
          textTransform: 'uppercase',
          fontWeight: '600'
        }}>
          {t('profile.email')}
        </div>
        <div style={{
          fontSize: '0.875rem',
          color: 'var(--text-primary)',
          wordBreak: 'break-word'
        }}>
          {profile.email}
        </div>
      </div>

      {/* Wallet Address (truncated) */}
      <div style={{
        paddingTop: '12px',
        borderTop: '1px solid var(--border-color, #e5e7eb)'
      }}>
        <div style={{
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          marginBottom: '4px',
          textTransform: 'uppercase',
          fontWeight: '600'
        }}>
          {t('wallet.address')}
        </div>
        <div style={{
          fontSize: '0.7rem',
          color: 'var(--text-secondary)',
          fontFamily: 'monospace',
          wordBreak: 'break-all'
        }}>
          {profile.wallet_address?.substring(0, 20)}...
          {profile.wallet_address?.substring(profile.wallet_address.length - 12)}
        </div>
      </div>
    </div>
  );
};

export default ProfileMiniCard;

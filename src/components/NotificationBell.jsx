import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAtom } from 'jotai';
import { notificationAtom, selectedProfileAtom } from '../atoms';
import { supabase } from '../services/supabaseClient';
import { useEcashWallet } from '../hooks/useEcashWallet';

/**
 * NotificationBell - Indicateur de notifications
 * 
 * Conforme au STYLING_GUIDE.md
 * 
 * Affiche un badge de notification pour les événements importants :
 * - Nouveaux tickets créateur/client
 * - Changements de statut de vérification
 * - Nouveaux airdrops reçus
 * - Messages admins
 * 
 * @param {Object} props
 * @param {boolean} props.compact - Mode compact (icône seule)
 */
const NotificationBell = ({ compact = false }) => {
  const navigate = useNavigate();
  const { address } = useEcashWallet();
  const [, setNotification] = useAtom(notificationAtom);
  const [selectedProfile] = useAtom(selectedProfileAtom);
  
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isCreator, setIsCreator] = useState(false);

  // Charger les notifications
  const loadNotifications = async () => {
    if (!address) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Récupérer le profil du créateur pour obtenir le profilId
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('owner_address', address)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') throw profileError;
      const profilId = profileData?.id;
      const hasProfile = !!profilId;
      setIsCreator(hasProfile);
      
      // 1. Charger les tickets non lus pour ce créateur
      // Inclure : tickets créateur→admin (sans token_id) et signalements de profil
      let ticketsData = null;
      if (profilId) {
        const { data, error: ticketsError } = await supabase
          .from('tickets')
          .select('id, type, status, subject, created_at, farm_id, token_id')
          .eq('farm_id', profilId)
          .or('and(type.eq.creator,token_id.is.null),type.eq.report')
          .in('status', ['open', 'in_progress'])
          .order('created_at', { ascending: false })
          .limit(10);

        if (ticketsError) throw ticketsError;
        ticketsData = data;
      }

      // 2. Charger les changements de statut de vérification (depuis profiles)
      const { data: farmsData, error: farmsError } = await supabase
        .from('profiles')
        .select('id, name, status, status_updated_at')
        .eq('owner_address', address)
        .not('status', 'is', null)
        .order('status_updated_at', { ascending: false })
        .limit(5);

      if (farmsError) throw farmsError;

      // 3. Charger les transactions récentes depuis activity_history (7 derniers jours)
      let activityData = null;
      if (profilId) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        try {
          const { data, error: activityError } = await supabase
            .from('activity_history')
            .select('id, action_type, amount, token_ticker, created_at, details, token_id')
            .eq('farm_id', profilId)
            .gte('created_at', sevenDaysAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(10);

          if (!activityError) {
            activityData = data;
          }
        } catch (err) {
          // Table peut ne pas exister, on continue
          console.warn('⚠️ activity_history non disponible:', err);
        }
      }

      // Construire la liste des notifications
      const allNotifications = [];

      // Ajouter les tickets
      if (ticketsData) {
        ticketsData.forEach(ticket => {
          allNotifications.push({
            id: `ticket-${ticket.id}`,
            type: 'ticket',
            title: ticket.type === 'report' ? '🚨 Nouveau signalement' : '💬 Nouveau ticket',
            subtitle: ticket.subject || `Statut: ${ticket.status}`,
            timestamp: new Date(ticket.created_at),
            data: ticket,
            isRead: false
          });
        });
      }

      // Ajouter les changements de statut (seulement ceux des 7 derniers jours)
      if (farmsData) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        farmsData.forEach(farm => {
          const statusDate = new Date(farm.status_updated_at);
          if (statusDate > sevenDaysAgo && farm.status !== 'pending') {
            allNotifications.push({
              id: `farm-${farm.id}`,
              type: 'verification',
              title: `Statut de "${farm.name}" mis à jour`,
              subtitle: `Nouveau statut: ${farm.status}`,
              timestamp: statusDate,
              data: farm,
              isRead: false
            });
          }
        });
      }

      // Ajouter les transactions récentes
      if (activityData) {
        activityData.forEach(activity => {
          const actionIcons = {
            SEND: '📤',
            AIRDROP: '🎁',
            MINT: '🏭',
            BURN: '🔥',
            CREATE: '🔨',
            IMPORT: '📥'
          };
          const icon = actionIcons[activity.action_type] || '📋';
          
          allNotifications.push({
            id: `activity-${activity.id}`,
            type: 'transaction',
            title: `${icon} ${activity.action_type} - ${activity.token_ticker}`,
            subtitle: `Montant: ${activity.amount}`,
            timestamp: new Date(activity.created_at),
            data: activity,
            isRead: false
          });
        });
      }

      // Trier par date décroissante
      allNotifications.sort((a, b) => b.timestamp - a.timestamp);

      setNotifications(allNotifications);
      setUnreadCount(allNotifications.length);
    } catch (err) {
      console.error('❌ Erreur chargement notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Charger au montage et toutes les 30 secondes
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [address]); // IMPORTANT: Recharger quand l'adresse change

  // Marquer une notification comme lue
  const markAsRead = async (notif) => {
    try {
      if (notif.type === 'ticket') {
        await supabase
          .from('tickets')
          .update({ read_by_user: true })
          .eq('id', notif.data.id);
      }
      
      // Retirer de la liste locale
      setNotifications(prev => prev.filter(n => n.id !== notif.id));
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Naviguer vers la page appropriée
      if (notif.type === 'ticket') {
        navigate('/support', { state: { ticketId: notif.data.id } });
      } else if (notif.type === 'verification') {
        navigate('/manage-profile', { state: { activeTab: 'verification' } });
      } else if (notif.type === 'transaction') {
        // Naviguer vers la page du token ou l'historique
        if (notif.data.token_id) {
          navigate(`/token/${notif.data.token_id}`);
        }
      }
      
      setIsOpen(false);
    } catch (err) {
      console.error('❌ Erreur marquage notification:', err);
      setNotification({
        type: 'error',
        message: 'Impossible de marquer la notification comme lue'
      });
    }
  };

  // Marquer toutes comme lues
  const markAllAsRead = async () => {
    try {
      // Marquer tous les tickets comme lus
      const ticketIds = notifications
        .filter(n => n.type === 'ticket')
        .map(n => n.data.id);
      
      if (ticketIds.length > 0) {
        await supabase
          .from('tickets')
          .update({ read_by_user: true })
          .in('id', ticketIds);
      }
      
      setNotifications([]);
      setUnreadCount(0);
      setIsOpen(false);
      
      setNotification({
        type: 'success',
        message: '✅ Toutes les notifications ont été marquées comme lues'
      });
    } catch (err) {
      console.error('❌ Erreur marquage toutes notifications:', err);
      setNotification({
        type: 'error',
        message: 'Impossible de marquer toutes les notifications'
      });
    }
  };

  // Formater le timestamp
  const formatTimestamp = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins}m`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR');
  };

  // Icône selon le type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'ticket':
        return '🎫';
      case 'verification':
        return '✅';      case 'transaction':
        return '💸';      case 'airdrop':
        return '🎁';
      case 'admin':
        return '📢';
      default:
        return '🔔';
    }
  };

  // Mode compact (juste le badge)
  if (compact) {
    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="hover-lift"
          style={{
            position: 'relative',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '1.25rem',
            transition: 'all 0.2s'
          }}
          aria-label="Notifications"
        >
          🔔
          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                backgroundColor: 'var(--accent-error)',
                color: '#fff',
                fontSize: '0.7rem',
                fontWeight: 'bold',
                padding: '2px 6px',
                borderRadius: '12px',
                minWidth: '18px',
                textAlign: 'center'
              }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown */}
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              onClick={() => setIsOpen(false)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 998
              }}
            />
            
            {/* Menu */}
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '360px',
                maxHeight: '480px',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-primary)',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                zIndex: 999,
                overflow: 'hidden'
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: '16px',
                  borderBottom: '1px solid var(--border-primary)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <h3 style={{ 
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  color: 'var(--text-primary)',
                  margin: 0
                }}>
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: 'var(--accent-primary)',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg-secondary)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    Tout marquer comme lu
                  </button>
                )}
              </div>

              {/* Lien vers Support (créateurs uniquement) */}
              {isCreator && (
                <div
                  style={{
                    padding: '12px 16px',
                    backgroundColor: 'var(--info-light)',
                    borderBottom: '1px solid var(--border-info)'
                  }}
                >
                  <button
                    onClick={() => {
                      navigate('/support');
                      setIsOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'var(--accent-primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'transform 0.2s, opacity 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.opacity = '0.9';
                      e.target.style.transform = 'scale(1.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.opacity = '1';
                      e.target.style.transform = 'scale(1)';
                    }}
                  >
                    <span style={{ fontSize: '1.1rem' }}>💬</span>
                    <span>Accéder au Support</span>
                  </button>
                </div>
              )}

              {/* Liste des notifications */}
              <div
                style={{
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}
              >
                {loading ? (
                  <div
                    style={{
                      padding: '40px 16px',
                      textAlign: 'center',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    ⏳ Chargement...
                  </div>
                ) : notifications.length === 0 ? (
                  <div
                    style={{
                      padding: '40px 16px',
                      textAlign: 'center',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🔔</div>
                    <p style={{ margin: 0, fontSize: '0.875rem' }}>
                      Aucune notification
                    </p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => markAsRead(notif)}
                      className="hover-lift"
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--border-primary)',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        backgroundColor: 'var(--bg-primary)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
                    >
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ fontSize: '1.5rem' }}>
                          {getNotificationIcon(notif.type)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              color: 'var(--text-primary)',
                              marginBottom: '4px'
                            }}
                          >
                            {notif.title}
                          </div>
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-secondary)',
                              marginBottom: '4px'
                            }}
                          >
                            {notif.subtitle}
                          </div>
                          <div
                            style={{
                              fontSize: '0.7rem',
                              color: 'var(--text-tertiary)'
                            }}
                          >
                            {formatTimestamp(notif.timestamp)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Mode normal (avec texte)
  return (
    <div
      className="d-flex align-center gap-2 p-3 rounded hover-lift"
      style={{
        position: 'relative',
        backgroundColor: unreadCount > 0 ? 'var(--info-light)' : 'var(--bg-secondary)',
        border: `1px solid ${unreadCount > 0 ? 'var(--border-info)' : 'var(--border-primary)'}`,
        cursor: 'pointer',
        transition: 'all 0.2s'
      }}
      onClick={() => setIsOpen(!isOpen)}
    >
      <span style={{ fontSize: '1.5rem' }}>🔔</span>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: '0.875rem',
            fontWeight: '600',
            color: 'var(--text-primary)'
          }}
        >
          Notifications
        </div>
        {unreadCount > 0 && (
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-info)'
            }}
          >
            {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}
          </div>
        )}
      </div>
      {unreadCount > 0 && (
        <span
          style={{
            backgroundColor: 'var(--accent-error)',
            color: '#fff',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            padding: '4px 8px',
            borderRadius: '12px',
            minWidth: '24px',
            textAlign: 'center'
          }}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}

      {/* Dropdown (identique au mode compact) */}
      {isOpen && (
        <>
          <div
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 998
            }}
          />
          
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: '360px',
              maxHeight: '480px',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-primary)',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
              zIndex: 999,
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                padding: '16px',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <h3 style={{ 
                fontSize: '1rem',
                fontWeight: 'bold',
                color: 'var(--text-primary)',
                margin: 0
              }}>
                Notifications
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--accent-primary)',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg-secondary)'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  Tout marquer comme lu
                </button>
              )}
            </div>

            {/* Lien vers Support (créateurs uniquement) */}
            {isCreator && (
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'var(--info-light)',
                  borderBottom: '1px solid var(--border-info)'
                }}
              >
                <button
                  onClick={() => {
                    navigate('/support');
                    setIsOpen(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--accent-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'transform 0.2s, opacity 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.opacity = '0.9';
                    e.target.style.transform = 'scale(1.02)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.opacity = '1';
                    e.target.style.transform = 'scale(1)';
                  }}
                >
                  <span style={{ fontSize: '1.1rem' }}>💬</span>
                  <span>Accéder au Support</span>
                </button>
              </div>
            )}

            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {loading ? (
                <div
                  style={{
                    padding: '40px 16px',
                    textAlign: 'center',
                    color: 'var(--text-secondary)'
                  }}
                >
                  ⏳ Chargement...
                </div>
              ) : notifications.length === 0 ? (
                <div
                  style={{
                    padding: '40px 16px',
                    textAlign: 'center',
                    color: 'var(--text-secondary)'
                  }}
                >
                  <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🔔</div>
                  <p style={{ margin: 0, fontSize: '0.875rem' }}>
                    Aucune notification
                  </p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => markAsRead(notif)}
                    className="hover-lift"
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border-primary)',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      backgroundColor: 'var(--bg-primary)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
                  >
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ fontSize: '1.5rem' }}>
                        {getNotificationIcon(notif.type)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: 'var(--text-primary)',
                            marginBottom: '4px'
                          }}
                        >
                          {notif.title}
                        </div>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            marginBottom: '4px'
                          }}
                        >
                          {notif.subtitle}
                        </div>
                        <div
                          style={{
                            fontSize: '0.7rem',
                            color: 'var(--text-tertiary)'
                          }}
                        >
                          {formatTimestamp(notif.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;

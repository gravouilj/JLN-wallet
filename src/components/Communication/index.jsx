import React, { useState } from 'react';
import { 
  Accordion, 
  Badge, 
  InfoBox, 
  MessageThread, 
  Textarea, 
  Button, 
  Card, 
  CardContent,
  Stack,
  StatusBadge
} from '../UI';

/**
 * CommunicationSection - Section unifiée dissociant 3 types de messages
 * 1. Messages VÉRIFICATION (masqués si validée ET clôturée)
 * 2. Messages GÉNÉRAUX (toujours visibles)
 * 3. Signalements (gérés par ReportsSection)
 */
export const CommunicationSection = ({ 
  farm, 
  onSendMessage, 
  loading = false,
  showReplyBox = true,
  unreadCount: propUnreadCount
}) => {
  const [verificationMessage, setVerificationMessage] = useState('');
  const [generalMessage, setGeneralMessage] = useState('');
  const [showAllVerification, setShowAllVerification] = useState(false);
  const [showAllGeneral, setShowAllGeneral] = useState(false);
  
  if (!farm) return null;
  
  const allMessages = farm.communication_history || [];
  
  // Séparer messages selon le type
  const verificationMessages = allMessages.filter(msg => msg.type === 'verification' || !msg.type);
  const generalMessages = allMessages.filter(msg => msg.type === 'general');
  
  const isVerified = farm.verification_status === 'verified';
  const isConversationClosed = farm.conversation_closed === true;
  const isPending = ['pending', 'info_requested'].includes(farm.verification_status);
  
  // Masquer section vérification si clôturée par l'admin
  const showVerification = !isConversationClosed;
  
  // Limiter l'affichage des messages (4 derniers par défaut)
  const visibleVerificationMessages = showAllVerification 
    ? verificationMessages 
    : verificationMessages.slice(-4);
  const visibleGeneralMessages = showAllGeneral 
    ? generalMessages 
    : generalMessages.slice(-4);
  
  // Calcul des messages non lus pour chaque section
  const unreadVerification = propUnreadCount !== undefined ? propUnreadCount : 
    verificationMessages.filter(msg => msg.author === 'admin' && !msg.read).length;
  const unreadGeneral = generalMessages.filter(msg => msg.author === 'admin' && !msg.read).length;
  
  const handleSendVerification = () => {
    if (!verificationMessage.trim()) return;
    onSendMessage(verificationMessage.trim(), 'verification');
    setVerificationMessage('');
  };
  
  const handleSendGeneral = () => {
    if (!generalMessage.trim()) return;
    onSendMessage(generalMessage.trim(), 'general');
    setGeneralMessage('');
  };
  
  return (
    <>
      {/* SECTION 1: Messages de VÉRIFICATION */}
      {showVerification && (
        <Accordion
          title="🔍 Vérification - Échanges officiels"
          badge={
            <>
              {verificationMessages.length > 0 && (
                <Badge variant="primary">
                  {verificationMessages.length} message{verificationMessages.length > 1 ? 's' : ''}
                </Badge>
              )}
              {unreadVerification > 0 && (
                <Badge 
                  variant="danger" 
                  style={{ 
                    marginLeft: '0.5rem',
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                  }}
                >
                  {unreadVerification} nouveau{unreadVerification > 1 ? 'x' : ''}
                </Badge>
              )}
            </>
          }
          variant="default"
          defaultOpen={isPending || unreadVerification > 0}
        >
          {isConversationClosed && (
            <InfoBox type="success" icon="✓">
              Conversation clôturée. Les échanges concernant votre vérification sont terminés.
            </InfoBox>
          )}
          {!isConversationClosed && (
            <InfoBox type="info">
              Historique des communications officielles concernant la vérification de votre établissement.
            </InfoBox>
          )}
          
          <MessageThread
            messages={visibleVerificationMessages}
            loading={loading}
            emptyMessage="Aucun message pour le moment. L'administrateur vous contactera si nécessaire."
          />
          
          {/* Bouton "Voir tout" si plus de 4 messages */}
          {verificationMessages.length > 4 && !showAllVerification && (
            <Button
              onClick={() => setShowAllVerification(true)}
              variant="ghost"
              fullWidth
              style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}
            >
              📜 Voir les {verificationMessages.length - 4} messages précédents
            </Button>
          )}
          
          {showAllVerification && verificationMessages.length > 4 && (
            <Button
              onClick={() => setShowAllVerification(false)}
              variant="ghost"
              fullWidth
              style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}
            >
              ▲ Masquer les anciens messages
            </Button>
          )}
          
          {showReplyBox && isPending && !isConversationClosed && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
              <Textarea
                value={verificationMessage}
                onChange={(e) => setVerificationMessage(e.target.value)}
                placeholder="Répondre à l'administrateur concernant votre vérification..."
              />
              <Button
                onClick={handleSendVerification}
                disabled={!verificationMessage.trim() || loading}
                fullWidth
                variant="primary"
              >
                {loading ? '⏳ Envoi en cours...' : '📤 Envoyer la réponse'}
              </Button>
            </div>
          )}
        </Accordion>
      )}
      
      {/* SECTION 2: Messages GÉNÉRAUX (toujours visible) */}
      <Accordion
        title="💬 Questions & Commentaires généraux"
        badge={
          <>
            {generalMessages.length > 0 && (
              <Badge variant="info">
                {generalMessages.length} message{generalMessages.length > 1 ? 's' : ''}
              </Badge>
            )}
            {unreadGeneral > 0 && (
              <Badge 
                variant="danger" 
                style={{ 
                  marginLeft: '0.5rem',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }}
              >
                {unreadGeneral} nouveau{unreadGeneral > 1 ? 'x' : ''}
              </Badge>
            )}
          </>
        }
        variant="default"
        defaultOpen={unreadGeneral > 0}
      >
        <InfoBox type="info">
          Pour toute question générale, problème technique ou commentaire non lié à la vérification.
        </InfoBox>
        
        <MessageThread
          messages={visibleGeneralMessages}
          loading={loading}
          emptyMessage="Aucune discussion générale pour le moment."
        />
        
        {/* Bouton "Voir tout" si plus de 4 messages */}
        {generalMessages.length > 4 && !showAllGeneral && (
          <Button
            onClick={() => setShowAllGeneral(true)}
            variant="ghost"
            fullWidth
            style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}
          >
            📜 Voir les {generalMessages.length - 4} messages précédents
          </Button>
        )}
        
        {showAllGeneral && generalMessages.length > 4 && (
          <Button
            onClick={() => setShowAllGeneral(false)}
            variant="ghost"
            fullWidth
            style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}
          >
            ▲ Masquer les anciens messages
          </Button>
        )}
        
        {showReplyBox && (
          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
            <Textarea
              value={generalMessage}
              onChange={(e) => setGeneralMessage(e.target.value)}
              placeholder="Poser une question ou laisser un commentaire..."
            />
            <Button
              onClick={handleSendGeneral}
              disabled={!generalMessage.trim() || loading}
              fullWidth
              variant="primary"
            >
              {loading ? '⏳ Envoi en cours...' : '📤 Envoyer le message'}
            </Button>
          </div>
        )}
      </Accordion>
    </>
  );
};

/**
 * ReportsSection - Section pour afficher les signalements reçus
 * Masquée par défaut, visible seulement si signalements marqués visible_to_farmer
 */
export const ReportsSection = ({ 
  reports = [], 
  loading = false 
}) => {
  // Filtrer uniquement les signalements visibles au créateur
  const visibleReports = reports.filter(r => r.visible_to_farmer === true);
  
  // Ne rien afficher si aucun signalement visible
  if (!visibleReports || visibleReports.length === 0) return null;
  
  return (
    <Accordion
      title="🚨 Signalements reçus"
      badge={
        <Badge variant="danger">
          {visibleReports.length} signalement{visibleReports.length > 1 ? 's' : ''}
        </Badge>
      }
      variant="danger"
      defaultOpen={true}
    >
      <InfoBox type="warning" title="Signalement de modération">
        <strong>L'équipe de modération a examiné des signalements concernant votre établissement.</strong>
        <br /><br />
        Prenez connaissance des informations ci-dessous. Si vous avez des questions ou souhaitez apporter 
        des clarifications, <strong>utilisez la section "Messages généraux" ci-dessus pour répondre à l'administrateur.</strong>
      </InfoBox>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
          <p>Chargement des signalements...</p>
        </div>
      ) : (
        <Stack spacing="sm">
          {visibleReports.map((report, idx) => (
            <Card 
              key={report.id || idx} 
              style={{ 
                borderLeft: '4px solid #ef4444',
                backgroundColor: '#fff'
              }}
            >
              <CardContent style={{ padding: '1rem' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'start', 
                  marginBottom: '0.75rem' 
                }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ 
                      fontWeight: '600', 
                      color: '#991b1b', 
                      margin: 0,
                      fontSize: '0.95rem'
                    }}>
                      Motif : {report.reason}
                    </p>
                  </div>
                  <StatusBadge status={report.admin_status} type="report" />
                </div>
                
                {report.details && (
                  <p style={{ 
                    fontSize: '0.85rem', 
                    color: '#7f1d1d', 
                    margin: '0.5rem 0',
                    lineHeight: '1.5'
                  }}>
                    {report.details}
                  </p>
                )}
                
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: '#6b7280', 
                  marginTop: '0.75rem', 
                  paddingTop: '0.75rem', 
                  borderTop: '1px solid #fecaca',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '1rem'
                }}>
                  <span>👤 Par : {report.reporter_address ? report.reporter_address.substring(0, 12) + '...' : 'Anonyme'}</span>
                  <span>📅 {new Date(report.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
                
                {report.admin_note && (
                  <InfoBox 
                    type="info" 
                    title="Note de l'administrateur"
                    style={{ marginTop: '0.75rem', marginBottom: 0 }}
                  >
                    {report.admin_note}
                  </InfoBox>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Accordion>
  );
};

/**
 * AdminChatSection - Section chat pour l'interface admin avec séparation vérification/général
 */
export const AdminChatSection = ({ 
  farm, 
  onSendMessage, 
  onSendGeneralMessage,
  onCloseConversation,
  loading = false 
}) => {
  const [verificationMessage, setVerificationMessage] = useState('');
  const [generalMessage, setGeneralMessage] = useState('');
  const [isVerificationExpanded, setIsVerificationExpanded] = useState(false);
  const [isGeneralExpanded, setIsGeneralExpanded] = useState(false);
  
  if (!farm) return null;
  
  const allMessages = farm.communication_history || [];
  const verificationMessages = allMessages.filter(msg => msg.type === 'verification' || !msg.type);
  const generalMessages = allMessages.filter(msg => msg.type === 'general');
  
  const isConversationClosed = farm.conversation_closed === true;
  
  // Détecter nouvelles réponses du créateur
  const lastVerifMsg = verificationMessages.slice(-1)[0];
  const hasNewVerifReply = lastVerifMsg && lastVerifMsg.author !== 'admin' && lastVerifMsg.author !== 'system';
  
  const lastGeneralMsg = generalMessages.slice(-1)[0];
  const hasNewGeneralReply = lastGeneralMsg && lastGeneralMsg.author !== 'admin' && lastGeneralMsg.author !== 'system';
  
  const handleSendVerification = () => {
    if (!verificationMessage.trim()) return;
    onSendMessage(verificationMessage.trim(), 'verification');
    setVerificationMessage('');
  };
  
  const handleSendGeneral = () => {
    if (!generalMessage.trim()) return;
    // Appeler la fonction dédiée aux messages généraux si fournie, sinon fallback
    if (onSendGeneralMessage) {
      onSendGeneralMessage(generalMessage.trim(), 'general');
    } else {
      onSendMessage(generalMessage.trim(), 'general');
    }
    setGeneralMessage('');
  };
  
  return (
    <div style={{ 
      marginTop: '1rem', 
      paddingTop: '1rem', 
      borderTop: '1px solid #e5e7eb' 
    }}>
      {/* SECTION VÉRIFICATION */}
      <div style={{ marginBottom: '1rem' }}>
        <button 
          onClick={() => setIsVerificationExpanded(!isVerificationExpanded)}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: hasNewVerifReply ? '#dbeafe' : '#f9fafb',
            border: hasNewVerifReply ? '2px solid #3b82f6' : '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: '600',
            color: hasNewVerifReply ? '#1e40af' : '#374151',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s'
          }}
        >
          <span style={{ fontSize: '1rem' }}>{isVerificationExpanded ? '▼' : '▶'}</span>
          <span style={{ flex: 1 }}>
            🔍 Vérification ({verificationMessages.length})
            {isConversationClosed && <span style={{ fontSize: '0.75rem', marginLeft: '0.5rem' }}>✓ Clôturée</span>}
          </span>
          {hasNewVerifReply && (
            <Badge variant="info">💬 Nouvelle réponse</Badge>
          )}
        </button>

        {isVerificationExpanded && (
          <div style={{ 
            marginTop: '0.75rem',
            padding: '1rem',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <MessageThread
              messages={verificationMessages}
              loading={loading}
              emptyMessage="Aucun message dans l'historique"
            />
            
            {!isConversationClosed && (
              <div style={{ 
                marginTop: '1rem', 
                paddingTop: '1rem', 
                borderTop: '1px solid #e5e7eb'
              }}>
                <Textarea 
                  value={verificationMessage}
                  onChange={(e) => setVerificationMessage(e.target.value)}
                  placeholder="Message de vérification à envoyer..."
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button 
                    onClick={handleSendVerification} 
                    disabled={!verificationMessage.trim() || loading}
                    variant="primary"
                    style={{ flex: 1 }}
                  >
                    {loading ? '⏳ Envoi...' : '📤 Envoyer'}
                  </Button>
                  <Button 
                    onClick={onCloseConversation} 
                    variant="outline" 
                    disabled={loading}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    Clôturer
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION GÉNÉRALE */}
      <div>
        <button 
          onClick={() => setIsGeneralExpanded(!isGeneralExpanded)}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: hasNewGeneralReply ? '#dbeafe' : '#f9fafb',
            border: hasNewGeneralReply ? '2px solid #3b82f6' : '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: '600',
            color: hasNewGeneralReply ? '#1e40af' : '#374151',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s'
          }}
        >
          <span style={{ fontSize: '1rem' }}>{isGeneralExpanded ? '▼' : '▶'}</span>
          <span style={{ flex: 1 }}>
            💬 Messages généraux ({generalMessages.length})
          </span>
          {hasNewGeneralReply && (
            <Badge variant="info">💬 Nouvelle réponse</Badge>
          )}
        </button>

        {isGeneralExpanded && (
          <div style={{ 
            marginTop: '0.75rem',
            padding: '1rem',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <MessageThread
              messages={generalMessages}
              loading={loading}
              emptyMessage="Aucun message général"
            />
            
            <div style={{ 
              marginTop: '1rem', 
              paddingTop: '1rem', 
              borderTop: '1px solid #e5e7eb'
            }}>
              <Textarea 
                value={generalMessage}
                onChange={(e) => setGeneralMessage(e.target.value)}
                placeholder="Message général à envoyer..."
              />
              <Button 
                onClick={handleSendGeneral} 
                disabled={!generalMessage.trim() || loading}
                variant="primary"
                fullWidth
              >
                {loading ? '⏳ Envoi...' : '📤 Envoyer'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * AdminReportMessaging - Section spéciale pour communiquer sur les signalements (onglet reported)
 */
export const AdminReportMessaging = ({
  farm,
  reports = [],
  onSendReportMessage,
  onToggleReportVisibility,
  loading = false
}) => {
  const [reportMessage, setReportMessage] = useState('');
  const [showMessageToFarmer, setShowMessageToFarmer] = useState(true); // TRUE par défaut pour afficher au créateur
  
  if (!farm) return null;
  
  const openReports = reports.filter(r => r.admin_status !== 'resolved');
  
  // Récupérer les messages de type 'report' ou 'general' de l'historique
  const allMessages = farm.communication_history || [];
  const reportMessages = allMessages.filter(msg => msg.type === 'report' || msg.type === 'general');
  
  const handleSendMessage = () => {
    if (!reportMessage.trim()) return;
    
    // Envoyer le message avec le flag de visibilité
    onSendReportMessage(reportMessage.trim(), showMessageToFarmer);
    setReportMessage('');
    // Garder showMessageToFarmer à true par défaut
  };
  
  return (
    <div style={{ 
      marginTop: '1rem', 
      padding: '1rem',
      backgroundColor: '#fef2f2',
      borderRadius: '8px',
      border: '1px solid #fecaca'
    }}>
      <h4 style={{ 
        fontSize: '0.9rem', 
        fontWeight: '600', 
        color: '#991b1b',
        marginBottom: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        🚨 Communication sur les signalements
      </h4>
      
      <InfoBox type="warning" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
        <strong>Important :</strong> Les messages marqués comme "visibles" apparaîtront dans la section "Messages généraux" 
        du créateur. Utilisez cette fonction pour informer le créateur des signalements.
      </InfoBox>
      
      {/* Afficher l'historique des messages */}
      {reportMessages.length > 0 && (
        <div style={{ 
          marginBottom: '1rem',
          padding: '0.75rem',
          backgroundColor: '#fff',
          borderRadius: '6px',
          border: '1px solid #e5e7eb',
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          <p style={{ fontSize: '0.8rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
            📜 Historique des échanges :
          </p>
          {reportMessages.slice(-5).map((msg, idx) => (
            <div key={idx} style={{
              padding: '0.5rem',
              marginBottom: '0.5rem',
              backgroundColor: msg.author === 'admin' ? '#dbeafe' : '#f3f4f6',
              borderRadius: '4px',
              fontSize: '0.85rem'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                {msg.author === 'admin' ? '👮 Admin' : '👤 Créateur'} · {new Date(msg.timestamp).toLocaleString('fr-FR')}
              </div>
              <div>{msg.message}</div>
            </div>
          ))}
        </div>
      )}
      
      <Textarea 
        value={reportMessage}
        onChange={(e) => setReportMessage(e.target.value)}
        placeholder="Message concernant les signalements (ex: 'Nous avons reçu des signalements concernant...')"
        style={{ marginBottom: '0.75rem' }}
      />
      
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '0.75rem',
        padding: '0.5rem',
        backgroundColor: showMessageToFarmer ? '#d1fae5' : '#fee2e2',
        borderRadius: '6px',
        border: `2px solid ${showMessageToFarmer ? '#10b981' : '#fecaca'}`
      }}>
        <input
          type="checkbox"
          checked={showMessageToFarmer}
          onChange={(e) => setShowMessageToFarmer(e.target.checked)}
          style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer', accentColor: '#10b981' }}
        />
        <label style={{ 
          fontSize: '0.85rem', 
          color: showMessageToFarmer ? '#065f46' : '#991b1b',
          flex: 1,
          cursor: 'pointer',
          fontWeight: '600'
        }}
        onClick={() => setShowMessageToFarmer(!showMessageToFarmer)}
        >
          {showMessageToFarmer ? '👁️ Message VISIBLE au créateur (recommandé)' : '🙈 Message MASQUÉ au créateur (interne uniquement)'}
        </label>
      </div>
      
      <Button 
        onClick={handleSendMessage} 
        disabled={!reportMessage.trim() || loading}
        variant={showMessageToFarmer ? "primary" : "secondary"}
        fullWidth
      >
        {loading ? '⏳ Envoi...' : showMessageToFarmer ? '📤 Envoyer au créateur' : '📝 Enregistrer en interne'}
      </Button>
      
      {openReports.length > 0 && (
        <div style={{ 
          marginTop: '1rem',
          fontSize: '0.75rem',
          color: '#6b7280'
        }}>
          💡 {openReports.length} signalement(s) ouvert(s) sur cette ferme
        </div>
      )}
    </div>
  );
};

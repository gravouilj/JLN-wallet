import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAtom, useSetAtom } from 'jotai';
import { walletConnectedAtom, notificationAtom } from '../../../atoms';
import { StatusBadge, Badge, Modal, Button, Textarea } from '../../UI';
import { ProfilService } from '../../../services/profilService';
import { useEcashWallet, useEcashToken } from '../../../hooks/useEcashWallet';
import { supabase } from '../../../services/supabaseClient';
import ClientTicketForm from '../../Client/ClientTicketForm';

/**
 * CreatorProfileModal - Popup détaillée du profil standardisée
 * Affiche toutes les informations complètes du profil
 */
const CreatorProfileModal = ({ profile, isOpen, onClose, profileTickers = {} }) => {
  const navigate = useNavigate();
  const { wallet } = useEcashWallet();
  const [walletConnected] = useAtom(walletConnectedAtom);
  const setNotification = useSetAtom(notificationAtom);
  const [expandedTokens, setExpandedTokens] = useState(new Set());
  const [showReportModal, setShowReportModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedContactToken, setSelectedContactToken] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  
  // Get visible tokens BEFORE early return
  const visibleTokens = profile?.tokens?.filter(token => token.isVisible) || [];
  
  // IMPORTANT: Pré-charger les balances de TOUS les tokens visibles au niveau supérieur
  // pour respecter les règles des hooks React (pas dans des boucles/callbacks)
  // On doit appeler useEcashToken pour chaque token de manière inconditionnelle
  const tokenBalance0 = useEcashToken(visibleTokens[0]?.tokenId || '');
  const tokenBalance1 = useEcashToken(visibleTokens[1]?.tokenId || '');
  const tokenBalance2 = useEcashToken(visibleTokens[2]?.tokenId || '');
  const tokenBalance3 = useEcashToken(visibleTokens[3]?.tokenId || '');
  const tokenBalance4 = useEcashToken(visibleTokens[4]?.tokenId || '');
  
  // Créer un objet des balances après avoir appelé tous les hooks
  const tokenBalances = {};
  if (visibleTokens[0]) tokenBalances[visibleTokens[0].tokenId] = tokenBalance0.tokenBalance;
  if (visibleTokens[1]) tokenBalances[visibleTokens[1].tokenId] = tokenBalance1.tokenBalance;
  if (visibleTokens[2]) tokenBalances[visibleTokens[2].tokenId] = tokenBalance2.tokenBalance;
  if (visibleTokens[3]) tokenBalances[visibleTokens[3].tokenId] = tokenBalance3.tokenBalance;
  if (visibleTokens[4]) tokenBalances[visibleTokens[4].tokenId] = tokenBalance4.tokenBalance;
  
  if (!isOpen || !profile) return null;
  
  // Extract certifications and contact info
  const certifications = profile.certifications || {};
  const socials = profile.socials || {};
  
  // Privacy flags from certifications JSONB
  const hideEmail = certifications.hide_email || false;
  const hidePhone = certifications.hide_phone || false;
  const hideLegalRep = certifications.hide_legal_rep || false;
  const hideCompanyID = certifications.hide_company_id || certifications.hide_siret || false;
  
  // Get country flag emoji
  const getCountryFlag = (country) => {
    const flags = {
      'France': '🇫🇷',
      'Belgique': '🇧🇪',
      'Suisse': '🇨🇭',
      'Canada': '🇨🇦',
      'Luxembourg': '🇱🇺'
    };
    return flags[country] || '🌍';
  };
  
  // Get French department code from zip code
  const getFrenchDepartmentCode = (postalCode) => {
    if (!postalCode) return null;
    const zipMatch = postalCode.match(/\b(\d{5})\b/);
    if (zipMatch) {
      const fullZip = zipMatch[1];
      return { full: fullZip, dept: fullZip.substring(0, 2) };
    }
    return null;
  };
  
  const toggleTokenExpand = (tokenId) => {
    const newExpanded = new Set(expandedTokens);
    if (newExpanded.has(tokenId)) {
      newExpanded.delete(tokenId);
    } else {
      newExpanded.add(tokenId);
    }
    setExpandedTokens(newExpanded);
  };
  
  const handleReport = async () => {
    if (!reportReason.trim()) {
      alert('Veuillez indiquer la raison du signalement');
      return;
    }
    
    setIsReporting(true);
    try {
      const address = wallet?.address || '';
      await ProfilService.reportProfil(profile.id, address, reportReason);
      alert('🚨 Signalement enregistré. L\'équipe va examiner votre demande.');
      setShowReportModal(false);
      setReportReason('');
      onClose();
    } catch (err) {
      console.error('Erreur signalement:', err);
      if (err.code === '23505') {
        alert('Vous avez déjà signalé ce profil');
      } else {
        alert('Erreur lors du signalement');
      }
    } finally {
      setIsReporting(false);
    }
  };
  
  const zipInfo = profile.location_country === 'France' ? getFrenchDepartmentCode(profile.postal_code) : null;
  
  return (
    <>
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          overflowY: 'auto'
        }}
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: 'var(--bg-primary, #fff)',
            borderRadius: '16px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: 'var(--bg-secondary)',
              cursor: 'pointer',
              fontSize: '1.2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10
            }}
          >
            ✕
          </button>
          
          <div style={{ padding: '32px' }}>
            {/* Header: Name + Badge */}
            <div style={{ marginBottom: '24px', paddingRight: '40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <h2 style={{ 
                  fontSize: '1.75rem', 
                  fontWeight: '700', 
                  color: 'var(--text-primary)',
                  margin: 0
                }}>
                  {profile.name}
                </h2>
                {profile.verification_status === 'verified' && (
                  <StatusBadge status="verified" type="verification" />
                )}
              </div>
            </div>
            
            {/* Bouton de contact principal si au moins un token est lié ET possédé */}
            {walletConnected && (() => {
              // Trouver le premier token lié que le client possède
              // Utiliser les balances pré-chargées au lieu d'appeler useEcashToken ici
              const linkedTokensWithBalance = visibleTokens.filter(token => {
                if (token.isLinked !== true) return false;
                // Utiliser le solde pré-chargé
                const balance = tokenBalances[token.tokenId];
                return Number(balance) > 0;
              });
              
              if (linkedTokensWithBalance.length === 0) return null;
              
              return (
                <div style={{ marginBottom: '24px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedContactToken(linkedTokensWithBalance[0]);
                      setShowContactModal(true);
                    }}
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      backgroundColor: '#8b5cf6',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: '600',
                      fontSize: '1rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                    onMouseLeave={(e) => e.target.style.opacity = '1'}
                  >
                    💬 Contacter le créateur
                  </button>
                  <p style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    marginTop: '8px',
                    textAlign: 'center',
                    marginBottom: 0
                  }}>
                    Envoyez un message directement au créateur
                  </p>
                </div>
              );
            })()}
            
            {/* Location Tags */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.5rem' }}>
                {getCountryFlag(profile.location_country || profile.country)}
              </span>
              {(profile.location_region || profile.region) && (
                <Badge variant="neutral">
                   {profile.location_region || profile.region}
                </Badge>
              )}
              {profile.location_country === 'France' ? (
                zipInfo && (
                  <Badge variant="info">
                    {zipInfo.dept}
                  </Badge>
                )
              ) : (
                (profile.location_department || profile.department) && (
                  <Badge variant="info">
                    🏛️ {profile.location_department || profile.department}
                  </Badge>
                )
              )}
              {(profile.city || profile.location_region) && (
                <Badge variant="primary">
                   {profile.city || profile.location_region}
                </Badge>
              )}
            </div>
                        {/* Adresse complète avec lien Google Maps */}
            {(profile.street_address || profile.postal_code || profile.city) && (
              <div style={{ marginBottom: '20px' }}>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${profile.street_address || ''} ${profile.postal_code || ''} ${profile.city || ''} ${profile.location_country || ''}`.trim()
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'none' }}
                >
                  <Badge variant="neutral">
                    📍 {[profile.street_address, profile.postal_code, profile.city].filter(Boolean).join(' - ')}
                  </Badge>
                </a>
              </div>
            )}
                        {/* Description */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>
                📝 Description
              </h3>
              <p style={{
                fontSize: '0.9rem',
                color: 'var(--text-secondary)',
                lineHeight: '1.6',
                margin: 0
              }}>
                {profile.description}
              </p>
            </div>
            
            {/* Tags Section */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>
                🗂️ Produits
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {profile.products?.map((product, idx) => (
                  <Badge key={`p-${idx}`} variant="success">
                    {product}
                  </Badge>
                ))}
              </div>
              <br />
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>
                🛎️  Services
              </h3>
               <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {profile.services?.map((service, idx) => (
                  <Badge key={`s-${idx}`} variant="info">
                    {service}
                  </Badge>
                ))}
              </div>
            </div>
            
            {/* Certifications & Labels - Grille avec condition URL obligatoire */}
            {(() => {
              const certsList = [];
              if (certifications.national && certifications.national_link) {
                certsList.push({ name: certifications.national, link: certifications.national_link, });
              }
              if (certifications.international && certifications.international_link) {
                certsList.push({ name: certifications.international, link: certifications.international_link, });
              }
              if (certifications.certification_1 && certifications.certification_1_link) {
                certsList.push({ name: certifications.certification_1, link: certifications.certification_1_link, });
              }
              if (certifications.certification_2 && certifications.certification_2_link) {
                certsList.push({ name: certifications.certification_2, link: certifications.certification_2_link, });
              }
              
              return certsList.length > 0 ? (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
                    🏅 Certifications & Labels
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                    {certsList.map((cert, idx) => (
                      <a 
                        key={idx}
                        href={cert.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: 'none' }}
                      >
                        <div style={{
                          padding: '12px',
                          backgroundColor: 'var(--bg-secondary)',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}>
                          <span style={{ fontSize: '1.2rem' }}>{cert.icon}</span>
                          <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                            {cert.name}
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}
            
            {/* Tokens Section */}
            {visibleTokens.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
                  🪙  {visibleTokens.length === 1 ? 'Jeton disponible' : `${visibleTokens.length} Jetons disponibles`}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {visibleTokens.map((token) => {
                    const isExpanded = expandedTokens.has(token.tokenId);
                    const isTokenLinked = token.isLinked === true;
                    return (
                      <div 
                        key={token.tokenId}
                        style={{
                          padding: '12px',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          borderRadius: '10px',
                          color: 'white',
                          cursor: (token.purpose || token.counterpart) ? 'pointer' : 'default'
                        }}
                        onClick={() => (token.purpose || token.counterpart) && toggleTokenExpand(token.tokenId)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '4px' }}>
                              {profileTickers[token.tokenId] || token.ticker || 'Jeton'}
                            </div>
                            {token.name && token.name !== profile.name && (
                              <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                                {token.name}
                              </div>
                            )}
                          </div>
                          {(token.purpose || token.counterpart) && (
                            <div style={{ fontSize: '0.875rem' }}>
                              {isExpanded ? '▲' : '▼'}
                            </div>
                          )}
                        </div>
                        {isExpanded && (
                          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                            {token.purpose && (
                              <div style={{ marginBottom: '8px' }}>
                                <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '4px' }}>
                                  🎯 Objectif :
                                </div>
                                <div style={{ fontSize: '0.85rem' }}>
                                  {token.purpose}
                                </div>
                              </div>
                            )}
                            {token.counterpart && (
                              <div style={{ marginBottom: '12px' }}>
                                <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '4px' }}>
                                  🎁 Contrepartie :
                                </div>
                                <div style={{ fontSize: '0.85rem' }}>
                                  {token.counterpart}
                                </div>
                              </div>
                            )}
                            
                            {/* Bouton contact si token isLinked ET client possède le token */}
                            {walletConnected && isTokenLinked && tokenBalances[token.tokenId] && Number(tokenBalances[token.tokenId]) > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedContactToken(token);
                                  setShowContactModal(true);
                                }}
                                style={{
                                  padding: '8px 16px',
                                  backgroundColor: 'rgba(255,255,255,0.2)',
                                  color: 'white',
                                  border: '1px solid rgba(255,255,255,0.3)',
                                  borderRadius: '6px',
                                  fontWeight: '600',
                                  fontSize: '0.875rem',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  width: '100%',
                                  marginTop: '8px'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.3)'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'}
                              >
                                💬 Contacter pour ce jeton
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Contact Section */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
                📞 Contact
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Contacts en badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {profile.email && !hideEmail && (
                    <a href={`mailto:${profile.email}`} style={{ textDecoration: 'none' }}>
                      <Badge variant="info">📧 {profile.email}</Badge>
                    </a>
                  )}
                  {profile.phone && !hidePhone && (
                    <a href={`tel:${profile.phone}`} style={{ textDecoration: 'none' }}>
                      <Badge variant="success">☎️ {profile.phone}</Badge>
                    </a>
                  )}
                  {profile.website && (
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                      <Badge variant="primary">🌐 Site web</Badge>
                    </a>
                  )}
                </div>
              </div>
            </div>
            
            {/* Social Networks */}
            {Object.entries(socials).some(([key, value]) => value) && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
                  📱 Réseaux sociaux
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {socials.facebook && (
                        <a href={socials.facebook} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                          <Badge variant="info">Facebook</Badge>
                        </a>
                      )}
                      {socials.instagram && (
                        <a href={socials.instagram.startsWith('http') ? socials.instagram : `https://instagram.com/${socials.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                          <Badge variant="danger">Instagram</Badge>
                        </a>
                      )}
                      {socials.tiktok && (
                        <a href={socials.tiktok.startsWith('http') ? socials.tiktok : `https://tiktok.com/@${socials.tiktok.replace('@', '')}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                          <Badge variant="neutral">TikTok</Badge>
                        </a>
                      )}
                      {socials.youtube && (
                        <a href={socials.youtube} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                          <Badge variant="danger">YouTube</Badge>
                        </a>
                      )}
                      {socials.whatsapp && (
                        <a href={`https://wa.me/${socials.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                          <Badge variant="success">WhatsApp</Badge>
                        </a>
                      )}
                      {socials.telegram && (
                        <a href={socials.telegram.startsWith('http') ? socials.telegram : `https://t.me/${socials.telegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                          <Badge variant="info">Telegram</Badge>
                        </a>
                      )}
                      {socials.other_website && (
                        <a href={socials.other_website} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                          <Badge variant="neutral">🔗 Autre site</Badge>
                        </a>
                      )}
                    </div>
                  </div>
                )}
            
            {/* About Section */}
            {((!hideLegalRep && certifications.legal_representative) || (!hideCompanyID && certifications.siret)) && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
                  ℹ️ À propos
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {!hideLegalRep && certifications.legal_representative && (
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      👤 Représentant légal : <strong>{certifications.legal_representative}</strong>
                    </div>
                  )}
                  {!hideCompanyID && certifications.siret && (
                    <div>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        🏢 Identifiant entreprise (SIRET) : <strong>{certifications.siret}</strong>
                      </span>
                      {certifications.siret_link && (
                        <a 
                          href={certifications.siret_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ 
                            marginLeft: '8px', 
                            fontSize: '0.875rem', 
                            color: 'var(--primary-color)', 
                            textDecoration: 'none' 
                          }}
                        >
                          🔗 Vérifier
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Report Button */}
            {walletConnected && (
              <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                <button
                  onClick={() => setShowReportModal(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0
                  }}
                >
                  🚨 Signaler ce profil
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Report Modal */}
      {showReportModal && (
        <Modal isOpen={showReportModal} onClose={() => setShowReportModal(false)}>
          <Modal.Header>
            🚨 Signaler "{profile.name}"
          </Modal.Header>
          <Modal.Body>
            <p style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Votre signalement sera examiné par l'équipe de modération. Merci de préciser la raison.
            </p>
            <Textarea
              label="Raison du signalement"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Ex: Informations trompeuses, arnaque suspectée, contenu inapproprié..."
              rows={4}
              disabled={isReporting}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="outline"
              onClick={() => setShowReportModal(false)}
              disabled={isReporting}
            >
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={handleReport}
              disabled={isReporting || !reportReason.trim()}
            >
              {isReporting ? '⏳ Envoi...' : '🚨 Signaler'}
            </Button>
          </Modal.Footer>
        </Modal>
      )}
      
      {/* Modal de contact créateur - z-index supérieur au modal parent */}
      {showContactModal && selectedContactToken && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            overflowY: 'auto'
          }}
          onClick={() => {
            setShowContactModal(false);
            setSelectedContactToken(null);
          }}
        >
          <div 
            style={{
              backgroundColor: 'var(--bg-primary, #fff)',
              borderRadius: '16px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', fontSize: '1.25rem', fontWeight: 'bold' }}>
              💬 Contacter {profile.name}
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <strong>Jeton concerné :</strong> {profileTickers[selectedContactToken.tokenId] || selectedContactToken.ticker || 'Jeton'}
                </div>
              </div>
              <ClientTicketForm
                type="creator"
                tokenId={selectedContactToken.tokenId}
                profilId={profile.id}
                walletAddress={wallet?.getAddress()}
                setNotification={setNotification}
                onSubmit={() => {
                  setShowContactModal(false);
                  setSelectedContactToken(null);
                }}
                onCancel={() => {
                  setShowContactModal(false);
                  setSelectedContactToken(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CreatorProfileModal;

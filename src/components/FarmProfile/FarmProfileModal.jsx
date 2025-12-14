import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAtom } from 'jotai';
import { walletConnectedAtom } from '../../atoms';
import { StatusBadge, Badge, Modal, Button, Textarea } from '../UI';
import { FarmService } from '../../services/farmService';
import { useEcashWallet } from '../../hooks/useEcashWallet';

/**
 * FarmProfileModal - Popup détaillée du profil standardisée
 * Affiche toutes les informations complètes de la ferme
 */
const FarmProfileModal = ({ farm, isOpen, onClose, farmTickers = {} }) => {
  const navigate = useNavigate();
  const { wallet } = useEcashWallet();
  const [walletConnected] = useAtom(walletConnectedAtom);
  const [expandedTokens, setExpandedTokens] = useState(new Set());
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  
  if (!isOpen || !farm) return null;
  
  // Get visible tokens
  const visibleTokens = farm.tokens?.filter(token => token.isVisible) || [];
  
  // Extract certifications and contact info
  const certifications = farm.certifications || {};
  const socials = farm.socials || {};
  
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
      await FarmService.reportFarm(farm.id, address, reportReason);
      alert('🚨 Signalement enregistré. L\'équipe va examiner votre demande.');
      setShowReportModal(false);
      setReportReason('');
      onClose();
    } catch (err) {
      console.error('Erreur signalement:', err);
      if (err.code === '23505') {
        alert('Vous avez déjà signalé cette ferme');
      } else {
        alert('Erreur lors du signalement');
      }
    } finally {
      setIsReporting(false);
    }
  };
  
  const zipInfo = farm.location_country === 'France' ? getFrenchDepartmentCode(farm.postal_code) : null;
  
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
          zIndex: 1000,
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
                  {farm.name}
                </h2>
                {farm.verification_status === 'verified' && (
                  <StatusBadge status="verified" type="verification" />
                )}
              </div>
            </div>
            
            {/* Location Tags */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.5rem' }}>
                {getCountryFlag(farm.location_country || farm.country)}
              </span>
              {(farm.location_region || farm.region) && (
                <Badge variant="neutral">
                   {farm.location_region || farm.region}
                </Badge>
              )}
              {farm.location_country === 'France' ? (
                zipInfo && (
                  <Badge variant="info">
                    {zipInfo.dept}
                  </Badge>
                )
              ) : (
                (farm.location_department || farm.department) && (
                  <Badge variant="info">
                    🏛️ {farm.location_department || farm.department}
                  </Badge>
                )
              )}
              {(farm.city || farm.location_region) && (
                <Badge variant="primary">
                   {farm.city || farm.location_region}
                </Badge>
              )}
            </div>
                        {/* Adresse complète avec lien Google Maps */}
            {(farm.street_address || farm.postal_code || farm.city) && (
              <div style={{ marginBottom: '20px' }}>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${farm.street_address || ''} ${farm.postal_code || ''} ${farm.city || ''} ${farm.location_country || ''}`.trim()
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'none' }}
                >
                  <Badge variant="neutral">
                    📍 {[farm.street_address, farm.postal_code, farm.city].filter(Boolean).join(' - ')}
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
                {farm.description}
              </p>
            </div>
            
            {/* Tags Section */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>
                🗂️ Produits
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {farm.products?.map((product, idx) => (
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
                {farm.services?.map((service, idx) => (
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
                              {farmTickers[token.tokenId] || token.ticker || 'Jeton'}
                            </div>
                            {token.name && token.name !== farm.name && (
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
                              <div>
                                <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '4px' }}>
                                  🎁 Contrepartie :
                                </div>
                                <div style={{ fontSize: '0.85rem' }}>
                                  {token.counterpart}
                                </div>
                              </div>
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
                  {farm.email && !hideEmail && (
                    <a href={`mailto:${farm.email}`} style={{ textDecoration: 'none' }}>
                      <Badge variant="info">📧 {farm.email}</Badge>
                    </a>
                  )}
                  {farm.phone && !hidePhone && (
                    <a href={`tel:${farm.phone}`} style={{ textDecoration: 'none' }}>
                      <Badge variant="success">☎️ {farm.phone}</Badge>
                    </a>
                  )}
                  {farm.website && (
                    <a href={farm.website} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
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
            🚨 Signaler "{farm.name}"
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
    </>
  );
};

export default FarmProfileModal;

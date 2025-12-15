import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSetAtom } from 'jotai';
import { notificationAtom } from '../atoms';
import { useEcashWallet } from '../hooks/useEcashWallet';
import MobileLayout from '../components/Layout/MobileLayout';
import { Card, CardContent, Button, PageLayout, Stack, PageHeader } from '../components/UI';

/**
 * CompleteTokenImportPage - Page pour compléter l'import d'un token existant
 * Les infos blockchain sont pré-remplies et non modifiables
 * L'utilisateur doit OBLIGATOIREMENT renseigner l'objectif du token
 */
const CompleteTokenImportPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { wallet, address } = useEcashWallet();
  const setNotification = useSetAtom(notificationAtom);

  // Récupérer les données du token depuis la navigation
  const tokenData = location.state?.tokenData;

  const [purpose, setPurpose] = useState('');
  const [counterpart, setCounterpart] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Section créateur (optionnel mais recommandé)
  const [creatorInfo, setCreatorInfo] = useState({
    profileName: '',
    description: '',
    country: 'France',
    region: '',
    department: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    otherWebsite: '',
    facebook: '',
    instagram: '',
    tiktok: '',
    youtube: '',
    whatsapp: '',
    telegram: '',
    products: '',
    services: '',
    legalRepresentative: '',
    companyid: '',
    governmentidverificationweblink: '',
    nationalcertification: '',
    nationalcertificationweblink: '',
    internationalcertification: '',
    internationalcertificationweblink: ''
  });

  useEffect(() => {
    // Rediriger si pas de données de token
    if (!tokenData) {
      setNotification({
        type: 'error',
        message: '❌ Aucune donnée de token. Veuillez réessayer l\'import.'
      });
      navigate('/manage-token');
    }
  }, [tokenData, navigate, setNotification]);

  const handleSubmit = async () => {
    if (!purpose.trim()) {
      setNotification({
        type: 'error',
        message: '⚠️ L\'objectif du token est obligatoire'
      });
      return;
    }

    if (!counterpart.trim()) {
      setNotification({
        type: 'error',
        message: '⚠️ La contrepartie du token est obligatoire'
      });
      return;
    }

    if (!wallet || !address) {
      setNotification({
        type: 'error',
        message: '⚠️ Veuillez connecter votre wallet'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { profilService } = await import('../services/profilService');
      
      // 🔒 NOUVEAU: Vérifier la disponibilité du token avant import
      console.log('🔍 Vérification disponibilité token...');
      const availability = await profilService.checkTokenAvailability(tokenData.tokenId, address);
      
      if (!availability.isAvailable) {
        setNotification({
          type: 'error',
          message: `⛔ Ce jeton est déjà géré par la profile "${availability.existingProfileName}". Vous ne pouvez pas l'importer.`
        });
        setIsSubmitting(false);
        return;
      }
      
      if (availability.isReimport) {
        console.log('ℹ️ Ré-import détecté (token déjà dans votre profile)');
      }
      
      // Vérifier si l'utilisateur a déjà une profile 
      const existingProfile = await profilService.getMyProfile(address);
      
      const newTokenData = {
        tokenId: tokenData.tokenId,
        ticker: tokenData.ticker,
        name: tokenData.name,
        decimals: tokenData.decimals || 0,
        image: tokenData.image || '',
        purpose: purpose.trim(),
        counterpart: counterpart.trim(),
        purposeUpdatedAt: new Date().toISOString(),
        counterpartUpdatedAt: new Date().toISOString()
      };

      if (existingProfile) {
        // Ajouter le token à la profile existante
        const existingTokens = Array.isArray(existingProfile.tokens) ? existingProfile.tokens : [];
        
        // Vérifier si le token n'est pas déjà présent
        const tokenExists = existingTokens.some(t => t.tokenId === tokenData.tokenId);
        if (tokenExists) {
          setNotification({
            type: 'warning',
            message: '⚠️ Ce token est déjà importé dans votre profile'
          });
          navigate('/manage-token');
          return;
        }

        // Mettre à jour la profile avec le nouveau token
        const updatedProfile = {
          ...existingProfile,
          tokens: [...existingTokens, newTokenData]
        };

        await profilService.saveProfile(updatedProfile, address);

        setNotification({
          type: 'success',
          message: `✅ Token "${tokenData.name}" ajouté à votre profile !`
        });
      } else {
        // Créer une nouvelle profile minimale
        const profileData = {
          name: creatorInfo.profileName || tokenData.name || 'Ma Profile',
          description: creatorInfo.description || '',
          tokens: [newTokenData],
          verification_status: 'none',
          verified: false,
          products: creatorInfo.products ? creatorInfo.products.split(',').map(p => p.trim()).filter(Boolean) : [],
          services: creatorInfo.services ? creatorInfo.services.split(',').map(s => s.trim()).filter(Boolean) : [],
          location_country: creatorInfo.country || '',
          location_region: creatorInfo.region || '',
          location_department: creatorInfo.department || '',
          address: creatorInfo.address || '',
          phone: creatorInfo.phone || '',
          email: creatorInfo.email || '',
          website: creatorInfo.website || '',
          
          // Réseaux sociaux (JSONB)
          socials: {
            facebook: creatorInfo.facebook || null,
            instagram: creatorInfo.instagram || null,
            tiktok: creatorInfo.tiktok || null,
            youtube: creatorInfo.youtube || null,
            whatsapp: creatorInfo.whatsapp || null,
            telegram: creatorInfo.telegram || null,
            other_website: creatorInfo.otherWebsite || null
          },
          
          // Certifications (JSONB)
          certifications: {
            siret: creatorInfo.companyid || null,
            siret_link: creatorInfo.governmentidverificationweblink || null,
            legal_representative: creatorInfo.legalRepresentative || null,
            national: creatorInfo.nationalcertification || null,
            national_link: creatorInfo.nationalcertificationweblink || null,
            international: creatorInfo.internationalcertification || null,
            international_link: creatorInfo.internationalcertificationweblink || null
          }
        };

        await profilService.saveProfile(profileData, address);

        setNotification({
          type: 'success',
          message: `✅ Profile créée avec le token "${tokenData.name}" !`
        });
      }

      // Rediriger vers ManageTokenPage
      navigate('/manage-token');
      
      // Recharger la page pour afficher le nouveau token
      setTimeout(() => {
        window.location.reload();
      }, 100);

    } catch (err) {
      console.error('❌ Erreur import token:', err);
      setNotification({
        type: 'error',
        message: `❌ Erreur lors de l'import: ${err.message}`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!tokenData) {
    return (
      <MobileLayout title="Import Token">
        <PageLayout hasBottomNav className="max-w-2xl">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <p className="text-gray-600 dark:text-gray-400">
                Chargement...
              </p>
            </CardContent>
          </Card>
        </PageLayout>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Compléter l'Import">
      <PageLayout hasBottomNav className="max-w-2xl">
        <div style={{ padding: '20px' }}>
          <Stack spacing="md">
          <PageHeader 
            icon="📥"
            title="Compléter l'Import du Jeton"
            subtitle="Renseignez l'objectif de votre jeton"
          />

          {/* Informations du token (non modifiables) */}
          <Card>
            <CardContent style={{ padding: '24px' }}>
              <h3 style={{ 
                fontSize: '1.2rem',
                fontWeight: 'bold',
                color: 'var(--text-primary, #000)',
                marginBottom: '20px'
              }}>
                📋 Informations du Jeton (Blockchain)
              </h3>
              
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' }}>
                <img
                  src={tokenData.image || 'https://placehold.co/64x64?text=Token'}
                  alt={tokenData.name}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '8px',
                    objectFit: 'cover',
                    border: '2px solid var(--border-color, #e5e5e5)'
                  }}
                  onError={(e) => {
                    e.target.src = 'https://placehold.co/64x64?text=Token';
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '1.25rem',
                    fontWeight: 'bold',
                    color: 'var(--text-primary, #000)',
                    marginBottom: '4px'
                  }}>
                    {tokenData.name}
                  </div>
                  <div style={{ 
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: 'var(--text-secondary, #666)',
                    textTransform: 'uppercase'
                  }}>
                    {tokenData.ticker}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.875rem' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  padding: '12px 0',
                  borderBottom: '1px solid var(--border-color, #e5e5e5)'
                }}>
                  <span style={{ color: 'var(--text-secondary, #666)', fontWeight: '500' }}>Token ID:</span>
                  <span style={{ 
                    fontFamily: 'monospace',
                    color: 'var(--text-primary, #000)',
                    fontSize: '0.75rem'
                  }}>
                    {tokenData.tokenId.slice(0, 10)}...{tokenData.tokenId.slice(-10)}
                  </span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  padding: '12px 0',
                  borderBottom: '1px solid var(--border-color, #e5e5e5)'
                }}>
                  <span style={{ color: 'var(--text-secondary, #666)', fontWeight: '500' }}>Date de création:</span>
                  <span style={{ fontWeight: '600', color: 'var(--text-primary, #000)' }}>
                    {tokenData.timeFirstSeen ? new Date(tokenData.timeFirstSeen * 1000).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                  </span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  padding: '12px 0',
                  borderBottom: '1px solid var(--border-color, #e5e5e5)'
                }}>
                  <span style={{ color: 'var(--text-secondary, #666)', fontWeight: '500' }}>URL:</span>
                  <span style={{ 
                    fontFamily: 'monospace',
                    color: 'var(--text-primary, #000)',
                    fontSize: '0.75rem',
                    maxWidth: '200px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {tokenData.url || tokenData.image || 'Non spécifié'}
                  </span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  padding: '12px 0',
                  borderBottom: '1px solid var(--border-color, #e5e5e5)'
                }}>
                  <span style={{ color: 'var(--text-secondary, #666)', fontWeight: '500' }}>Offre Genèse:</span>
                  <span style={{ fontWeight: '600', color: 'var(--text-primary, #000)' }}>
                    {tokenData.genesisSupply || '0'} {tokenData.ticker}
                  </span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  padding: '12px 0',
                  borderBottom: '1px solid var(--border-color, #e5e5e5)'
                }}>
                  <span style={{ color: 'var(--text-secondary, #666)', fontWeight: '500' }}>En circulation:</span>
                  <span style={{ fontWeight: '600', color: 'var(--text-primary, #000)' }}>
                    {tokenData.supply || '0'} {tokenData.ticker}
                  </span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  padding: '12px 0',
                  borderBottom: '1px solid var(--border-color, #e5e5e5)'
                }}>
                  <span style={{ color: 'var(--text-secondary, #666)', fontWeight: '500' }}>Décimales:</span>
                  <span style={{ fontWeight: '600', color: 'var(--text-primary, #000)' }}>
                    {tokenData.decimals || 0}
                  </span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  padding: '12px 0'
                }}>
                  <span style={{ color: 'var(--text-secondary, #666)', fontWeight: '500' }}>Type:</span>
                  <span style={{ fontWeight: '600', color: '#10b981' }}>
                    ✓ Offre Variable (MintBaton détecté)
                  </span>
                </div>
              </div>

              <Card style={{ marginTop: '16px' }}>
                <CardContent style={{ 
                  padding: '16px',
                  backgroundColor: 'var(--bg-info, #e0f2fe)',
                  borderRadius: '8px'
                }}>
                  <p style={{ 
                    fontSize: '0.875rem',
                    color: 'var(--text-primary, #000)',
                    margin: 0
                  }}>
                    ℹ️ <strong>Ces informations proviennent de la blockchain et ne peuvent pas être modifiées.</strong>
                  </p>
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          {/* Section: Objectif et Contrepartie du Jeton (OBLIGATOIRE) */}
          <Card>
            <CardContent style={{ padding: '24px' }}>
              <h3 style={{ 
                fontSize: '1.2rem',
                fontWeight: 'bold',
                color: 'var(--text-primary, #000)',
                marginBottom: '12px'
              }}>
                🎯 Objectif et Contrepartie du Jeton <span style={{ color: '#ef4444' }}>*</span>
              </h3>
              
              <Card style={{ marginBottom: '20px' }}>
                <CardContent style={{ 
                  padding: '16px',
                  backgroundColor: 'var(--bg-warning, #fef3c7)',
                  borderRadius: '8px'
                }}>
                  <p style={{ 
                    fontSize: '0.875rem',
                    color: 'var(--text-primary, #000)',
                    margin: 0,
                    lineHeight: '1.6'
                  }}>
                    ⚠️ <strong>Obligatoire:</strong> L'objectif ET la contrepartie du jeton sont requis pour compléter l'import.
                  </p>
                </CardContent>
              </Card>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary, #000)', marginBottom: '6px' }}>
                    🎯 Objectif du Jeton <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="Ex: Jeton de fidélité pour récompenser les clients réguliers de la ferme"
                    rows="3"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid var(--border-color, #e5e5e5)',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary, #000)', marginBottom: '6px' }}>
                    🤝 Contrepartie du Jeton <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    value={counterpart}
                    onChange={(e) => setCounterpart(e.target.value)}
                    placeholder="Ex: 1 jeton = 1€ de réduction sur tout achat, ou 10 jetons = 1 panier gratuit"
                    rows="3"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid var(--border-color, #e5e5e5)',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section: À propos du créateur (Optionnel) */}
          <Card>
            <CardContent style={{ padding: '24px' }}>
              <h3 style={{ 
                fontSize: '1.2rem',
                fontWeight: 'bold',
                color: 'var(--text-primary, #000)',
                marginBottom: '12px'
              }}>
                👤 À propos du Créateur <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary, #666)', fontWeight: 'normal' }}>(Optionnel)</span>
              </h3>
              
              <Card style={{ marginBottom: '20px' }}>
                <CardContent style={{ 
                  padding: '16px',
                  backgroundColor: 'var(--bg-warning, #fef3c7)',
                  borderRadius: '8px'
                }}>
                  <p style={{ 
                    fontSize: '0.875rem',
                    color: 'var(--text-primary, #000)',
                    margin: 0,
                    lineHeight: '1.6'
                  }}>
                    ⚠️ <strong>Important:</strong> Si vous ne complétez pas cette partie, votre jeton n'apparaîtra pas dans l'annuaire public.
                  </p>
                </CardContent>
              </Card>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Nom de la ferme */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary, #000)', marginBottom: '6px' }}>
                    🏡 Nom de la ferme
                  </label>
                  <input
                    type="text"
                    value={creatorInfo.profileName}
                    onChange={(e) => setCreatorInfo({...creatorInfo, profileName: e.target.value})}
                    placeholder="Ex: Ferme du Soleil Levant"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--border-color, #e5e5e5)',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Description */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary, #000)', marginBottom: '6px' }}>
                    📝 Description
                  </label>
                  <textarea
                    value={creatorInfo.description}
                    onChange={(e) => setCreatorInfo({...creatorInfo, description: e.target.value})}
                    placeholder="Présentez votre activité..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--border-color, #e5e5e5)',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      minHeight: '80px',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Pays et Région */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary, #000)', marginBottom: '6px' }}>
                      🌍 Pays
                    </label>
                    <input
                      type="text"
                      value={creatorInfo.country}
                      onChange={(e) => setCreatorInfo({...creatorInfo, country: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid var(--border-color, #e5e5e5)',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary, #000)', marginBottom: '6px' }}>
                      📍 Région
                    </label>
                    <input
                      type="text"
                      value={creatorInfo.region}
                      onChange={(e) => setCreatorInfo({...creatorInfo, region: e.target.value})}
                      placeholder="Ex: Bretagne"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid var(--border-color, #e5e5e5)',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Email et Téléphone */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary, #000)', marginBottom: '6px' }}>
                      📧 Email
                    </label>
                    <input
                      type="email"
                      value={creatorInfo.email}
                      onChange={(e) => setCreatorInfo({...creatorInfo, email: e.target.value})}
                      placeholder="contact@ferme.com"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid var(--border-color, #e5e5e5)',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary, #000)', marginBottom: '6px' }}>
                      📱 Téléphone
                    </label>
                    <input
                      type="tel"
                      value={creatorInfo.phone}
                      onChange={(e) => setCreatorInfo({...creatorInfo, phone: e.target.value})}
                      placeholder="+33 6 12 34 56 78"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid var(--border-color, #e5e5e5)',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Site web et Facebook */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary, #000)', marginBottom: '6px' }}>
                      🌐 Site web
                    </label>
                    <input
                      type="url"
                      value={creatorInfo.website}
                      onChange={(e) => setCreatorInfo({...creatorInfo, website: e.target.value})}
                      placeholder="https://maferme.com"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid var(--border-color, #e5e5e5)',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary, #000)', marginBottom: '6px' }}>
                      👍 Facebook
                    </label>
                    <input
                      type="url"
                      value={creatorInfo.facebook}
                      onChange={(e) => setCreatorInfo({...creatorInfo, facebook: e.target.value})}
                      placeholder="https://facebook.com/..."
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid var(--border-color, #e5e5e5)',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Produits */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary, #000)', marginBottom: '6px' }}>
                    🥕 Produits proposés <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '400' }}>(Optionnel)</span>
                  </label>
                  <textarea
                    value={creatorInfo.products}
                    onChange={(e) => setCreatorInfo({...creatorInfo, products: e.target.value})}
                    placeholder="Ex: Légumes bio, Fruits de saison, Œufs..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--border-color, #e5e5e5)',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      minHeight: '60px',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Services */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary, #000)', marginBottom: '6px' }}>
                    🛠️ Services proposés <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '400' }}>(Optionnel)</span>
                  </label>
                  <textarea
                    value={creatorInfo.services}
                    onChange={(e) => setCreatorInfo({...creatorInfo, services: e.target.value})}
                    placeholder="Ex: Livraison à domicile, Ateliers pédagogiques..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--border-color, #e5e5e5)',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      minHeight: '60px',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* SIRET et Représentant légal */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary, #000)', marginBottom: '6px' }}>
                      🏢 N° SIRET <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '400' }}>(Optionnel)</span>
                    </label>
                    <input
                      type="text"
                      value={creatorInfo.companyid}
                      onChange={(e) => setCreatorInfo({...creatorInfo, companyid: e.target.value})}
                      placeholder="123 456 789 00010"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid var(--border-color, #e5e5e5)',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary, #000)', marginBottom: '6px' }}>
                      👤 Représentant légal <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '400' }}>(Optionnel)</span>
                    </label>
                    <input
                      type="text"
                      value={creatorInfo.legalRepresentative}
                      onChange={(e) => setCreatorInfo({...creatorInfo, legalRepresentative: e.target.value})}
                      placeholder="Nom Prénom"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid var(--border-color, #e5e5e5)',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Lien de vérification gouvernementale */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary, #000)', marginBottom: '6px' }}>
                    🔗 Lien de vérification gouvernementale <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '400' }}>(Optionnel)</span>
                  </label>
                  <input
                    type="url"
                    value={creatorInfo.governmentidverificationweblink}
                    onChange={(e) => setCreatorInfo({...creatorInfo, governmentidverificationweblink: e.target.value})}
                    placeholder="https://..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--border-color, #e5e5e5)',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Certifications nationales */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary, #000)', marginBottom: '6px' }}>
                      🏆 Certification nationale <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '400' }}>(Optionnel)</span>
                    </label>
                    <input
                      type="text"
                      value={creatorInfo.nationalcertification}
                      onChange={(e) => setCreatorInfo({...creatorInfo, nationalcertification: e.target.value})}
                      placeholder="Ex: AB (Agriculture Biologique)"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid var(--border-color, #e5e5e5)',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary, #000)', marginBottom: '6px' }}>
                      🔗 Lien certification nationale <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '400' }}>(Optionnel)</span>
                    </label>
                    <input
                      type="url"
                      value={creatorInfo.nationalcertificationweblink}
                      onChange={(e) => setCreatorInfo({...creatorInfo, nationalcertificationweblink: e.target.value})}
                      placeholder="https://..."
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid var(--border-color, #e5e5e5)',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Certifications internationales */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary, #000)', marginBottom: '6px' }}>
                      🌍 Certification internationale <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '400' }}>(Optionnel)</span>
                    </label>
                    <input
                      type="text"
                      value={creatorInfo.internationalcertification}
                      onChange={(e) => setCreatorInfo({...creatorInfo, internationalcertification: e.target.value})}
                      placeholder="Ex: Fair Trade"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid var(--border-color, #e5e5e5)',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary, #000)', marginBottom: '6px' }}>
                      🔗 Lien certification internationale <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '400' }}>(Optionnel)</span>
                    </label>
                    <input
                      type="url"
                      value={creatorInfo.internationalcertificationweblink}
                      onChange={(e) => setCreatorInfo({...creatorInfo, internationalcertificationweblink: e.target.value})}
                      placeholder="https://..."
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid var(--border-color, #e5e5e5)',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Réseaux sociaux supplémentaires */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary, #000)', marginBottom: '6px' }}>
                      📹 TikTok <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '400' }}>(Optionnel)</span>
                    </label>
                    <input
                      type="text"
                      value={creatorInfo.tiktok}
                      onChange={(e) => setCreatorInfo({...creatorInfo, tiktok: e.target.value})}
                      placeholder="@username"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid var(--border-color, #e5e5e5)',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary, #000)', marginBottom: '6px' }}>
                      🎥 YouTube <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '400' }}>(Optionnel)</span>
                    </label>
                    <input
                      type="text"
                      value={creatorInfo.youtube}
                      onChange={(e) => setCreatorInfo({...creatorInfo, youtube: e.target.value})}
                      placeholder="@channel"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid var(--border-color, #e5e5e5)',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary, #000)', marginBottom: '6px' }}>
                      💬 WhatsApp <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '400' }}>(Optionnel)</span>
                    </label>
                    <input
                      type="tel"
                      value={creatorInfo.whatsapp}
                      onChange={(e) => setCreatorInfo({...creatorInfo, whatsapp: e.target.value})}
                      placeholder="+33 6 12 34 56 78"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid var(--border-color, #e5e5e5)',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary, #000)', marginBottom: '6px' }}>
                      ✈️ Telegram <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '400' }}>(Optionnel)</span>
                    </label>
                    <input
                      type="text"
                      value={creatorInfo.telegram}
                      onChange={(e) => setCreatorInfo({...creatorInfo, telegram: e.target.value})}
                      placeholder="@username"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid var(--border-color, #e5e5e5)',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Autre site web */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary, #000)', marginBottom: '6px' }}>
                    🔗 Autre site web <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '400' }}>(Optionnel)</span>
                  </label>
                  <input
                    type="url"
                    value={creatorInfo.otherWebsite}
                    onChange={(e) => setCreatorInfo({...creatorInfo, otherWebsite: e.target.value})}
                    placeholder="https://..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--border-color, #e5e5e5)',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Boutons d'action */}
          <Card>
            <CardContent style={{ padding: '24px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !purpose.trim() || !counterpart.trim()}
                  variant="primary"
                  fullWidth
                  icon={isSubmitting ? '⏳' : '✅'}
                  style={{
                    padding: '14px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    opacity: (isSubmitting || !purpose.trim() || !counterpart.trim()) ? 0.5 : 1
                  }}
                >
                  {isSubmitting ? 'Import en cours...' : 'Compléter l\'Import'}
                </Button>
                <Button
                  onClick={() => navigate('/manage-token')}
                  variant="outline"
                  fullWidth
                  disabled={isSubmitting}
                  style={{
                    padding: '14px',
                    fontSize: '1rem',
                    fontWeight: '600'
                  }}
                >
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Prochaines étapes */}
          <Card>
            <CardContent style={{ 
              padding: '24px',
              backgroundColor: 'var(--bg-secondary, #f5f5f5)',
              borderRadius: '12px'
            }}>
              <h3 style={{ 
                fontSize: '1.2rem',
                fontWeight: 'bold',
                color: 'var(--text-primary, #000)',
                marginBottom: '16px'
              }}>
                📌 Prochaines Étapes
              </h3>
              <ol style={{ 
                fontSize: '0.875rem',
                color: 'var(--text-primary, #000)',
                margin: 0,
                paddingLeft: '20px',
                lineHeight: '1.8'
              }}>
                <li>Complétez l'import en renseignant l'objectif du token</li>
                <li>Accédez à "Gérer ma ferme" pour compléter les informations</li>
                <li>Ajoutez vos produits, coordonnées, certifications (optionnel)</li>
                <li>Demandez la vérification de votre ferme pour apparaître dans l'annuaire</li>
              </ol>
            </CardContent>
          </Card>
        </Stack>
        </div>
      </PageLayout>
    </MobileLayout>
  );
};

export default CompleteTokenImportPage;

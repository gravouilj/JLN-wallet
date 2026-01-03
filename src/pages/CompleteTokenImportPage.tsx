import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MobileLayout from '../components/Layout/MobileLayout';
import { Card, CardContent, Button, PageLayout, Stack, PageHeader } from '../components/UI';
import { useTokenImport, initialCreatorInfo } from '../features/token-management';

/**
 * CompleteTokenImportPage - Page pour compléter l'import d'un token existant
 * 
 * Architecture: Page squelette utilisant useTokenImport pour la logique métier
 * Les infos blockchain sont pré-remplies et non modifiables
 * L'utilisateur doit OBLIGATOIREMENT renseigner l'objectif et la contrepartie
 */
const CompleteTokenImportPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Récupérer les données du token depuis la navigation
  const tokenData = location.state?.tokenData;

  // Hook centralisé pour toute la logique d'import
  const {
    purpose,
    setPurpose,
    counterpart,
    setCounterpart,
    creatorInfo,
    updateCreatorInfo,
    isSubmitting,
    canSubmit,
    handleSubmit,
  } = useTokenImport({
    tokenData,
    onSuccess: () => {
      navigate('/manage-token');
      // Recharger la page pour afficher le nouveau token
      setTimeout(() => {
        window.location.reload();
      }, 100);
    },
    onMissingData: () => {
      navigate('/manage-token');
    },
  });

  useEffect(() => {
    // Rediriger si pas de données de token
    if (!tokenData) {
      navigate('/manage-token');
    }
  }, [tokenData, navigate]);

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
                    onChange={(e) => updateCreatorInfo("profileName", e.target.value)}
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
                    onChange={(e) => updateCreatorInfo("description", e.target.value)}
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
                      onChange={(e) => updateCreatorInfo("country", e.target.value)}
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
                      onChange={(e) => updateCreatorInfo("region", e.target.value)}
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
                      onChange={(e) => updateCreatorInfo("email", e.target.value)}
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
                      onChange={(e) => updateCreatorInfo("phone", e.target.value)}
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
                      onChange={(e) => updateCreatorInfo("website", e.target.value)}
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
                      onChange={(e) => updateCreatorInfo("facebook", e.target.value)}
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
                    onChange={(e) => updateCreatorInfo("products", e.target.value)}
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
                    onChange={(e) => updateCreatorInfo("services", e.target.value)}
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
                      onChange={(e) => updateCreatorInfo("companyid", e.target.value)}
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
                      onChange={(e) => updateCreatorInfo("legalRepresentative", e.target.value)}
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
                    onChange={(e) => updateCreatorInfo("governmentidverificationweblink", e.target.value)}
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
                      onChange={(e) => updateCreatorInfo("nationalcertification", e.target.value)}
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
                      onChange={(e) => updateCreatorInfo("nationalcertificationweblink", e.target.value)}
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
                      onChange={(e) => updateCreatorInfo("internationalcertification", e.target.value)}
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
                      onChange={(e) => updateCreatorInfo("internationalcertificationweblink", e.target.value)}
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
                      onChange={(e) => updateCreatorInfo("tiktok", e.target.value)}
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
                      onChange={(e) => updateCreatorInfo("youtube", e.target.value)}
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
                      onChange={(e) => updateCreatorInfo("whatsapp", e.target.value)}
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
                      onChange={(e) => updateCreatorInfo("telegram", e.target.value)}
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
                    onChange={(e) => updateCreatorInfo("otherWebsite", e.target.value)}
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
                  disabled={!canSubmit}
                  variant="primary"
                  fullWidth
                  icon={isSubmitting ? '⏳' : '✅'}
                  style={{
                    padding: '14px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    opacity: !canSubmit ? 0.5 : 1
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
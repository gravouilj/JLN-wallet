import { useState } from 'react';
import { Modal, Button, Input, Textarea } from '../../UI';
import { useFarms } from '../hooks/useFarms';
import { useSetAtom } from 'jotai';
import { notificationAtom } from '../../../atoms';

/**
 * CreateProfileModal - Wizard de création de profil Créateur (5 étapes)
 * 
 * Conforme au STYLING_GUIDE.md
 * 
 * Guide pédagogique pour créer un profil de créateur.
 * Explique chaque champ et aide le créateur à renseigner ses informations.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Modal ouvert
 * @param {Function} props.onClose - Fermeture du modal
 * @param {string} props.tokenId - ID du token associé
 * @param {Function} props.onSuccess - Callback après création réussie (profileId)
 */
const CreateProfileModal = ({ isOpen, onClose, tokenId, onSuccess }) => {
  const { createFarm } = useFarms();
  const setNotification = useSetAtom(notificationAtom);
  
  // État du wizard
  const [currentStep, setCurrentStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  
  // Données du formulaire
  const [formData, setFormData] = useState({
    // Étape 1 : Informations de base
    name: '',
    slogan: '',
    
    // Étape 2 : Localisation
    address: '',
    city: '',
    postalCode: '',
    country: 'France',
    
    // Étape 3 : Contact
    phone: '',
    email: '',
    website: '',
    
    // Étape 4 : Description
    description: '',
    products: '',
    
    // Étape 5 : Préférences
    visibility: 'public',
    acceptMessages: true
  });

  const totalSteps = 5;

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    // Demander confirmation si des données ont été saisies
    if (formData.name || formData.address) {
      if (!window.confirm('⚠️ Êtes-vous sûr de vouloir annuler ? Les données saisies seront perdues.')) {
        return;
      }
    }
    
    // Réinitialiser
    setCurrentStep(1);
    setFormData({
      name: '',
      slogan: '',
      address: '',
      city: '',
      postalCode: '',
      country: 'France',
      phone: '',
      email: '',
      website: '',
      description: '',
      products: '',
      visibility: 'public',
      acceptMessages: true
    });
    onClose();
  };

  const handleCreate = async () => {
    setProcessing(true);
    try {
      console.log('🏭 Création du profil...', formData);
      
      // Validation finale
      if (!formData.name) {
        throw new Error('Nom du créateur requis');
      }
      
      if (!formData.address || !formData.city) {
        throw new Error('Adresse complète requise');
      }
      
      // Création du profil via le hook useFarms
      const profile = await createFarm({
        token_id: tokenId,
        name: formData.name,
        slogan: formData.slogan || null,
        address: formData.address,
        city: formData.city,
        postal_code: formData.postalCode || null,
        country: formData.country || 'France',
        phone: formData.phone || null,
        email: formData.email || null,
        website: formData.website || null,
        description: formData.description || null,
        products: formData.products || null,
        visibility: formData.visibility,
        accept_messages: formData.acceptMessages,
        status: 'pending' // Statut initial en attente de vérification
      });
      
      setNotification({
        type: 'success',
        message: `✅ Profil "${formData.name}" créé avec succès ! En attente de vérification.`
      });
      
      console.log('✅ Profil créé:', profile);
      
      // Callback de succès avec les données
      onSuccess?.(profile);
      
      handleClose();
      
    } catch (err) {
      console.error('❌ Erreur création profil:', err);
      setNotification({
        type: 'error',
        message: err.message || 'Impossible de créer le profil'
      });
    } finally {
      setProcessing(false);
    }
  };

  // Validation de l'étape courante
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.name.length >= 3;
      case 2:
        return formData.address.length >= 5 && formData.city.length >= 2;
      case 3:
        return true; // Contact optionnel
      case 4:
        return true; // Description optionnelle
      case 5:
        return true; // Préférences toujours valides
      default:
        return false;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="large">
      <Modal.Header>
        <div>
          <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            🏡 Créer un Profil Public
          </h2>
          <p className="text-sm text-secondary">
            Étape {currentStep}/{totalSteps}
          </p>
        </div>
      </Modal.Header>

      <Modal.Body>
        {/* Barre de progression */}
        <div className="mb-6">
          <div 
            className="d-flex gap-1"
            style={{ height: '4px', backgroundColor: 'var(--bg-secondary)', borderRadius: '2px', overflow: 'hidden' }}
          >
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  backgroundColor: i < currentStep ? 'var(--accent-success)' : 'var(--bg-tertiary)',
                  transition: 'background-color 0.3s'
                }}
              />
            ))}
          </div>
        </div>

        {/* Étape 1 : Informations de base */}
        {currentStep === 1 && (
          <div className="d-flex flex-column gap-4">
            <div 
              className="p-4 rounded"
              style={{
                backgroundColor: 'var(--info-light)',
                border: '1px solid var(--border-info)'
              }}
            >
              <div className="d-flex align-center gap-2 mb-2">
                <span className="text-xl">💡</span>
                <span className="font-semibold" style={{ color: 'var(--text-info)' }}>
                  Identité du créateur
                </span>
              </div>
              <p className="text-sm mb-0" style={{ color: 'var(--text-info)', lineHeight: '1.5' }}>
                Le <strong>nom</strong> est l'identité de votre exploitation. 
                Le <strong>slogan</strong> est une phrase courte pour vous décrire.
              </p>
            </div>

            <Input
              label="Nom du créateur"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Ex: Ferme du Soleil Levant"
              maxLength={100}
              helperText="Nom officiel ou commercial"
              required
            />

            <Input
              label="Slogan (optionnel)"
              value={formData.slogan}
              onChange={(e) => updateField('slogan', e.target.value)}
              placeholder="Ex: Des légumes bio cultivés avec passion"
              maxLength={150}
              helperText="Phrase d'accroche pour attirer vos clients"
            />

            <div 
              className="p-3 rounded"
              style={{
                backgroundColor: 'var(--success-light)',
                border: '1px solid var(--accent-success)'
              }}
            >
              <p className="text-xs mb-0" style={{ color: 'var(--success-dark)', lineHeight: '1.4' }}>
                ✅ Ces informations seront visibles sur votre profil et dans l'annuaire si votre profil est public.
              </p>
            </div>
          </div>
        )}

        {/* Étape 2 : Localisation */}
        {currentStep === 2 && (
          <div className="d-flex flex-column gap-4">
            <div 
              className="p-4 rounded"
              style={{
                backgroundColor: 'var(--info-light)',
                border: '1px solid var(--border-info)'
              }}
            >
              <div className="d-flex align-center gap-2 mb-2">
                <span className="text-xl">💡</span>
                <span className="font-semibold" style={{ color: 'var(--text-info)' }}>
                  Localisation
                </span>
              </div>
              <p className="text-sm mb-0" style={{ color: 'var(--text-info)', lineHeight: '1.5' }}>
                L'<strong>adresse</strong> permet aux clients de vous trouver facilement. 
                Elle sera visible sur votre profil et l'annuaire.
              </p>
            </div>

            <Input
              label="Adresse"
              value={formData.address}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="Ex: 123 Chemin des Champs"
              maxLength={200}
              helperText="Numéro et nom de rue"
              required
            />

            <div className="d-flex gap-3">
              <Input
                label="Ville"
                value={formData.city}
                onChange={(e) => updateField('city', e.target.value)}
                placeholder="Ex: Lyon"
                maxLength={100}
                required
                style={{ flex: 2 }}
              />

              <Input
                label="Code postal"
                value={formData.postalCode}
                onChange={(e) => updateField('postalCode', e.target.value)}
                placeholder="Ex: 69000"
                maxLength={10}
                style={{ flex: 1 }}
              />
            </div>

            <div>
              <label className="d-block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Pays
              </label>
              <select
                value={formData.country}
                onChange={(e) => updateField('country', e.target.value)}
                className="w-full p-3 rounded"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                <option value="France">🇫🇷 France</option>
                <option value="Belgique">🇧🇪 Belgique</option>
                <option value="Suisse">🇨🇭 Suisse</option>
                <option value="Luxembourg">🇱🇺 Luxembourg</option>
                <option value="Canada">🇨🇦 Canada</option>
                <option value="Autre">🌍 Autre</option>
              </select>
            </div>

            <div 
              className="p-3 rounded"
              style={{
                backgroundColor: 'var(--warning-light)',
                border: '1px solid var(--accent-warning)'
              }}
            >
              <div className="d-flex align-center gap-2 mb-1">
                <span>🔒</span>
                <span className="font-semibold text-sm" style={{ color: 'var(--warning-dark)' }}>
                  Confidentialité
                </span>
              </div>
              <p className="text-xs mb-0" style={{ color: 'var(--warning-dark)', lineHeight: '1.4' }}>
                Votre adresse complète ne sera visible que sur votre profil public. 
                Seule votre ville apparaîtra dans les listes de recherche.
              </p>
            </div>
          </div>
        )}

        {/* Étape 3 : Contact */}
        {currentStep === 3 && (
          <div className="d-flex flex-column gap-4">
            <div 
              className="p-4 rounded"
              style={{
                backgroundColor: 'var(--info-light)',
                border: '1px solid var(--border-info)'
              }}
            >
              <div className="d-flex align-center gap-2 mb-2">
                <span className="text-xl">💡</span>
                <span className="font-semibold" style={{ color: 'var(--text-info)' }}>
                  Informations de contact (optionnel)
                </span>
              </div>
              <p className="text-sm mb-0" style={{ color: 'var(--text-info)', lineHeight: '1.5' }}>
                Ces informations facilitent la prise de contact par vos clients. 
                Vous pouvez les modifier ou les masquer plus tard.
              </p>
            </div>

            <Input
              label="Téléphone (optionnel)"
              type="tel"
              value={formData.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="Ex: 06 12 34 56 78"
              maxLength={20}
              helperText="Numéro pour réservations ou questions"
            />

            <Input
              label="Email (optionnel)"
              type="email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="Ex: contact@mon-etablissement.fr"
              maxLength={100}
              helperText="Adresse email professionnelle"
            />

            <Input
              label="Site web (optionnel)"
              type="url"
              value={formData.website}
              onChange={(e) => updateField('website', e.target.value)}
              placeholder="Ex: https://www.mon-etablissement.fr"
              maxLength={200}
              helperText="URL complète de votre site"
            />

            <div 
              className="p-3 rounded"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)'
              }}
            >
              <p className="text-xs text-secondary mb-0" style={{ lineHeight: '1.4' }}>
                💡 <strong>Conseil :</strong> Renseigner au moins un moyen de contact augmente 
                la confiance et facilite les échanges avec vos clients.
              </p>
            </div>
          </div>
        )}

        {/* Étape 4 : Description */}
        {currentStep === 4 && (
          <div className="d-flex flex-column gap-4">
            <div 
              className="p-4 rounded"
              style={{
                backgroundColor: 'var(--info-light)',
                border: '1px solid var(--border-info)'
              }}
            >
              <div className="d-flex align-center gap-2 mb-2">
                <span className="text-xl">💡</span>
                <span className="font-semibold" style={{ color: 'var(--text-info)' }}>
                  Présentez votre activité
                </span>
              </div>
              <p className="text-sm mb-0" style={{ color: 'var(--text-info)', lineHeight: '1.5' }}>
                Racontez votre histoire, décrivez vos produits, votre projet pour attirer les clients.
              </p>
            </div>

            <div>
              <label className="d-block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                📝 Description du créateur (optionnel)
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Ex: Exploitation familiale bio depuis 1985, spécialisée dans les légumes de saison et les fruits rouges. Nous pratiquons l'agroécologie et valorisons les circuits courts..."
                rows={5}
                maxLength={1000}
              />
              <p className="text-xs text-secondary mt-1">
                {formData.description.length}/1000 caractères
              </p>
            </div>

            <div>
              <label className="d-block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                🥕 Produits proposés (optionnel)
              </label>
              <Textarea
                value={formData.products}
                onChange={(e) => updateField('products', e.target.value)}
                placeholder="Ex: Légumes de saison, fruits rouges, œufs, miel, confitures maison..."
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-secondary mt-1">
                {formData.products.length}/500 caractères
              </p>
            </div>

            <div 
              className="p-3 rounded"
              style={{
                backgroundColor: 'var(--success-light)',
                border: '1px solid var(--accent-success)'
              }}
            >
              <p className="text-xs mb-0" style={{ color: 'var(--success-dark)', lineHeight: '1.4' }}>
                ✅ Une description détaillée et des produits bien listés améliorent votre 
                visibilité et aident les clients à comprendre votre offre.
              </p>
            </div>
          </div>
        )}

        {/* Étape 5 : Préférences */}
        {currentStep === 5 && (
          <div className="d-flex flex-column gap-4">
            <div 
              className="p-4 rounded"
              style={{
                backgroundColor: 'var(--success-light)',
                border: '1px solid var(--accent-success)'
              }}
            >
              <div className="d-flex align-center gap-2 mb-2">
                <span className="text-xl">✅</span>
                <span className="font-semibold" style={{ color: 'var(--success-dark)' }}>
                  Récapitulatif
                </span>
              </div>
              <p className="text-sm mb-0" style={{ color: 'var(--success-dark)', lineHeight: '1.5' }}>
                Vérifiez vos informations et choisissez vos préférences de visibilité.
              </p>
            </div>

            {/* Résumé */}
            <div 
              className="p-4 rounded"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)'
              }}
            >
              <div className="d-flex flex-column gap-3">
                <div>
                  <div className="text-xs text-secondary mb-1">Etablissement:</div>
                  <div className="font-bold">{formData.name}</div>
                  {formData.slogan && (
                    <div className="text-sm text-secondary mt-1">"{formData.slogan}"</div>
                  )}
                </div>
                
                <div className="border-top pt-3" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="text-xs text-secondary mb-1">Adresse:</div>
                  <div className="text-sm">
                    {formData.address}<br />
                    {formData.postalCode && `${formData.postalCode} `}{formData.city}<br />
                    {formData.country}
                  </div>
                </div>

                {(formData.phone || formData.email || formData.website) && (
                  <div className="border-top pt-3" style={{ borderColor: 'var(--border-primary)' }}>
                    <div className="text-xs text-secondary mb-1">Contact:</div>
                    <div className="text-sm d-flex flex-column gap-1">
                      {formData.phone && <div>📞 {formData.phone}</div>}
                      {formData.email && <div>✉️ {formData.email}</div>}
                      {formData.website && <div>🌐 {formData.website}</div>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Visibilité */}
            <div>
              <label className="d-block text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                🔍 Visibilité du profil
              </label>
              
              <div className="d-flex flex-column gap-2">
                <div 
                  onClick={() => updateField('visibility', 'public')}
                  className="d-flex align-center gap-3 p-3 rounded hover-lift"
                  style={{
                    border: `2px solid ${formData.visibility === 'public' ? 'var(--accent-primary)' : 'var(--border-primary)'}`,
                    backgroundColor: formData.visibility === 'public' ? 'var(--info-light)' : 'var(--bg-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <input 
                    type="radio" 
                    name="visibility"
                    checked={formData.visibility === 'public'} 
                    readOnly
                    style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-sm mb-1">🌍 Public</div>
                    <div className="text-xs text-secondary">
                      Visible dans l'annuaire public et les recherches
                    </div>
                  </div>
                </div>

                <div 
                  onClick={() => updateField('visibility', 'unlisted')}
                  className="d-flex align-center gap-3 p-3 rounded hover-lift"
                  style={{
                    border: `2px solid ${formData.visibility === 'unlisted' ? 'var(--accent-primary)' : 'var(--border-primary)'}`,
                    backgroundColor: formData.visibility === 'unlisted' ? 'var(--info-light)' : 'var(--bg-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <input 
                    type="radio" 
                    name="visibility"
                    checked={formData.visibility === 'unlisted'} 
                    readOnly
                    style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-sm mb-1">🔗 Non répertorié</div>
                    <div className="text-xs text-secondary">
                      Accessible uniquement via lien direct
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div 
              onClick={() => updateField('acceptMessages', !formData.acceptMessages)}
              className="d-flex align-center gap-3 p-4 rounded hover-lift"
              style={{
                border: `2px solid ${formData.acceptMessages ? 'var(--accent-success)' : 'var(--border-primary)'}`,
                backgroundColor: formData.acceptMessages ? 'var(--success-light)' : 'var(--bg-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <input 
                type="checkbox" 
                checked={formData.acceptMessages} 
                readOnly
                style={{ 
                  width: '20px', 
                  height: '20px', 
                  accentColor: 'var(--accent-success)',
                  cursor: 'pointer'
                }}
              />
              <div className="flex-1">
                <div className="font-semibold mb-1">💬 Accepter les messages</div>
                <p className="text-xs text-secondary mb-0">
                  Les clients pourront vous envoyer des messages via le système de tickets
                </p>
              </div>
            </div>

            {/* Info vérification */}
            <div 
              className="p-3 rounded"
              style={{
                backgroundColor: 'var(--info-light)',
                border: '1px solid var(--border-info)'
              }}
            >
              <div className="d-flex align-center gap-2 mb-1">
                <span>🔍</span>
                <span className="font-semibold text-sm" style={{ color: 'var(--text-info)' }}>
                  Vérification du profil
                </span>
              </div>
              <p className="text-xs mb-0" style={{ color: 'var(--text-info)', lineHeight: '1.4' }}>
                Votre profil sera soumis à vérification par notre équipe. 
                Vous recevrez une notification lorsque votre profil sera validé (généralement sous 48h).
              </p>
            </div>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <div className="d-flex justify-between align-center w-full">
          <Button
            variant="outline"
            onClick={currentStep === 1 ? handleClose : prevStep}
            disabled={processing}
          >
            {currentStep === 1 ? 'Annuler' : '← Précédent'}
          </Button>

          {currentStep < totalSteps ? (
            <Button
              variant="primary"
              onClick={nextStep}
              disabled={!canProceed() || processing}
            >
              Suivant →
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleCreate}
              disabled={!canProceed() || processing}
            >
              {processing ? '⏳ Création...' : '🏡 Créer le Profil'}
            </Button>
          )}
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default CreateProfileModal;

import { useState } from 'react';
import { Modal, Button, Input, Textarea, Switch } from '../UI';
import { useEcashWallet } from '../../hooks/useEcashWallet';
import { useSetAtom } from 'jotai';
import { notificationAtom } from '../../atoms';

/**
 * CreateTokenModal - Wizard de création de token (5 étapes)
 * 
 * Conforme au STYLING_GUIDE.md
 * 
 * Guide pédagogique pour créer un nouveau token eToken (ALP).
 * Explique chaque paramètre et offre des suggestions.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Modal ouvert
 * @param {Function} props.onClose - Fermeture du modal
 * @param {Function} props.onSuccess - Callback après création réussie (tokenId)
 */
const CreateTokenModal = ({ isOpen, onClose, onSuccess }) => {
  const { wallet } = useEcashWallet();
  const setNotification = useSetAtom(notificationAtom);
  
  // État du wizard
  const [currentStep, setCurrentStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  
  // Données du formulaire
  const [formData, setFormData] = useState({
    // Étape 1 : Informations de base
    ticker: '',
    name: '',
    decimals: 0,
    
    // Étape 2 : Offre initiale
    initialSupply: '',
    isVariable: false,
    
    // Étape 3 : Image (optionnel)
    imageUrl: '',
    
    // Étape 4 : Description et usage
    purpose: '',
    counterpart: '',
    
    // Étape 5 : Confirmation
    agreeToTerms: false
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
    if (formData.ticker || formData.name) {
      if (!window.confirm('⚠️ Êtes-vous sûr de vouloir annuler ? Les données saisies seront perdues.')) {
        return;
      }
    }
    
    // Réinitialiser
    setCurrentStep(1);
    setFormData({
      ticker: '',
      name: '',
      decimals: 0,
      initialSupply: '',
      isVariable: false,
      imageUrl: '',
      purpose: '',
      counterpart: '',
      agreeToTerms: false
    });
    onClose();
  };

  const handleCreate = async () => {
    setProcessing(true);
    try {
      console.log('🏭 Création du token...', formData);
      
      // Validation finale
      if (!formData.ticker || !formData.name) {
        throw new Error('Ticker et nom requis');
      }
      
      if (!formData.initialSupply || parseFloat(formData.initialSupply) <= 0) {
        throw new Error('Offre initiale invalide');
      }
      
      // Création du token via le wallet
      const result = await wallet.createToken({
        ticker: formData.ticker.toUpperCase(),
        name: formData.name,
        decimals: parseInt(formData.decimals) || 0,
        initialSupply: formData.initialSupply,
        mintable: formData.isVariable,
        url: formData.imageUrl || undefined
      });
      
      setNotification({
        type: 'success',
        message: `✅ Jeton ${formData.ticker} créé avec succès ! TXID: ${result.txid.substring(0, 8)}...`
      });
      
      console.log('✅ Jeton créé:', result);
      
      // Callback de succès avec les données
      onSuccess?.({
        tokenId: result.tokenId,
        ticker: formData.ticker,
        name: formData.name,
        purpose: formData.purpose,
        counterpart: formData.counterpart
      });
      
      handleClose();
      
    } catch (err) {
      console.error('❌ Erreur création jeton:', err);
      setNotification({
        type: 'error',
        message: err.message || 'Impossible de créer le jeton'
      });
    } finally {
      setProcessing(false);
    }
  };

  // Validation de l'étape courante
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.ticker.length >= 1 && 
               formData.ticker.length <= 12 && 
               formData.name.length >= 3;
      case 2:
        return formData.initialSupply && parseFloat(formData.initialSupply) > 0;
      case 3:
        return true; // Image optionnelle
      case 4:
        return true; // Description optionnelle
      case 5:
        return formData.agreeToTerms;
      default:
        return false;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="large">
      <Modal.Header>
        <div>
          <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            ✨ Créer un Nouveau Jeton
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
                  Identité du jeton
                </span>
              </div>
              <p className="text-sm mb-0" style={{ color: 'var(--text-info)', lineHeight: '1.5' }}>
                Le <strong>ticker</strong> est le symbole court de votre jeton (ex: EUR pour €, USD pour le $). 
                Le <strong>nom</strong> est son appellation complète (ex: Jeton Ville de Paris, Jeton des Pays de la Loire, Jeton ESS "Par Ici").
              </p>
            </div>

            <Input
              label="Ticker (Symbole)"
              value={formData.ticker}
              onChange={(e) => updateField('ticker', e.target.value.toUpperCase())}
              placeholder="Ex: JETONPARIS, JPDL, PARICI"
              maxLength={12}
              helperText={`${formData.ticker.length}/12 caractères. Court et mémorable !`}
              required
            />

            <Input
              label="Nom complet"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Ex: Jeton ESS Par Ici, Jeton Refuge Animaux"
              maxLength={100}
              helperText="Nom descriptif de votre jeton"
              required
            />

            <div>
              <label className="d-block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Décimales (Précision)
              </label>
              <div className="d-flex gap-2 mb-2">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(value => (
                  <button
                    key={value}
                    onClick={() => updateField('decimals', value)}
                    className="flex-1 p-2 rounded hover-lift"
                    style={{
                      backgroundColor: formData.decimals === value ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                      color: formData.decimals === value ? '#fff' : 'var(--text-primary)',
                      border: `1px solid ${formData.decimals === value ? 'var(--accent-primary)' : 'var(--border-primary)'}`,
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <p className="text-xs text-secondary" style={{ lineHeight: '1.4' }}>
                💡 <strong>0 décimale</strong> = Nombres entiers uniquement (1, 2, 3...)<br />
                💡 <strong>2 décimales</strong> = Comme les euros (1.50, 2.99...)<br />
                💡 <strong>8 décimales</strong> = Comme Bitcoin (très précis)
              </p>
            </div>
          </div>
        )}

        {/* Étape 2 : Offre initiale */}
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
                  Offre de jetons
                </span>
              </div>
              <p className="text-sm mb-0" style={{ color: 'var(--text-info)', lineHeight: '1.5' }}>
                L'<strong>offre initiale</strong> est le nombre de jetons créés au départ. 
                Un jeton <strong>variable</strong> peut être réémis plus tard, un jeton <strong>fixe</strong> ne le peut pas.
              </p>
            </div>

            <Input
              label="Offre initiale"
              type="number"
              value={formData.initialSupply}
              onChange={(e) => updateField('initialSupply', e.target.value)}
              placeholder="1000"
              helperText={`Nombre de ${formData.ticker || 'tokens'} créés à l'origine`}
              required
            />

            <div 
              onClick={() => updateField('isVariable', !formData.isVariable)}
              className="d-flex align-center gap-3 p-4 rounded hover-lift"
              style={{
                border: `2px solid ${formData.isVariable ? 'var(--accent-primary)' : 'var(--border-primary)'}`,
                backgroundColor: formData.isVariable ? 'var(--info-light)' : 'var(--bg-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <input 
                type="checkbox" 
                checked={formData.isVariable} 
                readOnly
                style={{ 
                  width: '20px', 
                  height: '20px', 
                  accentColor: 'var(--accent-primary)',
                  cursor: 'pointer'
                }}
              />
              <div className="flex-1">
                <div className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                  🔄 Offre variable (ré-émission possible)
                </div>
                <p className="text-xs text-secondary mb-0" style={{ lineHeight: '1.4' }}>
                  Vous pourrez créer de nouveaux jetons plus tard. 
                  Utile pour récompenses progressives, fidélité, etc.
                </p>
              </div>
            </div>

            {!formData.isVariable && (
              <div 
                className="p-3 rounded"
                style={{
                  backgroundColor: 'var(--warning-light)',
                  border: '1px solid var(--accent-warning)'
                }}
              >
                <div className="d-flex align-center gap-2 mb-1">
                  <span>⚠️</span>
                  <span className="font-semibold text-sm" style={{ color: 'var(--warning-dark)' }}>
                    Offre fixe
                  </span>
                </div>
                <p className="text-xs mb-0" style={{ color: 'var(--warning-dark)', lineHeight: '1.4' }}>
                  Une fois créés, vous ne pourrez JAMAIS créer de nouveaux {formData.ticker || 'tokens'}. 
                  Assurez-vous de créer la quantité appropriée.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Étape 3 : Image (optionnel) */}
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
                  Image du jeton (optionnel)
                </span>
              </div>
              <p className="text-sm mb-0" style={{ color: 'var(--text-info)', lineHeight: '1.5' }}>
                Une image rend votre jeton plus reconnaissable. Vous pourrez la modifier plus tard.
              </p>
            </div>

            <div className="text-center mb-4">
              <img
                src={formData.imageUrl || 'https://placehold.co/128x128?text=Token'}
                alt="Aperçu"
                style={{
                  width: '128px',
                  height: '128px',
                  borderRadius: '12px',
                  objectFit: 'cover',
                  border: '2px solid var(--border-primary)',
                  margin: '0 auto'
                }}
                onError={(e) => { e.target.src = 'https://placehold.co/128x128?text=Token'; }}
              />
            </div>

            <Input
              label="URL de l'image"
              value={formData.imageUrl}
              onChange={(e) => updateField('imageUrl', e.target.value)}
              placeholder="https://exemple.com/mon-token.png"
              helperText="Format recommandé : 256x256 pixels, PNG ou JPG, < 200 Ko"
            />

            <div 
              className="p-3 rounded"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)'
              }}
            >
              <p className="text-xs text-secondary mb-0" style={{ lineHeight: '1.4' }}>
                💡 Vous pouvez héberger votre image sur :<br />
                • Votre propre site web<br />
                • Imgur, ImgBB (hébergeurs gratuits)<br />
                • IPFS (décentralisé)
              </p>
            </div>
          </div>
        )}

        {/* Étape 4 : Description et usage */}
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
                  Utilité du jeton
                </span>
              </div>
              <p className="text-sm mb-0" style={{ color: 'var(--text-info)', lineHeight: '1.5' }}>
                Expliquez pourquoi votre jeton existe et ce qu'il offre aux détenteurs.
              </p>
            </div>

            <div>
              <label className="d-block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                🎯 Objectif du jeton
              </label>
              <Textarea
                value={formData.purpose}
                onChange={(e) => updateField('purpose', e.target.value)}
                placeholder="Ex: Jeton de fidélité pour achats directs à la ferme, récompenser les clients réguliers..."
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-secondary mt-1">
                {formData.purpose.length}/500 caractères
              </p>
            </div>

            <div>
              <label className="d-block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                🤝 Contrepartie offerte
              </label>
              <Textarea
                value={formData.counterpart}
                onChange={(e) => updateField('counterpart', e.target.value)}
                placeholder="Ex: 1 jeton = 1€ de réduction, accès prioritaire aux nouveaux produits..."
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-secondary mt-1">
                {formData.counterpart.length}/500 caractères
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
                ✅ Ces informations seront visibles sur votre profil public et aideront les utilisateurs 
                à comprendre l'intérêt de votre jeton.
              </p>
            </div>
          </div>
        )}

        {/* Étape 5 : Confirmation */}
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
                Vérifiez les informations avant de créer votre jeton.
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
                <div className="d-flex justify-between">
                  <span className="text-secondary">Ticker:</span>
                  <span className="font-bold">{formData.ticker}</span>
                </div>
                <div className="d-flex justify-between">
                  <span className="text-secondary">Nom:</span>
                  <span className="font-bold">{formData.name}</span>
                </div>
                <div className="d-flex justify-between">
                  <span className="text-secondary">Décimales:</span>
                  <span className="font-bold">{formData.decimals}</span>
                </div>
                <div className="d-flex justify-between">
                  <span className="text-secondary">Offre initiale:</span>
                  <span className="font-bold">{formData.initialSupply} {formData.ticker}</span>
                </div>
                <div className="d-flex justify-between">
                  <span className="text-secondary">Type:</span>
                  <span className="font-bold">
                    {formData.isVariable ? '🔄 Variable' : '🔒 Fixe'}
                  </span>
                </div>
              </div>
            </div>

            {/* Frais estimés */}
            <div 
              className="p-3 rounded"
              style={{
                backgroundColor: 'var(--info-light)',
                border: '1px solid var(--border-info)'
              }}
            >
              <div className="d-flex align-center gap-2 mb-1">
                <span>💰</span>
                <span className="font-semibold text-sm" style={{ color: 'var(--text-info)' }}>
                  Frais de création
                </span>
              </div>
              <p className="text-xs mb-0" style={{ color: 'var(--text-info)', lineHeight: '1.4' }}>
                Environ <strong>10-20 XEC</strong> de frais réseau seront prélevés pour enregistrer 
                votre jeton sur la blockchain eCash.
              </p>
            </div>

            {/* Conditions */}
            <div 
              onClick={() => updateField('agreeToTerms', !formData.agreeToTerms)}
              className="d-flex align-center gap-3 p-4 rounded hover-lift"
              style={{
                border: `2px solid ${formData.agreeToTerms ? 'var(--accent-success)' : 'var(--border-primary)'}`,
                backgroundColor: formData.agreeToTerms ? 'var(--success-light)' : 'var(--bg-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <input 
                type="checkbox" 
                checked={formData.agreeToTerms} 
                readOnly
                style={{ 
                  width: '20px', 
                  height: '20px', 
                  accentColor: 'var(--accent-success)',
                  cursor: 'pointer'
                }}
              />
              <div className="flex-1">
                <p className="text-sm mb-0" style={{ lineHeight: '1.5' }}>
                  Je comprends que la création d'un jeton sur la blockchain est <strong>irréversible</strong> et que je suis responsable de son usage.
                </p>
              </div>
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
              {processing ? '⏳ Création...' : '✨ Créer le Jeton'}
            </Button>
          )}
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default CreateTokenModal;

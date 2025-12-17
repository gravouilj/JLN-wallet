import { useState } from 'react';
import { useAtom } from 'jotai';
import { useEcashWallet } from '../../hooks/useEcashWallet';
import { useTranslation } from '../../hooks/useTranslation';
import { Button, Input, Card, CardContent, Badge } from '../UI';
import { savedMnemonicAtom } from '../../atoms';

/**
 * OnboardingModal - Composant pédagogique pour la gestion du portefeuille
 * 
 * Fonctionnalités :
 * - Connexion au portefeuille existant
 * - Génération d'un nouveau mnémonique (12 mots)
 * - Importation d'un mnémonique existant
 * - Interface pédagogique avec explications
 * - Conforme au STYLING_GUIDE.md
 */
const OnboardingModal = ({ isOpen, onClose, onConnected }) => {
  const { t } = useTranslation();
  const { importWallet, generateNewWallet, disconnectWallet } = useEcashWallet();
  const [savedMnemonic] = useAtom(savedMnemonicAtom);
  
  // États du composant
  const [step, setStep] = useState('menu'); // 'menu', 'create', 'import', 'confirm-generate', 'show-mnemonic'
  const [mnemonicInput, setMnemonicInput] = useState('');
  const [generatedMnemonic, setGeneratedMnemonic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mnemonicCopied, setMnemonicCopied] = useState(false);
  const [confirmWord, setConfirmWord] = useState('');
  const [randomWordIndex, setRandomWordIndex] = useState(null);

  // Fermer le modal
  const handleClose = () => {
    setStep('menu');
    setMnemonicInput('');
    setGeneratedMnemonic('');
    setError('');
    setMnemonicCopied(false);
    setConfirmWord('');
    setRandomWordIndex(null);
    if (onClose) onClose();
  };

  // Connexion avec le portefeuille sauvegardé
  const handleConnectSaved = async () => {
    setLoading(true);
    setError('');
    try {
      await importWallet(savedMnemonic);
      if (onConnected) onConnected();
      handleClose();
    } catch (e) {
      setError(e.message || 'Erreur lors de la connexion');
    } finally {
      setLoading(false);
    }
  };

  // Importer un mnémonique existant
  const handleImport = async () => {
    if (!mnemonicInput.trim()) {
      setError('Veuillez saisir votre phrase de récupération');
      return;
    }

    const words = mnemonicInput.trim().split(/\s+/);
    if (words.length !== 12) {
      setError(`Votre phrase doit contenir exactement 12 mots (${words.length} détectés)`);
      return;
    }

    setLoading(true);
    setError('');
    try {
      await importWallet(mnemonicInput);
      if (onConnected) onConnected();
      handleClose();
    } catch (e) {
      setError(e.message || 'Phrase de récupération invalide');
    } finally {
      setLoading(false);
    }
  };

  // Générer un nouveau portefeuille
  const handleGenerateConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      const mnemonic = await generateNewWallet();
      setGeneratedMnemonic(mnemonic);
      
      // Choisir un mot aléatoire pour la vérification (entre le 3ème et 10ème mot)
      const index = Math.floor(Math.random() * 8) + 2; // 2 à 9
      setRandomWordIndex(index);
      
      setStep('show-mnemonic');
    } catch (e) {
      setError(e.message || 'Erreur lors de la génération');
    } finally {
      setLoading(false);
    }
  };

  // Copier le mnémonique dans le presse-papier
  const handleCopyMnemonic = async () => {
    try {
      await navigator.clipboard.writeText(generatedMnemonic);
      setMnemonicCopied(true);
      setTimeout(() => setMnemonicCopied(false), 3000);
    } catch (e) {
      setError('Impossible de copier dans le presse-papier');
    }
  };

  // Vérifier la confirmation du mot
  const handleConfirmMnemonic = () => {
    const words = generatedMnemonic.split(' ');
    const expectedWord = words[randomWordIndex];
    
    if (confirmWord.trim().toLowerCase() === expectedWord.toLowerCase()) {
      if (onConnected) onConnected();
      handleClose();
    } else {
      setError(`Mot incorrect. Le mot n°${randomWordIndex + 1} était "${expectedWord}". Veuillez recommencer.`);
      setStep('menu');
      setGeneratedMnemonic('');
      setConfirmWord('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="pos-fixed" style={{ 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <Card className="w-full max-w-md" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <CardContent className="p-6">
          {/* Header */}
          <div className="d-flex align-center justify-between mb-5">
            <h2 className="text-2xl font-bold text-primary m-0">
              {step === 'menu' && '🔐 Portefeuille eCash'}
              {step === 'import' && '📥 Importer un portefeuille'}
              {step === 'confirm-generate' && '✨ Créer un portefeuille'}
              {step === 'show-mnemonic' && '🔑 Votre phrase de récupération'}
            </h2>
            <button
              onClick={handleClose}
              className="cursor-pointer bg-transparent border-none text-2xl opacity-60 hover-opacity"
              style={{ lineHeight: 1 }}
            >
              ✕
            </button>
          </div>

          {/* Message d'erreur */}
          {error && (
            <div className="empty-state bg-danger mb-4 p-3 rounded" style={{ 
              backgroundColor: 'var(--notification-error-bg)',
              border: '1px solid var(--notification-error-border)',
              color: 'var(--notification-error-text)'
            }}>
              <div className="d-flex align-center gap-2">
                <span>⚠️</span>
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Étape : Menu principal */}
          {step === 'menu' && (
            <div className="d-flex flex-column gap-4">
              {/* Portefeuille existant */}
              {savedMnemonic && (
                <div className="p-4 bg-secondary rounded-lg border border-primary">
                  <div className="d-flex align-center gap-3 mb-3">
                    <span className="text-3xl">💼</span>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-primary m-0 mb-1">
                        Portefeuille enregistré
                      </h3>
                      <p className="text-sm text-secondary m-0">
                        Déverrouillez votre portefeuille existant
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleConnectSaved} 
                    disabled={loading}
                    fullWidth
                    style={{ 
                      backgroundColor: 'var(--accent-success)',
                      color: 'white',
                      border: 'none'
                    }}
                  >
                    {loading ? '⏳ Connexion...' : '🔓 Déverrouiller'}
                  </Button>
                </div>
              )}

              {/* Options principales */}
              <div className="divider" style={{ 
                height: '1px',
                backgroundColor: 'var(--border-primary)',
                margin: '8px 0'
              }} />

              <div className="d-flex flex-column gap-3">
                {/* Créer un nouveau portefeuille */}
                <button
                  onClick={() => setStep('confirm-generate')}
                  disabled={loading}
                  className="d-flex align-center gap-3 p-4 bg-transparent border border-primary rounded-lg cursor-pointer hover-lift transition-all"
                  style={{ textAlign: 'left', width: '100%' }}
                >
                  <span className="text-3xl">✨</span>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-primary m-0 mb-1">
                      Créer un nouveau portefeuille
                    </h3>
                    <p className="text-xs text-secondary m-0">
                      Générer une nouvelle phrase de récupération de 12 mots
                    </p>
                  </div>
                  <span className="text-xl text-secondary">→</span>
                </button>

                {/* Importer un portefeuille existant */}
                <button
                  onClick={() => setStep('import')}
                  disabled={loading}
                  className="d-flex align-center gap-3 p-4 bg-transparent border border-primary rounded-lg cursor-pointer hover-lift transition-all"
                  style={{ textAlign: 'left', width: '100%' }}
                >
                  <span className="text-3xl">📥</span>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-primary m-0 mb-1">
                      Importer un portefeuille
                    </h3>
                    <p className="text-xs text-secondary m-0">
                      Restaurer avec une phrase de récupération existante
                    </p>
                  </div>
                  <span className="text-xl text-secondary">→</span>
                </button>
              </div>

              {/* Info pédagogique */}
              <div className="p-4 rounded-lg" style={{ 
                backgroundColor: 'var(--info-light)',
                border: '1px solid var(--border-info)',
                color: 'var(--text-info)'
              }}>
                <div className="d-flex gap-2">
                  <span className="text-lg">💡</span>
                  <div>
                    <p className="text-sm font-medium m-0 mb-2">Qu'est-ce qu'un portefeuille eCash ?</p>
                    <p className="text-xs m-0" style={{ lineHeight: '1.5' }}>
                      Un portefeuille eCash vous permet de stocker et gérer vos Jetons ainsi que vos XEC (eCash). 
                      Votre phrase de récupération de 12 mots est la clé unique de votre portefeuille. 
                      <strong> Ne la partagez jamais avec personne !</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Étape : Confirmation création */}
          {step === 'confirm-generate' && (
            <div className="d-flex flex-column gap-4">
              {/* Avertissement */}
              <div className="p-4 rounded-lg" style={{ 
                backgroundColor: 'var(--warning-light)',
                border: '1px solid var(--border-warning)',
                color: 'var(--text-warning)'
              }}>
                <div className="d-flex gap-2">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="text-base font-bold m-0 mb-2">Important à savoir</p>
                    <ul className="text-sm m-0 pl-4" style={{ lineHeight: '1.6' }}>
                      <li className="mb-2">Vous allez recevoir une <strong>phrase de récupération de 12 mots</strong></li>
                      <li className="mb-2">Cette phrase est la <strong>seule façon</strong> de récupérer votre portefeuille</li>
                      <li className="mb-2">Si vous la perdez, <strong>vous perdez l'accès à vos fonds</strong></li>
                      <li>Notez-la sur papier et conservez-la en lieu sûr</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="p-4 bg-secondary rounded-lg">
                <h3 className="text-base font-semibold text-primary m-0 mb-3">
                  📝 Ce que vous devez faire :
                </h3>
                <ol className="text-sm text-secondary m-0 pl-4" style={{ lineHeight: '1.8' }}>
                  <li>Préparez un papier et un stylo</li>
                  <li>Assurez-vous d'être seul(e)</li>
                  <li>Notez les 12 mots dans l'ordre exact</li>
                  <li>Vérifiez votre écriture (un mot mal écrit = fonds perdus)</li>
                  <li>Rangez le papier dans un endroit sûr</li>
                </ol>
              </div>

              {/* Boutons */}
              <div className="d-flex flex-column gap-2">
                <Button 
                  onClick={handleGenerateConfirm}
                  disabled={loading}
                  fullWidth
                  style={{ 
                    backgroundColor: 'var(--accent-primary)',
                    color: 'white'
                  }}
                >
                  {loading ? '⏳ Génération...' : '✨ Je suis prêt(e), générer ma phrase'}
                </Button>
                <Button 
                  onClick={() => setStep('menu')}
                  variant="outline"
                  fullWidth
                >
                  ← Retour
                </Button>
              </div>
            </div>
          )}

          {/* Étape : Affichage du mnémonique */}
          {step === 'show-mnemonic' && generatedMnemonic && (
            <div className="d-flex flex-column gap-4">
              {/* Instructions */}
              <div className="p-3 rounded-lg" style={{ 
                backgroundColor: 'var(--success-light)',
                border: '1px solid var(--border-success)',
                color: 'var(--text-success)'
              }}>
                <div className="d-flex align-center gap-2">
                  <span className="text-xl">🎉</span>
                  <p className="text-sm font-medium m-0">
                    Votre portefeuille a été créé ! Notez ces 12 mots dans l'ordre.
                  </p>
                </div>
              </div>

              {/* Mnémonique */}
              <div className="p-4 bg-secondary rounded-lg border border-primary">
                <div className="token-stats" style={{ 
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '8px'
                }}>
                  {generatedMnemonic.split(' ').map((word, index) => (
                    <div 
                      key={index}
                      className="token-stat-item d-flex align-center gap-2"
                      style={{ 
                        padding: '8px 12px',
                        backgroundColor: 'var(--bg-primary)',
                        fontFamily: 'monospace'
                      }}
                    >
                      <Badge variant="neutral" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                        {index + 1}
                      </Badge>
                      <span className="text-sm font-medium">{word}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bouton copier */}
              <Button
                onClick={handleCopyMnemonic}
                variant="outline"
                fullWidth
              >
                {mnemonicCopied ? '✅ Copié !' : '📋 Copier dans le presse-papier'}
              </Button>

              {/* Avertissement */}
              <div className="p-3 rounded-lg" style={{ 
                backgroundColor: 'var(--warning-light)',
                border: '1px solid var(--border-warning)',
                color: 'var(--text-warning)'
              }}>
                <div className="d-flex gap-2">
                  <span className="text-lg">⚠️</span>
                  <p className="text-xs m-0" style={{ lineHeight: '1.5' }}>
                    <strong>Ne fermez pas cette fenêtre</strong> avant d'avoir noté ces mots sur papier. 
                    Cette phrase ne sera plus affichée par sécurité (sauf dans les paramètres de manière masquée). 
                  </p>
                </div>
              </div>

              {/* Vérification */}
              <div className="divider" style={{ 
                height: '1px',
                backgroundColor: 'var(--border-primary)',
                margin: '8px 0'
              }} />

              <div>
                <label className="text-sm font-medium text-primary d-block mb-2">
                  🔒 Vérification de sécurité
                </label>
                <p className="text-xs text-secondary mb-3">
                  Pour confirmer que vous avez bien noté votre phrase, veuillez saisir le mot n°{randomWordIndex + 1} :
                </p>
                <Input
                  type="text"
                  placeholder={`Mot n°${randomWordIndex + 1}`}
                  value={confirmWord}
                  onChange={(e) => setConfirmWord(e.target.value)}
                  style={{ marginBottom: '12px' }}
                />
              </div>

              {/* Boutons */}
              <div className="d-flex flex-column gap-2">
                <Button 
                  onClick={handleConfirmMnemonic}
                  disabled={!confirmWord.trim()}
                  fullWidth
                  style={{ 
                    backgroundColor: 'var(--accent-success)',
                    color: 'white'
                  }}
                >
                  ✅ J'ai noté ma phrase, continuer
                </Button>
              </div>
            </div>
          )}

          {/* Étape : Importation */}
          {step === 'import' && (
            <div className="d-flex flex-column gap-4">
              {/* Instructions */}
              <div className="p-4 bg-secondary rounded-lg">
                <div className="d-flex gap-2 mb-3">
                  <span className="text-2xl">📥</span>
                  <div>
                    <h3 className="text-base font-semibold text-primary m-0 mb-2">
                      Restaurer votre portefeuille
                    </h3>
                    <p className="text-sm text-secondary m-0" style={{ lineHeight: '1.6' }}>
                      Saisissez votre phrase de récupération de 12 mots dans l'ordre exact. 
                      Chaque mot doit être séparé par un espace.
                    </p>
                  </div>
                </div>
              </div>

              {/* Textarea pour le mnémonique */}
              <div>
                <label className="text-sm font-medium text-primary d-block mb-2">
                  🔑 Phrase de récupération (12 mots)
                </label>
                <textarea
                  className="w-full p-3 rounded-lg border border-primary"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                    minHeight: '120px',
                    resize: 'vertical',
                    outline: 'none'
                  }}
                  placeholder="mot1 mot2 mot3 mot4 mot5 mot6 mot7 mot8 mot9 mot10 mot11 mot12"
                  value={mnemonicInput}
                  onChange={(e) => setMnemonicInput(e.target.value)}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-primary)'}
                />
                <p className="text-xs text-secondary mt-2">
                  {mnemonicInput.trim().split(/\s+/).filter(w => w).length} / 12 mots
                </p>
              </div>

              {/* Info sécurité */}
              <div className="p-3 rounded-lg" style={{ 
                backgroundColor: 'var(--info-light)',
                border: '1px solid var(--border-info)',
                color: 'var(--text-info)'
              }}>
                <div className="d-flex gap-2">
                  <span className="text-lg">🔒</span>
                  <p className="text-xs m-0" style={{ lineHeight: '1.5' }}>
                    Votre phrase de récupération ne sera jamais envoyée sur internet. 
                    Elle est traitée localement sur votre appareil.
                  </p>
                </div>
              </div>

              {/* Boutons */}
              <div className="d-flex flex-column gap-2">
                <Button 
                  onClick={handleImport}
                  disabled={!mnemonicInput.trim() || loading}
                  fullWidth
                  style={{ 
                    backgroundColor: 'var(--accent-primary)',
                    color: 'white'
                  }}
                >
                  {loading ? '⏳ Importation...' : '📥 Importer mon portefeuille'}
                </Button>
                <Button 
                  onClick={() => setStep('menu')}
                  variant="outline"
                  fullWidth
                >
                  ← Retour
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingModal;

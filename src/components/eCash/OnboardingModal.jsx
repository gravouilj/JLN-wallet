import React, { useState } from 'react';
import { useSetAtom } from 'jotai';
import { useNavigate } from 'react-router-dom'; // Nécessaire pour le bouton retour
import { mnemonicAtom, hasEncryptedWalletAtom } from '../../atoms';
import { storageService } from '../../services/storageService';
import { generateMnemonic } from '../../services/ecashWallet'; 

const STEPS = {
  WELCOME: 'welcome',
  CREATE: 'create',
  IMPORT: 'import',
  PASSWORD: 'password',
};

const OnboardingModal = ({ onClose, isPageMode = false }) => {
  const setMnemonicAtom = useSetAtom(mnemonicAtom);
  const setHasEncryptedWallet = useSetAtom(hasEncryptedWalletAtom);
  const navigate = useNavigate(); // Hook de navigation

  const [step, setStep] = useState(STEPS.WELCOME);
  const [mnemonic, setMnemonic] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- ACTIONS ---

  const startCreate = () => {
    try {
      const newMnemonic = generateMnemonic(); 
      setMnemonic(newMnemonic);
      setError('');
      setStep(STEPS.CREATE);
    } catch (e) {
      console.error(e);
      setError("Erreur technique : Impossible de générer le mnémonique.");
    }
  };

  const startImport = () => {
    setMnemonic('');
    setError('');
    setStep(STEPS.IMPORT);
  };

  const validateImport = (e) => {
    if(e) e.preventDefault();
    const words = mnemonic.trim().split(/\s+/);
    if (words.length !== 12) {
      setError(`Phrase invalide : ${words.length} mots trouvés sur 12 requis.`);
      return;
    }
    setError('');
    setStep(STEPS.PASSWORD);
  };

  const confirmBackup = () => {
    setStep(STEPS.PASSWORD);
  };

  const handleFinalize = async (e) => {
    e.preventDefault();
    setError('');

    if (!mnemonic) {
      setError("Erreur critique : Aucune phrase à sauvegarder.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      await storageService.saveWallet(mnemonic, password);
      setHasEncryptedWallet(true);
      setMnemonicAtom(mnemonic);
      if (onClose) onClose();
    } catch (err) {
      console.error("Erreur SAVE:", err);
      setError("Échec de la sauvegarde : " + (err.message || "Erreur inconnue"));
    } finally {
      setLoading(false);
    }
  };

  // --- STYLES INTELLIGENTS ---
  // Si isPageMode est activé, on retire le style "Overlay Fixe" pour que le Header reste cliquable
  const containerStyle = isPageMode ? {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: '2rem 1rem',
    minHeight: '60vh'
  } : {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', 
    zIndex: 10000,
    backdropFilter: 'blur(5px)'
  };

  const cardStyle = {
    maxWidth: '500px', 
    width: '100%', 
    padding: '2rem', 
    position: 'relative',
    backgroundColor: 'var(--bg-card, #fff)', // Assure un fond
    borderRadius: '12px',
    boxShadow: isPageMode ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)' // Ombre seulement en popup
  };

  return (
    <div className={isPageMode ? "" : "modal-overlay"} style={containerStyle}>
      <div className="card" style={cardStyle}>
        
        {/* BOUTON FERMER (Popup) */}
        {!isPageMode && onClose && (
          <button 
            onClick={onClose}
            style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}
          >
            &times;
          </button>
        )}

        {/* HEADER DU MODAL */}
        <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {step !== STEPS.WELCOME && (
            <button onClick={() => setStep(STEPS.WELCOME)} className="btn-ghost" style={{padding: '0.5rem'}}>
              &larr; Retour
            </button>
          )}
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Configuration Wallet</h2>
        </div>

        {/* --- ETAPE 1 : ACCUEIL --- */}
        {step === STEPS.WELCOME && (
          <div className="flex-col gap-4">
            <p className="text-secondary">Pour interagir avec la blockchain, vous avez besoin d'un portefeuille.</p>
            <div className="grid gap-3 mt-4">
              <button className="btn-primary" onClick={startCreate} style={{padding: '1rem'}}>
                🚀 Créer un nouveau Wallet
              </button>
              <button className="btn-outline" onClick={startImport} style={{padding: '1rem'}}>
                📥 Importer (J'ai déjà 12 mots)
              </button>
            </div>
            
            {/* BOUTON RETOUR ACCUEIL (Seulement en mode Page) */}
            {isPageMode && (
              <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <p style={{fontSize: '0.9rem', marginBottom: '0.5rem'}}>Vous ne voulez pas créer de wallet tout de suite ?</p>
                <button 
                  onClick={() => navigate('/')} 
                  className="btn-ghost"
                  style={{ textDecoration: 'underline' }}
                >
                  Retourner à l'annuaire public
                </button>
              </div>
            )}
          </div>
        )}

        {/* --- ETAPE 2A : CREATION --- */}
        {step === STEPS.CREATE && (
          <div className="flex-col gap-4">
            <div className="alert-warning p-4 rounded">
              ⚠️ <strong>Sauvegardez ceci !</strong> Ces 12 mots sont le seul moyen de récupérer votre argent.
            </div>
            
            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded grid grid-cols-3 gap-2 font-mono text-sm my-4">
              {mnemonic.split(' ').map((word, i) => (
                <div key={i} className="bg-white dark:bg-black p-1 rounded border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-gray-400 select-none mr-1">{i+1}.</span>{word}
                </div>
              ))}
            </div>

            <button className="btn-primary w-full" onClick={confirmBackup}>
              C'est noté, étape suivante
            </button>
          </div>
        )}

        {/* --- ETAPE 2B : IMPORT --- */}
        {step === STEPS.IMPORT && (
          <div className="flex-col gap-4">
            <label>Saisissez vos 12 mots secrets :</label>
            <textarea
              value={mnemonic}
              onChange={(e) => setMnemonic(e.target.value)}
              placeholder="mot1 mot2 mot3 ..."
              className="input-field w-full h-32 p-3 font-mono"
            />
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            
            <button className="btn-primary w-full mt-4" onClick={validateImport} disabled={!mnemonic}>
              Valider la phrase
            </button>
          </div>
        )}

        {/* --- ETAPE 3 : PASSWORD (FINAL) --- */}
        {step === STEPS.PASSWORD && (
          <form onSubmit={handleFinalize} className="flex-col gap-4">
            <div className="text-center mb-4">
              <h3>🔒 Sécurisez vos clés</h3>
              <p className="text-sm text-secondary">
                Choisissez un mot de passe pour chiffrer votre wallet sur cet appareil.
              </p>
            </div>

            <div className="form-group">
              <label>Mot de passe</label>
              <input
                type="password"
                className="input-field w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                placeholder="8 caractères minimum"
              />
            </div>

            <div className="form-group mt-3">
              <label>Confirmer</label>
              <input
                type="password"
                className="input-field w-full"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Répétez le mot de passe"
              />
            </div>

            {error && <div className="p-3 bg-red-100 text-red-700 rounded text-sm mt-3">{error}</div>}

            <button type="submit" className="btn-primary w-full mt-6" disabled={loading}>
              {loading ? 'Création et chiffrement...' : 'Terminer et Accéder au Wallet'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

export default OnboardingModal;
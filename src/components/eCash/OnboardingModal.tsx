import React, { useState } from 'react';
import { useSetAtom } from 'jotai';
import { useNavigate } from 'react-router-dom'; 
import { mnemonicAtom, hasEncryptedWalletAtom, walletModalOpenAtom } from '../../atoms';
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
  const setWalletModalOpen = useSetAtom(walletModalOpenAtom);
  const navigate = useNavigate(); 

  const [step, setStep] = useState(STEPS.WELCOME);
  const [mnemonic, setMnemonic] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- ACTIONS ---
  const startCreate = () => {
    setMnemonic(generateMnemonic());
    setError('');
    setStep(STEPS.CREATE);
  };

  const startImport = () => {
    setMnemonic('');
    setError('');
    setStep(STEPS.IMPORT);
  };

  const validateImport = () => {
    const words = mnemonic.trim().split(/\s+/);
    if (words.length !== 12) return setError(`Phrase invalide : ${words.length} mots.`);
    setError('');
    setStep(STEPS.PASSWORD);
  };

  const handleFinalize = async () => {
    // ALERT DE DEBUG : Si tu ne vois pas ça, c'est un problème CSS majeur
    // alert("Click reçu !"); 
    console.log("🚀 Click reçu");

    setError('');
    if (!mnemonic) return setError("Erreur: Pas de phrase.");
    if (password.length < 8) return setError("Mot de passe trop court.");
    if (password !== confirmPassword) return setError("Mots de passe différents.");

    setLoading(true);

    try {
      await storageService.saveWallet(mnemonic, password);
      
      // Mise à jour critique
      setHasEncryptedWallet(true);
      setMnemonicAtom(mnemonic);
      
      // Fermeture explicite
      setWalletModalOpen(false); 
      if (onClose) onClose();

      // Redirection force
      navigate('/'); 

    } catch (err) {
      alert("Erreur: " + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- STYLES ---
  const overlayStyle = isPageMode ? {
    display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '2rem 1rem', minHeight: '60vh'
  } : {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', 
    zIndex: 10000, backdropFilter: 'blur(5px)',
    pointerEvents: 'auto' // Force les clics
  };

  return (
    <div className={isPageMode ? "" : "modal-overlay"} style={overlayStyle}>
      <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '2rem', position: 'relative', background: '#fff', borderRadius: '12px' }}>
        
        {!isPageMode && onClose && (
          <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
        )}

        {/* HEADER */}
        <div style={{ marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {step !== STEPS.WELCOME && <button onClick={() => setStep(STEPS.WELCOME)} className="btn-ghost">&larr; Retour</button>}
          <h2 style={{ margin: 0 }}>Configuration Wallet</h2>
        </div>

        {/* CONTENU */}
        {step === STEPS.WELCOME && (
          <div className="flex-col gap-4">
            <p>Bienvenue. Créez ou importez un wallet.</p>
            <button className="btn-primary" onClick={startCreate} style={{width:'100%', padding:'1rem', marginBottom:'0.5rem'}}>🚀 Créer</button>
            <button className="btn-outline" onClick={startImport} style={{width:'100%', padding:'1rem'}}>📥 Importer</button>
            
            {isPageMode && (
              <div style={{marginTop: '2rem', textAlign: 'center'}}>
                <button onClick={() => navigate('/')} style={{background:'none', border:'none', textDecoration:'underline', cursor:'pointer', color:'blue'}}>
                  Retourner à l'annuaire public
                </button>
              </div>
            )}
          </div>
        )}

        {step === STEPS.CREATE && (
           <div>
             <div style={{background:'#f0f0f0', padding:'1rem', margin:'1rem 0', fontFamily:'monospace'}}>{mnemonic}</div>
             <button className="btn-primary w-full" onClick={() => setStep(STEPS.PASSWORD)}>J'ai sauvegardé</button>
           </div>
        )}

        {step === STEPS.IMPORT && (
           <div>
             <textarea value={mnemonic} onChange={e=>setMnemonic(e.target.value)} style={{width:'100%', height:'100px'}} />
             <button className="btn-primary w-full mt-4" onClick={validateImport}>Valider</button>
           </div>
        )}

        {step === STEPS.PASSWORD && (
          <div className="flex-col gap-4">
            <h3>Sécurisez vos clés</h3>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mot de passe" className="input-field w-full" style={{padding:'0.5rem', marginBottom:'0.5rem', width:'100%'}} />
            <input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Confirmer" className="input-field w-full" style={{padding:'0.5rem', width:'100%'}} />
            
            {error && <p style={{color:'red'}}>{error}</p>}

            {/* BOUTON TYPE BUTTON + ONCLICK DIRECT (Pas de form submit) */}
            <button 
              type="button" 
              className="btn-primary w-full mt-6" 
              disabled={loading}
              onClick={handleFinalize} // Appel direct
              style={{padding:'1rem', width:'100%', background:'blue', color:'white', cursor:'pointer'}}
            >
              {loading ? 'Traitement...' : 'Terminer et Accéder'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default OnboardingModal;
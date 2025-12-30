import React from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { Link, useLocation } from 'react-router-dom';
import { 
  mnemonicAtom,           // Savoir si on est connecté (clé en RAM)
  hasEncryptedWalletAtom, // Savoir si un wallet existe sur le disque
  walletModalOpenAtom,    // Pour ouvrir le modal "Créer Wallet"
  themeAtom,
  themeSetterAtom
} from '../atoms';

const Header = () => {
  const mnemonic = useAtomValue(mnemonicAtom);
  const hasEncryptedWallet = useAtomValue(hasEncryptedWalletAtom);
  const setWalletModalOpen = useSetAtom(walletModalOpenAtom);
  
  const [theme] = useAtom(themeAtom);
  const setTheme = useSetAtom(themeSetterAtom);
  const location = useLocation();

  // Gestion Logout
  const handleLogout = () => {
    // Pour se déconnecter, on recharge simplement la page.
    // Comme la clé est en RAM, elle sera effacée et le wallet "verrouillé".
    window.location.reload(); 
  };

  const handleConnect = () => {
    // Si un wallet chiffré existe, on redirige vers /wallet
    // Le "Guard" de App.jsx interceptera et affichera UnlockWallet.jsx
    if (hasEncryptedWallet) {
        window.location.hash = '#/wallet';
    } else {
        // Sinon, on ouvre le Modal de création (Onboarding)
        setWalletModalOpen(true);
    }
  };

  // Helper pour les classes CSS actives
  const isActive = (path) => location.pathname === path ? 'active-link' : '';

  return (
    <header className="header" style={styles.header}>
      {/* LOGO */}
      <Link to="/" style={styles.logo}>
        🌱 JLN Wallet
      </Link>

      {/* NAVIGATION CENTRALE */}
      <nav style={styles.nav}>
        <Link to="/" style={styles.link} className={isActive('/')}>Annuaire</Link>
        <Link to="/faq" style={styles.link} className={isActive('/faq')}>FAQ</Link>
        
        {/* Lien Wallet visible seulement si connecté */}
        {mnemonic && (
           <Link to="/wallet" style={styles.link} className={isActive('/wallet')}>Mon Wallet</Link>
        )}
      </nav>

      {/* ACTIONS DROITE */}
      <div style={styles.actions}>
        {/* Toggle Theme (Soleil/Lune) */}
        <button 
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} 
          style={styles.iconBtn}
          title="Changer le thème"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        {/* Bouton État Wallet */}
        {mnemonic ? (
          <button onClick={handleLogout} className="btn-secondary" style={styles.btnSmall}>
            🔒 Déconnexion
          </button>
        ) : (
          <button onClick={handleConnect} className="btn-primary" style={styles.btnSmall}>
            {hasEncryptedWallet ? '🔑 Déverrouiller' : '🚀 Connexion'}
          </button>
        )}
      </div>
    </header>
  );
};

// Styles inline basiques pour garantir l'affichage immédiat
// Tu pourras les déplacer dans ton fichier CSS plus tard
const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    backgroundColor: 'var(--bg-card)',
    borderBottom: '1px solid var(--border)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  },
  logo: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    textDecoration: 'none',
    color: 'var(--text-primary)'
  },
  nav: {
    display: 'flex',
    gap: '2rem'
  },
  link: {
    textDecoration: 'none',
    color: 'var(--text-secondary)',
    fontWeight: '500',
    transition: 'color 0.2s'
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.2rem',
    padding: '0.5rem'
  },
  btnSmall: {
    padding: '0.5rem 1rem',
    fontSize: '0.9rem'
  }
};

export default Header;
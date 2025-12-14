import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import TopBar from '../components/Layout/TopBar';
import BottomNavigation from '../components/Layout/BottomNavigation';
import { useAtom } from 'jotai';
import { walletConnectedAtom } from '../atoms';

/**
 * Farmer Info Page - Information pédagogique pour les producteurs (PAGE PUBLIQUE)
 * Vocabulaire imposé : Jeton, Distribution gratuite, Frais de réseau, eCash
 * Vocabulaire interdit : Token, Faucet, Investissement, Rendement, XEC, Gas
 */
const FarmerInfoPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [walletConnected] = useAtom(walletConnectedAtom);

  const handleRegisterRequest = () => {
    const subject = encodeURIComponent(t('farmerInfo.emailRegisterSubject'));
    const body = encodeURIComponent(t('farmerInfo.emailRegisterBody'));
    window.location.href = `mailto:contact@farmwallet.example.com?subject=${subject}&body=${body}`;
  };

  const handleSupportEmail = () => {
    const subject = encodeURIComponent(t('farmerInfo.emailSupportSubject'));
    const body = encodeURIComponent(t('farmerInfo.emailSupportBody'));
    window.location.href = `mailto:contact@farmwallet.example.com?subject=${subject}&body=${body}`;
  };

  const handleSupportTelegram = () => {
    window.open('https://t.me/farmwallet', '_blank');
  };

  return (
    <div className="farmer-info-page">
      <TopBar />

      <div className="farmer-info-content">
        {/* Hero Section */}
        <section className="farmer-hero-centered">
          <h1 className="farmer-main-title-centered">
            {t('farmerInfo.heroTitle')}
          </h1>
          <p className="farmer-subtitle-centered">
            {t('farmerInfo.heroSubtitle')}
          </p>
        </section>

        {/* Section 1 : Introduction */}
        <section className="farmer-section">
          <div className="section-header">
            <span className="section-icon">{t('farmerInfo.section1Icon')}</span>
            <h2>{t('farmerInfo.section1Title')}</h2>
          </div>
          <div className="section-content">
            <div className="benefit-card">
              <h3>{t('farmerInfo.benefit1Title')}</h3>
              <p>{t('farmerInfo.benefit1Text')}</p>
            </div>
            <div className="benefit-card">
              <h3>{t('farmerInfo.benefit2Title')}</h3>
              <p>{t('farmerInfo.benefit2Text')}</p>
            </div>
            <div className="benefit-card">
              <h3>{t('farmerInfo.benefit3Title')}</h3>
              <p>{t('farmerInfo.benefit3Text')}</p>
            </div>
          </div>
        </section>

        {/* Section Rewards : Système de récompenses */}
        <section className="farmer-section rewards-section">
          <div className="section-header">
            <span className="section-icon">🎁</span>
            <h2>{t('farmerInfo.rewardsTitle')}</h2>
          </div>
          <div className="section-content">
            <p className="rewards-explanation">{t('farmerInfo.rewardsText')}</p>
          </div>
        </section>

        {/* Section 2 : L'outil Cashtab */}
        <section className="farmer-section">
          <div className="section-header">
            <span className="section-icon">{t('farmerInfo.section2Icon')}</span>
            <h2>{t('farmerInfo.section2Title')}</h2>
          </div>
          <div className="section-content">
            <p className="section-intro">
              <strong>{t('farmerInfo.section2Intro')} <a href="https://cashtab.com" target="_blank" rel="noopener noreferrer" className="inline-link">{t('farmerInfo.section2IntroLink')}</a></strong>
            </p>
            <p>{t('farmerInfo.section2Text')}</p>
            <ul className="feature-list">
              <li>{t('farmerInfo.section2Feature1')}</li>
              <li>{t('farmerInfo.section2Feature2')}</li>
              <li>{t('farmerInfo.section2Feature3')}</li>
              <li>{t('farmerInfo.section2Feature4')}</li>
            </ul>
          </div>
        </section>

        {/* Section 3 : L'autonomie eCash */}
        <section className="farmer-section">
          <div className="section-header">
            <span className="section-icon">{t('farmerInfo.section3Icon')}</span>
            <h2>{t('farmerInfo.section3Title')}</h2>
          </div>
          <div className="section-content">
            <p className="section-intro">
              <strong>{t('farmerInfo.section3Intro')}</strong>{t('farmerInfo.section3IntroCost')}
            </p>
            <p>{t('farmerInfo.section3Text')}</p>
            <div className="info-box">
              <p><strong>{t('farmerInfo.section3ExampleTitle')}</strong></p>
              <p>{t('farmerInfo.section3ExampleText')}</p>
            </div>
          </div>
        </section>

        {/* Section 4 : Comment obtenir des eCash */}
        <section className="farmer-section">
          <div className="section-header">
            <span className="section-icon">{t('farmerInfo.section4Icon')}</span>
            <h2>{t('farmerInfo.section4Title')}</h2>
          </div>
          <div className="section-content">
            <div className="option-card option-recommended">
              <h3>{t('farmerInfo.option1Title')}</h3>
              <p>
                <strong>{t('farmerInfo.option1Text1')} <a href="https://cashtab.com" target="_blank" rel="noopener noreferrer" className="inline-link">{t('farmerInfo.option1Link')}</a></strong>{t('farmerInfo.option1Text2')}
              </p>
            </div>
            <div className="option-card option-autonomous">
              <h3>{t('farmerInfo.option2Title')}</h3>
              <p>
                <strong>{t('farmerInfo.option2Text1')} <a href="https://stakedxec.com" target="_blank" rel="noopener noreferrer" className="inline-link">{t('farmerInfo.option2Link')}</a></strong>{t('farmerInfo.option2Text2')}
              </p>
              <div className="info-box">
                <p><strong>{t('farmerInfo.option2InfoTitle')}</strong></p>
                <p>{t('farmerInfo.option2InfoText')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Déjà prêt ? */}
        <section className="farmer-section" style={{ 
          backgroundColor: 'var(--bg-secondary, #f0f9ff)',
          padding: '30px 20px',
          borderRadius: '12px',
          border: '2px solid var(--primary-color, #0074e4)',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '15px' }}>
            🚀 {t('farmerInfo.readyTitle') || 'Déjà prêt ?'}
          </h2>
          <p style={{ 
            fontSize: '1rem', 
            marginBottom: '20px',
            lineHeight: '1.6',
            color: 'var(--text-secondary, #666)'
          }}>
            {t('farmerInfo.readyText') || 'Connectez votre wallet pour créer votre jeton en quelques clics avant de demander le référencement.'}
          </p>
          <div style={{ display: 'flex', gap: '10px', flexDirection: 'column', alignItems: 'center' }}>
            <button 
              onClick={() => navigate('/manage-token')} 
              style={{
                padding: '14px 30px',
                fontSize: '16px',
                fontWeight: '600',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'var(--accent-primary, #0074e4)',
                color: '#fff',
                cursor: 'pointer',
                width: '100%',
                maxWidth: '400px'
              }}
            >
              🏭 {t('farmerInfo.readyButton') || 'Accéder au Dashboard Créateur'}
            </button>
            <button 
              onClick={() => navigate('/manage-token')} 
              style={{
                padding: '14px 30px',
                fontSize: '16px',
                fontWeight: '600',
                borderRadius: '8px',
                border: '2px solid var(--accent-primary, #0074e4)',
                backgroundColor: 'transparent',
                color: 'var(--accent-primary, #0074e4)',
                cursor: 'pointer',
                width: '100%',
                maxWidth: '400px'
              }}
            >
              📥 {t('farmerInfo.importButton') || 'Importer un jeton existant'}
            </button>
          </div>
        </section>

        {/* Call to Action - Referencing */}
        <section className="farmer-cta-section">
          <button onClick={handleRegisterRequest} className="cta-primary-button">
            👨‍🌾 {t('farmerInfo.ctaButtonPrimary')}
          </button>
        </section>

        {/* Support Section - Deux boutons côte à côte */}
        <section className="farmer-support-section">
          <h3 className="support-title">{t('farmerInfo.ctaButtonSecondary')}</h3>
          <div className="support-buttons-row">
            <button onClick={handleSupportEmail} className="support-btn support-email">
              📧 {t('farmerInfo.supportEmail') || 'Email'}
            </button>
            <button onClick={handleSupportTelegram} className="support-btn support-telegram">
              💬 {t('farmerInfo.supportTelegram') || 'Telegram'}
            </button>
          </div>
          <p className="support-helper-text">
            {t('farmerInfo.ctaHelperText')}
          </p>
        </section>
      </div>
      
      {walletConnected && <BottomNavigation />}
    </div>
  );
};

export default FarmerInfoPage;

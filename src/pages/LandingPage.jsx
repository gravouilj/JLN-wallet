import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import TopBar from '../components/Layout/TopBar';
import BottomNavigation from '../components/Layout/BottomNavigation';
import { useAtom } from 'jotai';
import { walletConnectedAtom } from '../atoms';

/**
 * LandingPage - Information pédagogique pour les producteurs (PAGE PUBLIQUE)
 * Vocabulaire imposé : Jeton, Distribution gratuite, Frais de réseau, eCash
 * Vocabulaire interdit : Token, Faucet, Investissement, Rendement, XEC, Gas
 */
const LandingPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [walletConnected] = useAtom(walletConnectedAtom);

  const handleRegisterRequest = () => {
    const subject = encodeURIComponent(t('landingPage.emailRegisterSubject'));
    const body = encodeURIComponent(t('landingPage.emailRegisterBody'));
    window.location.href = `mailto:contact@jlnwallet.example.com?subject=${subject}&body=${body}`;
  };

  const handleSupportEmail = () => {
    const subject = encodeURIComponent(t('landingPage.emailSupportSubject'));
    const body = encodeURIComponent(t('landingPage.emailSupportBody'));
    window.location.href = `mailto:contact@jlnwallet.example.com?subject=${subject}&body=${body}`;
  };

  const handleSupportTelegram = () => {
    window.open('https://t.me/', '_blank');
  };

  return (
    <div className="landing-page">
      <TopBar />

      <div className="landing-page-content">
        {/* Hero Section */}
        <section className="landing-hero-centered">
          <h1 className="landing-main-title-centered">
            {t('landingPage.heroTitle')}
          </h1>
          <p className="landing-subtitle-centered">
            {t('landingPage.heroSubtitle')}
          </p>
        </section>

        {/* Section 1 : Introduction */}
        <section className="landing-section">
          <div className="section-header">
            <span className="section-icon">{t('landingPage.section1Icon')}</span>
            <h2>{t('landingPage.section1Title')}</h2>
          </div>
          <div className="section-content">
            <div className="benefit-card">
              <h3>{t('landingPage.benefit1Title')}</h3>
              <p>{t('landingPage.benefit1Text')}</p>
            </div>
            <div className="benefit-card">
              <h3>{t('landingPage.benefit2Title')}</h3>
              <p>{t('landingPage.benefit2Text')}</p>
            </div>
            <div className="benefit-card">
              <h3>{t('landingPage.benefit3Title')}</h3>
              <p>{t('landingPage.benefit3Text')}</p>
            </div>
          </div>
        </section>

        {/* Section Rewards : Système de récompenses */}
        <section className="landing-section rewards-section">
          <div className="section-header">
            <span className="section-icon">🎁</span>
            <h2>{t('landingPage.rewardsTitle')}</h2>
          </div>
          <div className="section-content">
            <p className="rewards-explanation">{t('landingPage.rewardsText')}</p>
          </div>
        </section>

        {/* Section 2 : L'outil Cashtab */}
        <section className="landing-section">
          <div className="section-header">
            <span className="section-icon">{t('landingPage.section2Icon')}</span>
            <h2>{t('landingPage.section2Title')}</h2>
          </div>
          <div className="section-content">
            <p className="section-intro">
              <strong>{t('landingPage.section2Intro')} <a href="https://cashtab.com" target="_blank" rel="noopener noreferrer" className="inline-link">{t('landingPage.section2IntroLink')}</a></strong>
            </p>
            <p>{t('landingPage.section2Text')}</p>
            <ul className="feature-list">
              <li>{t('landingPage.section2Feature1')}</li>
              <li>{t('landingPage.section2Feature2')}</li>
              <li>{t('landingPage.section2Feature3')}</li>
              <li>{t('landingPage.section2Feature4')}</li>
            </ul>
          </div>
        </section>

        {/* Section 3 : L'autonomie eCash */}
        <section className="landing-section">
          <div className="section-header">
            <span className="section-icon">{t('landingPage.section3Icon')}</span>
            <h2>{t('landingPage.section3Title')}</h2>
          </div>
          <div className="section-content">
            <p className="section-intro">
              <strong>{t('landingPage.section3Intro')}</strong>{t('landingPage.section3IntroCost')}
            </p>
            <p>{t('landingPage.section3Text')}</p>
            <div className="info-box">
              <p><strong>{t('landingPage.section3ExampleTitle')}</strong></p>
              <p>{t('landingPage.section3ExampleText')}</p>
            </div>
          </div>
        </section>

        {/* Section 4 : Comment obtenir des eCash */}
        <section className="landing-section">
          <div className="section-header">
            <span className="section-icon">{t('landingPage.section4Icon')}</span>
            <h2>{t('landingPage.section4Title')}</h2>
          </div>
          <div className="section-content">
            <div className="option-card option-recommended">
              <h3>{t('landingPage.option1Title')}</h3>
              <p>
                <strong>{t('landingPage.option1Text1')} <a href="https://cashtab.com" target="_blank" rel="noopener noreferrer" className="inline-link">{t('landingPage.option1Link')}</a></strong>{t('landingPage.option1Text2')}
              </p>
            </div>
            <div className="option-card option-autonomous">
              <h3>{t('landingPage.option2Title')}</h3>
              <p>
                <strong>{t('landingPage.option2Text1')} <a href="https://stakedxec.com" target="_blank" rel="noopener noreferrer" className="inline-link">{t('landingPage.option2Link')}</a></strong>{t('landingPage.option2Text2')}
              </p>
              <div className="info-box">
                <p><strong>{t('landingPage.option2InfoTitle')}</strong></p>
                <p>{t('landingPage.option2InfoText')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Déjà prêt ? */}
        <section className="landing-section" style={{ 
          backgroundColor: 'var(--bg-secondary, #f0f9ff)',
          padding: '30px 20px',
          borderRadius: '12px',
          border: '2px solid var(--primary-color, #0074e4)',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '15px' }}>
            🚀 {t('landingPage.readyTitle') || 'Déjà prêt ?'}
          </h2>
          <p style={{ 
            fontSize: '1rem', 
            marginBottom: '20px',
            lineHeight: '1.6',
            color: 'var(--text-secondary, #666)'
          }}>
            {t('landingPage.readyText') || 'Connectez votre wallet pour créer votre jeton en quelques clics avant de demander le référencement.'}
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
              🏭 {t('landingPage.readyButton') || 'Accéder au Dashboard Créateur'}
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
              📥 {t('landingPage.importButton') || 'Importer un jeton existant'}
            </button>
          </div>
        </section>

        {/* Call to Action - Referencing */}
        <section className="landing-cta-section">
          <button onClick={handleRegisterRequest} className="cta-primary-button">
            👨‍🌾 {t('landingPage.ctaButtonPrimary')}
          </button>
        </section>

        {/* Support Section - Deux boutons côte à côte */}
        <section className="landing-support-section">
          <h3 className="support-title">{t('landingPage.ctaButtonSecondary')}</h3>
          <div className="support-buttons-row">
            <button onClick={handleSupportEmail} className="support-btn support-email">
              📧 {t('landingPage.supportEmail') || 'Email'}
            </button>
            <button onClick={handleSupportTelegram} className="support-btn support-telegram">
              💬 {t('landingPage.supportTelegram') || 'Telegram'}
            </button>
          </div>
          <p className="support-helper-text">
            {t('landingPage.ctaHelperText')}
          </p>
        </section>
      </div>
      
      {walletConnected && <BottomNavigation />}
    </div>
  );
};

export default LandingPage;

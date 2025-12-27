import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAtom } from 'jotai';
import { walletConnectedAtom, walletModalOpenAtom, currencyAtom } from '../atoms';
import MobileLayout from '../components/Layout/MobileLayout';
import { Button, Card, CardContent, Badge } from '../components/UI';
import { useProfiles } from '../hooks/useProfiles';
import { useXecPrice } from '../hooks/useXecPrice';
import BottomNavigation from '../components/Layout/BottomNavigation';

import '../styles/landing.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const [walletConnected] = useAtom(walletConnectedAtom);
  const [, setIsWalletModalOpen] = useAtom(walletModalOpenAtom);
  const [currency] = useAtom(currencyAtom);
  const { profiles } = useProfiles();
  const price = useXecPrice();

  const [activeRole, setActiveRole] = useState('user'); 
  
  const previewProfiles = profiles
    .filter(p => p.status === 'active' && p.verified)
    .slice(0, 4);

  const handleConnect = () => setIsWalletModalOpen(true);

  const handleAction = (path) => {
    if (!walletConnected) handleConnect();
    else navigate(path);
  };

 const getFiatCost = (xecAmount) => {
  if (!price || typeof price.convert !== 'function') return '...';
  
  const fiatAmount = price.convert(xecAmount, currency);

  // Si le montant est minuscule (inférieur à 0.01), on autorise jusqu'à 8 décimales.
  // Sinon, on reste sur les 2 décimales standards du commerce.
  const precision = fiatAmount < 0.01 ? 8 : 2;

  const formattedValue = fiatAmount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: precision,
  });

  return `${formattedValue} ${currency}`;
};

  const [selectedCase, setSelectedCase] = useState('daniel');
  
  
  return (
    <MobileLayout title="Accueil">
      <div className="landing-wrapper">
        
        {/* === HERO SECTION === */}
        <header className="landing-hero fade-in">
          <div className="hero-content">
            <Badge variant="success" className="mb-4">🌍 L'économie réelle, sans intermédiaire</Badge>
            <h1 className="hero-title">
              Le support numérique de vos <span className="text-gradient">échanges réels</span>.
            </h1>
            <p className="hero-subtitle">
              Créez et utilisez des jetons d'usage pour vos échanges locaux. Une infrastructure libre pour simplifier la vie des citoyens, des commerçants et des bâtisseurs de projets.
            </p>
            <div className="hero-cta-group">
              <Button onClick={() => navigate('/')} variant="primary" className="hero-main-cta">
                Découvrir les projets
              </Button>
              {!walletConnected && (
                <Button onClick={handleConnect} variant="outline" className="hero-main-cta">
                  Ouvrir mon portefeuille
                </Button>
              )}
            </div>
          </div>
        </header>

        <div className="landing-body">

          {/* === SCHÉMA MENTAL : COMMENT ÇA MARCHE (30s) === */}
          <section className="section-container bg-alt">
            <h2 className="text-center mb-8">Comprendre l'application en 30 secondes</h2>
            <div className="workflow-grid">
              <div className="workflow-step">
                <div className="step-number">1</div>
                <h5>Votre Portefeuille</h5>
                <p>Créez votre portefeuille en quelques secondes. Aucune inscription, aucune donnée personnelle à fournir.</p>
              </div>
              <div className="workflow-step">
                <div className="step-number">2</div>
                <h5>Des Jetons Utiles</h5>
                <p>Les jetons servent à soutenir un projet, récompenser des clients ou accéder à des services locaux.</p>
              </div>
              <div className="workflow-step">
                <div className="step-number">3</div>
                <h5>Des Échanges Simples</h5>
                <p>Payez ou recevez des jetons par QR code, de manière instantanée et sécurisée.</p>
              </div>
              <div className="workflow-step">
                <div className="step-number">4</div>
                <h5>Une valeur qui circule localement</h5>
                <p>Les échanges en jetons se font en face-à-face et sans commission.</p>
              </div>
            </div>
          </section>
          
             {/* === SECTION PHILOSOPHIE (Manifeste) === */}
          <section className="section-container text-center">
            <h2 className="mb-4">Redonner du sens à nos échanges</h2>
            <p className="max-w-800 mx-auto text-secondary text-lg">
              L'économie est devenue abstraite. Cette application est une infrastructure de confiance pour <strong>améliorer vos échanges locaux</strong>. 
              Ici, pas de spéculation ou de commissions exhorbitantes, mais un outil pour soutenir ceux que vous connaissez et renforcer l'économie de votre territoire.
            </p>
            <div className="philosophy-tags mt-6">
              <Badge variant="outline">#InfrastructureLibre</Badge>
              <Badge variant="outline">#LienDirect</Badge>
              <Badge variant="outline">#ZéroCommission</Badge>
              <Badge variant="outline">#UsageRéel</Badge>
            </div>
          </section>

          {/* === SÉLECTEUR DE RÔLE === */}
          <div className="role-selector-container">
            <div className="role-selector">
              <button 
                className={`role-tab ${activeRole === 'user' ? 'active' : ''}`}
                onClick={() => setActiveRole('user')}
              >
                👤 Pour les Utilisateurs
              </button>
              <button 
                className={`role-tab ${activeRole === 'creator' ? 'active' : ''}`}
                onClick={() => setActiveRole('creator')}
              >
                🔨 Pour les Créateurs
              </button>
            </div>
          </div>

          {/* === CONTENU : UTILISATEUR (Optimisé) === */}
          {activeRole === 'user' && (
            <div className="role-content fade-in">
              <section className="section-container bg-alt">
                <div className="section-header-centered">
                  <Badge variant="outline" className="mb-2">Usage Quotidien</Badge>
                  <h2>Une nouvelle façon de consommer</h2>
                  <p>Reprenez le contrôle sur vos échanges et soutenez l'économie qui a du sens pour vous.</p>
                </div>
                
                <div className="benefits-grid">
                  <div className="benefit-card">
                    <div className="benefit-icon">🔒</div>
                    <h3>Zéro Donnée, Totale Vie Privée</h3>
                    <p>Pas d'email, pas de compte, pas de profil public. Votre portefeuille vit sur votre téléphone. Vous restez anonyme dans vos soutiens et vos achats.</p>
                  </div>
                  <div className="benefit-card">
                    <div className="benefit-icon">🤝</div>
                    <h3>Le Lien Humain d'abord</h3>
                    <p>L'application n'est qu'un support. L'échange se fait en face à face, au marché ou en boutique. C'est le retour à la confiance directe entre individus.</p>
                  </div>
                  <div className="benefit-card">
                    <div className="benefit-icon">💎</div>
                    <h3>Soutien Réel, Valeur Réelle</h3>
                    <p>Vos jetons ne sont pas des actifs virtuels. Ils représentent des produits, des services ou des remises chez des gens que vous pouvez rencontrer.</p>
                  </div>
                  <div className="benefit-card">
                    <div className="benefit-icon">⚡</div>
                    <h3>Zéro Frais d'Usage</h3>
                    <p>Recevoir, stocker et payer en jetons d'usage est totalement gratuit pour vous. L'infrastructure technique est portée par le réseau global.</p>
                  </div>
                </div>
                
                <div className="cta-centered mt-8">
                   <Button onClick={() => navigate('/')} variant="primary" size="lg">
                    🔍 Explorer les projets autour de moi
                  </Button>
                </div>
              </section>
            </div>
          )}
          {/* === CONTENU : CRÉATEUR (Professionnels & Institutions) === */}
          {activeRole === 'creator' && (
            <div className="role-content fade-in">
              <section className="section-container bg-alt">
                <div className="section-header-centered">
                  <Badge variant="outline" className="mb-2">Dispositifs pour l'Économie Réelle</Badge>
                  <h2>Émettez vos propres supports d'échange</h2>
                  <p>Artisans, associations ou municipalités : organisez la circulation de la valeur sur votre territoire grâce à un support technique neutre.</p>
                </div>
                
                {/* 1. Les Leviers d'Usage Local */}
                <div className="usecases-stack mb-12">
                  <div className="usecase-card">
                    <div className="usecase-icon">📈</div>
                    <div className="usecase-content">
                      <h3>Anticipation de Trésorerie par le Pré-achat</h3>
                      <p>Activez votre communauté pour sécuriser vos besoins opérationnels (stocks, matériel). Vos soutiens pré-achètent vos produits ou services aujourd'hui pour les consommer plus tard.</p>
                      <Badge variant="success">Zéro dette bancaire</Badge>
                    </div>
                  </div>

                  <div className="usecase-card">
                    <div className="usecase-icon">🏛️</div>
                    <div className="usecase-content">
                      <h3>Dispositifs Territoriaux & Sociaux</h3>
                      <p>Municipalités et Institutions : lancez des jetons d'usage et d'utilité (ex: aides culturelles, incitations écologiques) utilisables exclusivement dans les commerces de proximité partenaires.</p>
                      <Badge variant="success">Relocalisation de la valeur</Badge>
                    </div>
                  </div>

                  <div className="usecase-card">
                    <div className="usecase-icon">🎁</div>
                    <div className="usecase-content">
                      <h3>Programmes de Fidélité Circulaire</h3>
                      <p>Remplacez les cartes papier par des jetons de récompense non-financiers. Encouragez le retour en boutique et créez des cercles d'entraide entre commerçants et associations.</p>
                      <Badge variant="success">Engagement communautaire</Badge>
                    </div>
                  </div>
                </div>

                {/* 2. Les Garanties d'Infrastructure (Le Bouclier Réglementaire) */}
                <div className="section-header-centered">
                  <h3>Un cadre technique protecteur</h3>
                  <p className="text-sm text-secondary">L'application est une infrastructure neutre conçue pour l'usage, pas pour la finance.</p>
                </div>
                <div className="profiles-showcase mb-12">
                  <div className="profile-type-card">
                    <h4>⚙️ Paramétrage d'Usage</h4>
                    <p>Définissez les règles : quantité fixe pour un projet ou variable pour un flux. Vous fixez la validité et les conditions de retrait des produits.</p>
                  </div>
                  <div className="profile-type-card featured">
                    <Badge variant="primary">Conformité</Badge>
                    <h4>🛡️ Absence de Droits Financiers</h4>
                    <p>Les jetons créés sont des instruments d'échange de biens et services. Ils ne confèrent aucun droit au profit, dividende ou intérêt.</p>
                  </div>
                  <div className="profile-type-card">
                    <h4>⚖️ Indépendance Technique</h4>
                    <p>L'app ne collecte pas de fonds et n'intervient pas dans la relation émetteur-client. Elle fournit l'outil de traçabilité blockchain.</p>
                  </div>
                  <div className="profile-type-card">
                    <h4>🧾 Support Comptable</h4>
                    <p>Support idéal pour la gestion des "produits constatés d'avance" (préventes) ou des titres d'accès numériques.</p>
                  </div>
                </div>

                <div className="creator-actions-grid mt-8">
                  <Button onClick={() => handleAction('/manage-token')} variant="primary" size="lg">🔨 Créer un jeton d'usage</Button>
                  <Button onClick={() => handleAction('/manage-tokens')} variant="outline" size="lg">🔑 Gérer mes outils</Button>
                </div>
              </section>

              {/* 3. Les Profils de Confiance */}
              <section className="section-container">
                <h2 className="text-center mb-8">Niveaux de Crédibilité</h2>
                <div className="profiles-showcase">
                  <div className="profile-type-card">
                    <h4>🕵️ Profil Libre</h4>
                    <p>Usage privé ou cercles d'amis. Pas d'identification requise, aucune visibilité dans l'annuaire public.</p>
                  </div>
                  <div className="profile-type-card featured">
                    <Badge variant="primary">Standard Pro</Badge>
                    <h4>📝 Public</h4>
                    <p>Pour les commerçants, artisans et associations. Votre projet est visible par tous les citoyens de votre zone géographique.</p>
                  </div>
                  <div className="profile-type-card border-success">
                    <h4>✅ Vérifié</h4>
                    <p>Identification légale (KYC). Obligatoire pour les institutions et entreprises souhaitant une visibilité institutionnelle maximale.</p>
                  </div>
                </div>
              </section>
            </div>
          )}
                    {/* === SECTION STORYTELLING : LES CAS D'USAGE RÉELS === */}
            <section className="section-container">
              <div className="section-header-centered">
                <Badge variant="primary" className="mb-2">Exemples concrets</Badge>
                <h2>L'économie humaine en action</h2>
                <p>Découvrez comment citoyens, commercants et créateurs utilisent JLN Wallet pour transformer leur quotidien.</p>
              </div>

              {/* Sélecteur de Cas d'Usage (Scroll horizontal sur mobile) */}
              <div className="usecase-selector-wrapper mb-8">
                <div className="usecase-tabs">
                  {[
                    { id: 'daniel', icon: '🌾', label: 'Ferme' },
                    { id: 'cafe', icon: '☕', label: 'Café' },
                    { id: 'bois', icon: '🪵', label: 'Artisan' },
                    { id: 'scene', icon: '🎸', label: 'Culture' },
                    { id: 'coeur', icon: '🏛️', label: 'Ville' },
                    { id: 'houblon', icon: '🍺', label: 'Brasserie' },
                    { id: 'temps', icon: '⏳', label: 'Entraide' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      className={`usecase-tab-btn ${selectedCase === tab.id ? 'active' : ''}`}
                      onClick={() => setSelectedCase(tab.id)}
                    >
                      <span className="tab-icon">{tab.icon}</span>
                      <span className="tab-label">{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Contenu du Cas Sélectionné */}
              <div className="usecase-display-area fade-in">
                {/* Cas 1 : Daniel (Ferme) */}
                {selectedCase === 'daniel' && (
                  <div className="usecase-detail-card main-case">
                    <div className="usecase-header">
                      <Badge variant="primary">Ferme du Vercors (Daniel)</Badge>
                    </div>
                    <div className="usecase-content-grid">
                      <div className="usecase-text">
                        <h3>Financer une installation sans crédit bancaire</h3>
                        <p>Daniel a besoin de 6000€ pour un nouveau poulailler mobile. Il émet le jeton d'usage <strong>"OEUF"</strong>.</p>
                        <ul className="custom-list mt-4">
                          <li><strong>Le soutien :</strong> Sa communauté achète des jetons en avance pour sécuriser sa trésorerie.</li>
                          <li><strong>L'autonomie :</strong> Daniel lance son projet immédiatement, sans attendre un accord bancaire.</li>
                          <li><strong>La contrepartie :</strong> À la récolte, les jetons sont échangés contre des boîtes d'œufs directement à la ferme.</li>
                        </ul>
                        <p className="mt-4 italic">Résultat : Daniel installe son poulailler, et ses clients sécurisent leur alimentation locale à prix fixe.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cas 2 : Café Associatif */}
                {selectedCase === 'cafe' && (
                  <div className="usecase-detail-card main-case">
                    <div className="usecase-header">
                      <Badge variant="primary">Le Café du Quartier (Julie & Karim)</Badge>
                    </div>
                    <div className="usecase-content-grid">
                      <div className="usecase-text">
                        <h3>Sauver et animer un lieu de vie</h3>
                        <p>Julie et Karim reprennent un café menacé de fermeture. Ils créent le jeton <strong>"CAFÉ"</strong> pour impliquer les habitués.</p>
                        <ul className="custom-list mt-4">
                          <li><strong>Le soutien :</strong> Les voisins achètent des jetons "CAFÉ" pour financer le stock et les premiers travaux.</li>
                          <li><strong>La sécurité :</strong> Le café dispose d'un fonds de roulement dès l'ouverture.</li>
                          <li><strong>La contrepartie :</strong> Chaque jeton est une "consommation pré-payée" valable pour une boisson ou une soirée culturelle.</li>
                        </ul>
                        <p className="mt-4 italic">Résultat : Le quartier conserve son lieu de rencontre, co-financé par ceux qui l'utilisent.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cas 3 : Menuisier */}
                {selectedCase === 'bois' && (
                  <div className="usecase-detail-card main-case">
                    <div className="usecase-header">
                      <Badge variant="primary">Atelier Thomas (Artisanat)</Badge>
                    </div>
                    <div className="usecase-content-grid">
                      <div className="usecase-text">
                        <h3>Investir dans la qualité locale</h3>
                        <p>Thomas souhaite acquérir une machine performante pour travailler du bois de pays. Il émet le jeton <strong>"BOIS"</strong>.</p>
                        <ul className="custom-list mt-4">
                          <li><strong>Le soutien :</strong> Ses clients fidèles pré-achètent ses futurs services.</li>
                          <li><strong>L'indépendance :</strong> Thomas investit sans augmenter ses prix ni dépendre de conditions bancaires lourdes.</li>
                          <li><strong>La contrepartie :</strong> Les jetons sont échangeables contre des meubles sur mesure ou des ateliers d'initiation.</li>
                        </ul>
                        <p className="mt-4 italic">Résultat : Un outil financé collectivement pour un artisan qui reste maître de son savoir-faire.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cas 4 : Festival */}
                {selectedCase === 'scene' && (
                  <div className="usecase-detail-card main-case">
                    <div className="usecase-header">
                      <Badge variant="primary">Festival Rural (Association)</Badge>
                    </div>
                    <div className="usecase-content-grid">
                      <div className="usecase-text">
                        <h3>Faire exister la culture sur le territoire</h3>
                        <p>Une association organise un événement de musique. Elle crée le jeton <strong>"SCÈNE"</strong> pour sécuriser l'organisation.</p>
                        <ul className="custom-list mt-4">
                          <li><strong>Le soutien :</strong> Le public achète ses jetons plusieurs mois avant l'événement.</li>
                          <li><strong>La sécurité :</strong> L'association peut engager les techniciens et artistes sans avance bancaire.</li>
                          <li><strong>La contrepartie :</strong> Les jetons servent de billets d'entrée et de monnaie d'échange sur place (repas, boissons).</li>
                        </ul>
                        <p className="mt-4 italic">Résultat : Le public devient co-producteur de l'événement qu'il souhaite voir exister chez lui.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cas 5 : Mairie / Ville */}
                {selectedCase === 'coeur' && (
                  <div className="usecase-detail-card main-case">
                    <div className="usecase-header">
                      <Badge variant="primary">Collectif de Centre-Ville (Municipalité)</Badge>
                    </div>
                    <div className="usecase-content-grid">
                      <div className="usecase-text">
                        <h3>Redynamiser le commerce de proximité</h3>
                        <p>Une ville pilote un programme de soutien local via le jeton <strong>"CŒUR"</strong>.</p>
                        <ul className="custom-list mt-4">
                          <li><strong>L'activation :</strong> Les habitants échangent leurs euros contre des jetons utilisables uniquement en centre-ville.</li>
                          <li><strong>La circulation :</strong> La valeur reste sur le territoire au lieu de s'évaporer sur des plateformes mondiales.</li>
                          <li><strong>La récompense :</strong> Les commerçants offrent des jetons bonus pour fidéliser les clients engagés.</li>
                        </ul>
                        <p className="mt-4 italic">Résultat : Une économie circulaire renforcée qui protège les commerçants indépendants.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cas 6 : Brasserie */}
                {selectedCase === 'houblon' && (
                  <div className="usecase-detail-card main-case">
                    <div className="usecase-header">
                      <Badge variant="primary">Brasserie de Lucie (Production)</Badge>
                    </div>
                    <div className="usecase-content-grid">
                      <div className="usecase-text">
                        <h3>Brasser en accord avec la demande</h3>
                        <p>Lucie veut lancer une nouvelle recette artisanale. Elle crée le jeton d'usage <strong>"HOUBLON"</strong>.</p>
                        <ul className="custom-list mt-4">
                          <li><strong>Le test :</strong> Ses clients achètent les jetons avant le brassage, validant l'intérêt pour la recette.</li>
                          <li><strong>La production :</strong> Lucie ajuste ses volumes selon l'engagement réel, évitant le gaspillage.</li>
                          <li><strong>La contrepartie :</strong> Chaque jeton donne droit à un coffret de dégustation une fois la production terminée.</li>
                        </ul>
                        <p className="mt-4 italic">Résultat : Moins de risques pour la brasseuse, plus de lien direct avec ses consommateurs.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cas 7 : SEL Entraide */}
                {selectedCase === 'temps' && (
                  <div className="usecase-detail-card main-case">
                    <div className="usecase-header">
                      <Badge variant="primary">Réseau d'Entraide (Collectif Citoyen)</Badge>
                    </div>
                    <div className="usecase-content-grid">
                      <div className="usecase-text">
                        <h3>Valoriser le temps et les compétences</h3>
                        <p>Un collectif met en place un système d'échange local basé sur le jeton <strong>"TEMPS"</strong>.</p>
                        <ul className="custom-list mt-4">
                          <li><strong>L'échange :</strong> 1 jeton "TEMPS" équivaut à 1 heure de service (jardinage, aide informatique, garde).</li>
                          <li><strong>L'équité :</strong> Chaque membre peut donner une heure et en recevoir une en retour, sans argent.</li>
                          <li><strong>La traçabilité :</strong> La blockchain sécurise le décompte des heures de manière transparente pour le collectif.</li>
                        </ul>
                        <p className="mt-4 italic">Résultat : Une économie humaine et solidaire basée sur la réciprocité de voisinage.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

          {/* === PRICING SECTION (Contraste Corrigé) === */}
          <section className="section-container pricing-section-dark">
            <div className="pricing-glass-card">
              <div className="pricing-header">
                <h2 style={{color: 'white', margin: 0}}>Transparence & Coûts</h2>
                <div className="price-tag">
                  <span className="amount" style={{color: '#4ade80'}}>Gratuit</span>
                  <span className="period" style={{color: '#94a3b8'}}>zéro commission</span>
                </div>
              </div>
              <p className="pricing-intro" style={{color: '#cbd5e1', marginBottom: '32px'}}>
                L'application est un outil gratuit. Nous ne percevons aucune commission sur la création et vos échanges de jetons.
              </p>
              
              <div className="pricing-list">
                <div className="pricing-item" style={{borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '12px'}}>
                  <span style={{color: '#e2e8f0'}}>Usage du portefeuille</span>
                  <Badge variant="success">Gratuit</Badge>
                </div>
                <div className="pricing-item" style={{borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '12px'}}>
                  <span style={{color: '#e2e8f0'}}>Émission d'un jeton (réseau)</span>
                  <strong style={{color: 'white'}}>{getFiatCost(5.46)} *</strong>
                </div>
                <div className="pricing-item" style={{borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px'}}>
                  <span style={{color: '#e2e8f0'}}>Envoi de jetons (réseau)</span>
                  <strong style={{color: 'white'}}>{getFiatCost(1)} *</strong>
                </div>
                <div className="pricing-item" style={{borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px'}}>
                  <span style={{color: '#e2e8f0'}}>Envois et Distribution: eCash (XEC)</span>
                  <strong style={{color: 'white'}}>10% - Min 5.46 XEC (= {getFiatCost(1)})</strong>
                </div>
              </div>
              
              <p className="pricing-disclaimer" style={{color: '#94a3b8', fontSize: '0.8rem', marginTop: '24px', fontStyle: 'italic'}}>
                * Frais de réseau incompressibles payés à l'infrastructure eCash (XEC) pour sécuriser les transactions. JLN Portefeuille ne perçoit aucune rémunération sur ces frais.
              </p>
            </div>
          </section>

          {/* === ANNUAIRE PREVIEW === */}
          {previewProfiles.length > 0 && (
            <section className="section-container">
              <div className="section-header">
                <div className="section-header-content">
                  <h2 className="section-title">L'économie réelle en action</h2>
                  <p className="section-subtitle">Découvrez les créateurs qui utilisent déjà notre infrastructure pour leurs activités.</p>
                </div>
                <button onClick={() => navigate('/')} className="link-arrow">Voir tout →</button>
              </div>
              <div className="preview-grid">
                {previewProfiles.map(profile => (
                  <div key={profile.id} className="preview-card hover-lift" onClick={() => navigate('/')}>
                    <div className="preview-card-img" style={{backgroundImage: `url(${profile.image_url || 'https://placehold.co/400x200?text=Commerce'})`}}></div>
                    <div className="preview-card-content">
                      <h3>{profile.name} {profile.verified && '✅'}</h3>
                      <p>📍 {profile.location_region || 'France'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* === AVERTISSEMENT LÉGAL === */}
          <footer className="legal-footer">
            <div className="max-w-800 mx-auto">
              <p className="mb-4">
                <strong>Avertissement Juridique :</strong> L'application est un support technologique. Les jetons émis sont des jetons d'usage (contreparties, fidélité, accès). Ils ne confèrent aucun droit financier, dividende ou promesse de rendement. Chaque créateur est seul responsable de la définition et de la livraison de ses contreparties, ainsi que de sa conformité fiscale locale.
              </p>
              <p>© 2026 JLN Wallet - L'infrastructure au service du lien humain.</p>
            </div>
          </footer>
        </div>
      </div>
      
      {walletConnected && <div className="pb-20"><BottomNavigation /></div>}
    </MobileLayout>
  );
};

export default LandingPage;
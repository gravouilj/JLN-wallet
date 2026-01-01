import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import TopBar from '../components/Layout/TopBar';
import { FaqSection } from '../components/Faq';
import { Button, Badge } from '../components/UI';

const FaqPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // L'intégralité de tes questions organisées par catégories
  const faqs = [
    // --- CATÉGORIE : DÉMARRER & SÉCURITÉ ---
    {
      category: 'wallet',
      icon: '✨',
      question: t('faq.generateQuestion') || "C'est quoi \"Générer\" ?",
      answer: t('faq.generateAnswer') || "Générer signifie créer un nouveau compte / portefeuille. Le système génère automatiquement 12 mots secrets qui constituent votre identifiant unique. Notez-les précieusement sur papier."
    },
    {
      category: 'wallet',
      icon: '📥',
      question: t('faq.importQuestion') || "C'est quoi \"Importer\" ?",
      answer: t('faq.importAnswer') || "Importer permet de restaurer un compte existant en utilisant vos 12 mots secrets. Utile si vous changez d'appareil."
    },
    {
      category: 'wallet',
      icon: '🔐',
      question: t('faq.whyConnectQuestion') || "Pourquoi se connecter ?",
      answer: t('faq.whyConnectAnswer') || "Nécessaire pour interagir avec vos jetons : payer, recevoir et consulter vos soldes."
    },
    {
      category: 'wallet',
      icon: '🔒',
      question: t('faq.safetyQuestion') || "Mes 12 mots sont-ils en sécurité ?",
      answer: t('faq.safetyAnswer') || "Ils sont stockés localement sur votre appareil. Si vous les perdez, l'accès est perdu à jamais."
    },
    {
      category: 'wallet',
      icon: '📱',
      question: t('faq.needAccountQuestion') || "Dois-je créer un compte ?",
      answer: t('faq.needAccountAnswer') || "Non. Il n’y a ni compte, ni email. Vous créez directement votre portefeuille sur votre téléphone."
    },
    {
      category: 'wallet',
      icon: '📵',
      question: t('faq.phoneLostQuestion') || "Que se passe-t-il si je perds mon téléphone ?",
      answer: t('faq.phoneLostAnswer') || "Vous restaurez votre portefeuille sur un autre appareil grâce à vos 12 mots secrets."
    },

    // --- CATÉGORIE : JETONS & ECASH ---
    {
      category: 'tokens',
      icon: '🪙',
      question: t('faq.tokenDefinitionQuestion') || "Qu’est-ce qu’un jeton dans l’application ?",
      answer: t('faq.tokenDefinitionAnswer') || "Un outil d’usage (bon d'achat, ticket, accès). Sa valeur dépend de l’engagement réel du créateur."
    },
    {
      category: 'tokens',
      icon: '❌',
      question: t('faq.tokenCryptoQuestion') || "Un jeton est-il une cryptomonnaie ?",
      answer: t('faq.tokenCryptoAnswer') || "Non. Il fonctionne comme un ticket ou un droit d’accès numérique, utilisable dans un cadre précis."
    },
    {
      category: 'tokens',
      icon: '⚙️',
      question: t('faq.xecDefinitionQuestion') || "À quoi sert le XEC (eCash) ?",
      answer: t('faq.xecDefinitionAnswer') || "Le XEC est l’infrastructure technique. Il sert à sécuriser la blockchain et transporter les jetons."
    },
    {
      category: 'tokens',
      icon: '👀',
      question: t('faq.needXecQuestion') || "Dois-je gérer du XEC pour utiliser des jetons ?",
      answer: t('faq.needXecAnswer') || "Dans la majorité des cas, non. La technologie reste largement invisible pour l'utilisateur final."
    },
    {
      category: 'tokens',
      icon: '⚖️',
      question: t('faq.differenceQuestion') || "Pourquoi distinguer jetons et XEC ?",
      answer: t('faq.differenceAnswer') || "Pour clarifier les usages : les jetons sont locaux et concrets, le XEC est l'outil technique global."
    },
    {
      category: 'tokens',
      icon: '🚫',
      question: t('faq.investmentQuestion') || "Les jetons sont-ils des produits d’investissement ?",
      answer: t('faq.investmentAnswer') || "Non. Ils ne sont pas conçus pour la spéculation ou la recherche de rendement financier."
    },

    // --- CATÉGORIE : CRÉATEURS (PROS/ASSOS) ---
    {
      category: 'creator',
      icon: '🔨',
      question: t('faq.creatorWhoQuestion') || "Qui peut créer un jeton ?",
      answer: t('faq.creatorWhoAnswer') || "Toute structure : producteur, artisan, association, entreprise, collectivité."
    },
    {
      category: 'creator',
      icon: '📈',
      question: t('faq.creatorFundingQuestion') || "Puis-je financer un projet avec des jetons ?",
      answer: t('faq.creatorFundingAnswer') || "Oui, via la pré-vente de votre production pour financer vos besoins sans crédit bancaire."
    },
    {
      category: 'creator',
      icon: '🔁',
      question: t('faq.tokenFeesQuestion') || "Y a-t-il des frais sur les jetons ?",
      answer: t('faq.tokenFeesAnswer') || "L’application ne prend aucune commission sur la création, les paiements ou les messages en jetons."
    },
    {
      category: 'creator',
      icon: '🧾',
      question: t('faq.creatorAccountingQuestion') || "Comment gérer la comptabilité ?",
      answer: t('faq.creatorAccountingAnswer') || "Ils peuvent être traités comme des produits constatés d’avance ou des programmes de fidélité."
    },
    {
      category: 'creator',
      icon: '🪪',
      question: t('faq.creatorProfileQuestion') || "Pourquoi plusieurs niveaux de profil ?",
      answer: t('faq.creatorProfileAnswer') || "Pour adapter la confiance : usage privé, public local ou institutionnel vérifié."
    },

    // --- CATÉGORIE : COLLECTIVITÉS & TERRITOIRES ---
    {
      category: 'public',
      icon: '🏛️',
      question: t('faq.publicWhoQuestion') || "À qui s’adresse cet outil côté collectivités ?",
      answer: t('faq.publicWhoAnswer') || "Aux communes, offices de tourisme, CCAS, tiers-lieux ou projets territoriaux."
    },
    {
      category: 'public',
      icon: '🌍',
      question: t('faq.publicWhyQuestion') || "Pourquoi une collectivité utiliserait-elle des jetons ?",
      answer: t('faq.publicWhyAnswer') || "Pour dynamiser l’économie locale et encourager les comportements vertueux (écologie, culture)."
    },
    {
      category: 'public',
      icon: '🛡️',
      question: t('faq.publicRiskQuestion') || "Y a-t-il un risque financier ?",
      answer: t('faq.publicRiskAnswer') || "Non. Ce ne sont pas des placements. La collectivité définit ses propres règles d'usage."
    },
    {
      category: 'public',
      icon: '📊',
      question: t('faq.publicMetricsQuestion') || "Peut-on suivre l’impact local ?",
      answer: t('faq.publicMetricsAnswer') || "Oui. Les flux permettent d’analyser la dynamique locale sans collecter de données personnelles."
    }
  ];

  // Logique de filtrage par recherche
  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Groupement par catégories pour l'affichage
  const categories = [
    { id: 'wallet', label: 'Portefeuille & Sécurité', icon: '🔐' },
    { id: 'tokens', label: 'Jetons & eCash', icon: '🪙' },
    { id: 'creator', label: 'Espace Créateur', icon: '🔨' },
    { id: 'public', label: 'Collectivités & Territoires', icon: '🏛️' }
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', paddingBottom: '80px' }}>
      <TopBar />

      <div className="faq-content" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 16px' }}>
        
        {/* Header & Search */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '2.2rem', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>
            {t('faq.title') || 'Centre d’aide'}
          </h1>
          
          <div style={{ position: 'relative', maxWidth: '500px', margin: '0 auto' }}>
            <input 
              type="text"
              placeholder="Rechercher une question..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: '12px',
                border: '1px solid var(--border-primary)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '1rem',
                outline: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }}
            />
            <span style={{ position: 'absolute', right: '15px', top: '15px', opacity: 0.5 }}>🔍</span>
          </div>
        </div>

        {/* Affichage par sections */}
        {searchQuery === '' ? (
          categories.map(cat => {
            const catItems = faqs.filter(f => f.category === cat.id);
            return (
              <div key={cat.id} style={{ marginBottom: '40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', paddingLeft: '10px' }}>
                  <span style={{ fontSize: '1.5rem' }}>{cat.icon}</span>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                    {cat.label}
                  </h2>
                </div>
                <FaqSection items={catItems} />
              </div>
            );
          })
        ) : (
          <div style={{ marginBottom: '40px' }}>
            <p style={{ marginBottom: '15px', color: 'var(--text-secondary)' }}>
              {filteredFaqs.length} résultat(s) pour votre recherche
            </p>
            <FaqSection items={filteredFaqs} />
          </div>
        )}

        {/* CTA Section Premium */}
        <div className="faq-cta" style={{
          marginTop: '60px',
          padding: '40px',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '24px',
          textAlign: 'center',
          border: '1px solid var(--border-primary)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🚀</div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '12px', color: 'var(--text-primary)' }}>
            Prêt à passer à l'action ?
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', maxWidth: '450px', margin: '0 auto 32px' }}>
            Que vous soyez citoyen ou porteur de projet, rejoignez l'économie locale dès aujourd'hui.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button onClick={() => navigate('/')} variant="primary" style={{ padding: '12px 30px' }}>
              Parcourir l'annuaire
            </Button>
            <Button onClick={() => navigate('/manage-token')} variant="outline" style={{ padding: '12px 30px' }}>
              Créer mon jeton
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaqPage;
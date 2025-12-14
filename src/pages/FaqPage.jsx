import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import TopBar from '../components/Layout/TopBar';
import { FaqSection } from '../components/Faq';
import { Button } from '../components/UI';

/**
 * FAQ Page - Frequently Asked Questions
 * Public page explaining wallet concepts
 */
const FaqPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const faqs = [
    {
      icon: '✨',
      question: t('faq.generateQuestion') || "C'est quoi \"Générer\" ?",
      answer: t('faq.generateAnswer') || "Générer signifie créer un nouveau compte wallet. Le système génère automatiquement 12 mots secrets (phrase mnémonique) qui constituent votre identifiant unique et votre mot de passe. Ces 12 mots sont la seule clé pour accéder à vos jetons. Notez-les précieusement sur papier et conservez-les en lieu sûr."
    },
    {
      icon: '📥',
      question: t('faq.importQuestion') || "C'est quoi \"Importer\" ?",
      answer: t('faq.importAnswer') || "Importer permet de restaurer un compte existant en utilisant vos 12 mots secrets que vous avez notés lors de la création. Si vous avez déjà un wallet et que vous changez d'appareil, utilisez \"Importer\" avec vos 12 mots pour retrouver l'accès à vos jetons."
    },
    {
      icon: '🔐',
      question: t('faq.whyConnectQuestion') || "Pourquoi se connecter ?",
      answer: t('faq.whyConnectAnswer') || "La connexion (via Générer ou Importer) est nécessaire pour interagir avec vos jetons : acheter des jetons de ferme, payer vos producteurs, recevoir des paiements, et consulter vos soldes. Sans connexion, vous ne pouvez que consulter l'annuaire des fermes."
    },
    {
      icon: '🔒',
      question: t('faq.safetyQuestion') || "Mes 12 mots sont-ils en sécurité ?",
      answer: t('faq.safetyAnswer') || "Vos 12 mots sont stockés localement sur votre appareil. Personne d'autre n'y a accès. Cependant, si vous perdez vos 12 mots ET effacez votre navigateur, vous perdez définitivement l'accès à vos jetons. C'est pourquoi il est crucial de les noter sur papier."
    },
    {
      icon: '💰',
      question: t('faq.costQuestion') || "Y a-t-il des frais ?",
      answer: t('faq.costAnswer') || "Les transactions sur le réseau eCash nécessitent des frais minuscules (moins d'un centime pour 100 transactions). Pour vos achats de jetons de ferme, les conditions sont définies par chaque producteur."
    },
    {
      icon: '✅',
      question: t('faq.verifiedStatusQuestion') || "Que signifient les statuts \"Vérifiée\" et \"Non vérifiée\" ?",
      answer: t('faq.verifiedStatusAnswer') || "Une ferme \"Vérifiée\" a validé son identité (KYC) et confirmé son activité agricole cette année auprès de la plateforme. Une ferme \"Non vérifiée\" est libre mais n'a pas encore fourni ces garanties."
    },
    {
      icon: '🎯',
      question: t('faq.whyKycQuestion') || "Pourquoi une ferme doit valider son identité (KYC) ?",
      answer: t('faq.whyKycAnswer') || "Cela garantit aux utilisateurs que la ferme existe réellement et qu'elle est toujours en activité. Cette vérification est renouvelée chaque année."
    }
  ];

  return (
    <div className="min-h-screen" style={{ 
      backgroundColor: 'var(--bg-primary)',
      paddingBottom: '80px' 
    }}>
      <TopBar />

      <div className="faq-content" style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '24px 16px'
      }}>
        {/* FAQ Section */}
        <FaqSection
          title={t('faq.title') || 'Questions Fréquentes'}
          subtitle={t('faq.subtitle') || 'Tout ce que vous devez savoir pour démarrer'}
          icon="❓"
          items={faqs}
        />

        {/* CTA Section */}
        <div className="faq-cta" style={{
          marginTop: '48px',
          padding: '32px',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '16px',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
        }}>
          <div className="text-4xl mb-3">🚀</div>
          <p className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            {t('faq.ctaText') || 'Prêt à commencer ?'}
          </p>
          <p className="text-sm text-secondary mb-5">
            Découvrez les fermes locales et soutenez vos producteurs
          </p>
          <Button 
            onClick={() => navigate('/')}
            style={{
              padding: '12px 32px',
              fontSize: '1rem',
              backgroundColor: 'var(--accent-primary)',
              color: 'white'
            }}
          >
            {t('faq.ctaButton') || 'Découvrir les fermes'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FaqPage;

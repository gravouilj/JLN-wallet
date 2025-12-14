import { useState } from 'react';
import { Card, CardContent } from './UI';

/**
 * Faq - Composant d'accordion FAQ générique et réutilisable
 * 
 * Conforme au STYLING_GUIDE.md :
 * - Classes utilitaires (d-flex, gap-*, mb-*, p-*, rounded-*, etc.)
 * - Variables CSS pour les couleurs
 * - Animation smooth et accessible
 * 
 * @param {Object} props
 * @param {Array} props.items - Liste des questions/réponses [{question, answer, icon?}]
 * @param {number} props.defaultOpenIndex - Index de l'item ouvert par défaut
 * @param {boolean} props.allowMultiple - Permettre plusieurs items ouverts simultanément
 * @param {string} props.className - Classes CSS additionnelles
 */
const Faq = ({ 
  items = [], 
  defaultOpenIndex = null,
  allowMultiple = false,
  className = '' 
}) => {
  const [openIndexes, setOpenIndexes] = useState(
    defaultOpenIndex !== null ? [defaultOpenIndex] : []
  );

  const toggleItem = (index) => {
    if (allowMultiple) {
      setOpenIndexes(prev => 
        prev.includes(index) 
          ? prev.filter(i => i !== index)
          : [...prev, index]
      );
    } else {
      setOpenIndexes(prev => 
        prev.includes(index) ? [] : [index]
      );
    }
  };

  const isOpen = (index) => openIndexes.includes(index);

  if (!items || items.length === 0) {
    return (
      <div className="empty-state p-6 text-center">
        <div className="text-4xl mb-3">❓</div>
        <p className="text-secondary text-sm">Aucune question disponible</p>
      </div>
    );
  }

  return (
    <div className={`faq-container ${className}`} style={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      {items.map((item, index) => {
        const isItemOpen = isOpen(index);
        
        return (
          <Card 
            key={index}
            className="faq-item"
            style={{
              overflow: 'hidden',
              transition: 'all 0.2s ease',
              border: isItemOpen 
                ? '2px solid var(--accent-primary)' 
                : '1px solid var(--border-primary)'
            }}
          >
            <button
              onClick={() => toggleItem(index)}
              className="faq-question cursor-pointer hover-lift"
              style={{
                width: '100%',
                padding: '16px 20px',
                background: isItemOpen 
                  ? 'var(--bg-secondary)' 
                  : 'var(--bg-primary)',
                border: 'none',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'background-color 0.2s',
                outline: 'none'
              }}
              aria-expanded={isItemOpen}
              aria-controls={`faq-answer-${index}`}
            >
              {/* Icon optionnel */}
              {item.icon && (
                <span className="faq-icon" style={{ 
                  fontSize: '1.5rem',
                  flexShrink: 0 
                }}>
                  {item.icon}
                </span>
              )}
              
              {/* Question */}
              <span className="faq-question-text flex-1 font-medium" style={{
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                lineHeight: '1.5'
              }}>
                {item.question}
              </span>
              
              {/* Toggle indicator */}
              <span 
                className="faq-toggle-icon"
                style={{
                  fontSize: '1.3rem',
                  color: 'var(--accent-primary)',
                  transform: isItemOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease',
                  flexShrink: 0,
                  lineHeight: 1
                }}
              >
                ▼
              </span>
            </button>

            {/* Answer - avec animation */}
            <div
              id={`faq-answer-${index}`}
              className="faq-answer"
              style={{
                maxHeight: isItemOpen ? '500px' : '0',
                opacity: isItemOpen ? 1 : 0,
                overflow: 'hidden',
                transition: 'max-height 0.3s ease, opacity 0.3s ease, padding 0.3s ease',
                padding: isItemOpen ? '0 20px 20px 20px' : '0 20px'
              }}
              role="region"
              aria-labelledby={`faq-question-${index}`}
            >
              <div style={{
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
                lineHeight: '1.7',
                paddingTop: isItemOpen ? '12px' : '0',
                borderTop: isItemOpen ? '1px solid var(--border-primary)' : 'none',
                transition: 'padding-top 0.3s ease'
              }}>
                {typeof item.answer === 'string' ? (
                  <p style={{ margin: 0 }}>{item.answer}</p>
                ) : (
                  item.answer
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

/**
 * FaqSection - Section FAQ avec titre et sous-titre
 * Wrapper pratique pour afficher une section FAQ complète
 */
export const FaqSection = ({ 
  title = 'Questions Fréquentes',
  subtitle = null,
  icon = '❓',
  items = [],
  ...faqProps 
}) => {
  return (
    <div className="faq-section">
      {/* Header */}
      {(title || subtitle) && (
        <div className="section-header mb-5" style={{ textAlign: 'center' }}>
          {icon && (
            <div className="section-icon text-5xl mb-3">
              {icon}
            </div>
          )}
          {title && (
            <h2 className="section-title text-2xl font-bold mb-2 text-primary">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="section-subtitle text-secondary text-sm">
              {subtitle}
            </p>
          )}
        </div>
      )}
      
      {/* FAQ Items */}
      <Faq items={items} {...faqProps} />
    </div>
  );
};

export default Faq;

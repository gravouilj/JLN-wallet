import React, { useState } from 'react';
import { Card } from './UI';

/**
 * Faq - Composant d'accordéon FAQ moderne
 */

export interface FaqItem {
  question: string;
  answer: React.ReactNode | string;
  icon?: string;
}

interface FaqProps {
  items?: FaqItem[];
  defaultOpenIndex?: number | null;
  allowMultiple?: boolean;
  className?: string;
}

const Faq: React.FC<FaqProps> = ({ 
  items = [], 
  defaultOpenIndex = null,
  allowMultiple = false,
  className = '' 
}) => {
  const [openIndexes, setOpenIndexes] = useState<number[]>(
    defaultOpenIndex !== null ? [defaultOpenIndex] : []
  );

  const toggleItem = (index: number): void => {
    if (allowMultiple) {
      setOpenIndexes((prev: number[]) => 
        prev.includes(index) ? prev.filter((i: number) => i !== index) : [...prev, index]
      );
    } else {
      setOpenIndexes((prev: number[]) => prev.includes(index) ? [] : [index]);
    }
  };

  const isOpen = (index: number): boolean => openIndexes.includes(index);

  if (!items || items.length === 0) {
    return (
      <div className="empty-state p-8 text-center bg-secondary rounded-lg border-dashed">
        <div className="text-4xl mb-3 opacity-50">🔍</div>
        <p className="text-secondary text-sm">Aucun résultat ne correspond à votre recherche.</p>
      </div>
    );
  }

  return (
    <div className={`faq-container ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {items.map((item, index) => {
        const isItemOpen = isOpen(index);
        
        return (
          <Card 
            key={index}
            className={`faq-item ${isItemOpen ? 'faq-item-open' : ''}`}
            style={{
              overflow: 'hidden',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              border: isItemOpen 
                ? '1px solid var(--accent-primary)' 
                : '1px solid var(--border-primary)',
              boxShadow: isItemOpen ? '0 4px 20px rgba(0,0,0,0.08)' : 'none',
              backgroundColor: 'var(--bg-primary)'
            }}
          >
            <button
              onClick={() => toggleItem(index)}
              className="faq-question cursor-pointer"
              style={{
                width: '100%',
                padding: '18px 24px',
                background: isItemOpen ? 'var(--bg-secondary)' : 'transparent',
                border: 'none',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                transition: 'background-color 0.2s',
                outline: 'none'
              }}
              aria-expanded={isItemOpen}
            >
              {item.icon && (
                <span className="faq-icon" style={{ fontSize: '1.4rem', flexShrink: 0 }}>
                  {item.icon}
                </span>
              )}
              
              <span className="faq-question-text flex-1 font-bold" style={{
                color: isItemOpen ? 'var(--accent-primary)' : 'var(--text-primary)',
                fontSize: '1rem',
                lineHeight: '1.4'
              }}>
                {item.question}
              </span>
              
              <span style={{
                fontSize: '0.8rem',
                color: 'var(--accent-primary)',
                transform: isItemOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                opacity: 0.7
              }}>
                ▼
              </span>
            </button>

            {/* Animation de hauteur fluide via CSS Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateRows: isItemOpen ? '1fr' : '0fr',
                transition: 'grid-template-rows 0.3s ease-out',
              }}
            >
              <div style={{ overflow: 'hidden' }}>
                <div style={{
                  padding: '0 24px 24px 24px',
                  color: 'var(--text-secondary)',
                  fontSize: '0.95rem',
                  lineHeight: '1.6',
                  borderTop: '1px solid var(--border-primary)',
                  marginTop: '0'
                }}>
                  <div style={{ paddingTop: '16px' }}>
                    {typeof item.answer === 'string' ? <p style={{ margin: 0 }}>{item.answer}</p> : item.answer}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

/**
 * FaqSection - Wrapper thématique
 */
interface FaqSectionProps extends Omit<FaqProps, 'items'> {
  title?: string;
  subtitle?: string;
  icon?: string;
  items?: FaqItem[];
}

export const FaqSection: React.FC<FaqSectionProps> = ({ 
  title,
  subtitle,
  icon,
  items = [],
  ...faqProps 
}) => {
  return (
    <div className="faq-section mb-10">
      {/* Header - Affiché uniquement si un titre est passé */}
      {(title || subtitle) && (
        <div className="section-header mb-6" style={{ paddingLeft: '8px' }}>
          <div className="d-flex align-center gap-3 mb-2">
            {icon && <span className="text-2xl">{icon}</span>}
            {title && (
              <h2 className="text-xl font-bold text-primary" style={{ margin: 0 }}>
                {title}
              </h2>
            )}
          </div>
          {subtitle && (
            <p className="text-secondary text-sm">
              {subtitle}
            </p>
          )}
        </div>
      )}
      
      <Faq items={items} {...faqProps} />
    </div>
  );
};

export default Faq;
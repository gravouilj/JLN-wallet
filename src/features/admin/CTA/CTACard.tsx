import React, { MouseEvent } from 'react';
import { useNavigate, NavigateFunction } from 'react-router-dom';
import { Badge } from '../../../components/UI';
import { useTranslation } from '../../../hooks/useTranslation';

// Types
interface TranslationFunction {
  (key: string): string;
}

interface CTAContent {
  name: string;
  location_region: string;
  description: string;
  rewards?: string;
  products?: string[];
  buttonText: string;
}

interface CTAConfig {
  icon: string;
  type: 'start' | 'other';
  gradient: string;
  getContent: (t: TranslationFunction) => CTAContent;
  onClick: (navigate: NavigateFunction) => void;
}

interface CTACardProps {
  cta?: unknown;
  ctaConfig: CTAConfig;
}

/**
 * CTACard - Composant dédié pour les Call-To-Action dans l'annuaire
 * Affiche une carte stylisée avec gradient pour inciter à l'action
 */
const CTACard: React.FC<CTACardProps> = ({ cta, ctaConfig }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const content = ctaConfig.getContent(t);
  
  const handleClick = (e: MouseEvent<HTMLDivElement | HTMLButtonElement>): void => {
    e.stopPropagation();
    ctaConfig.onClick(navigate);
  };
  
  return (
    <div 
      style={{
        background: ctaConfig.gradient,
        borderRadius: '16px',
        border: 'none',
        boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s',
        position: 'relative'
      }}
      onClick={handleClick}
      onMouseEnter={(e: MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(102, 126, 234, 0.4)';
        e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
      }}
      onMouseLeave={(e: MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.3)';
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
      }}
    >
      <div style={{ padding: '20px' }}>
        {/* Icône animée */}
        <div style={{ 
          fontSize: '3rem', 
          textAlign: 'center', 
          marginBottom: '12px',
          animation: 'bounce 2s ease-in-out infinite'
        }}>
          {ctaConfig.icon}
        </div>
        
        {/* Titre */}
        <h3 style={{ 
          fontSize: '1.25rem', 
          fontWeight: '700', 
          color: '#fff',
          margin: 0,
          textAlign: 'center',
          marginBottom: '12px'
        }}>
          {content.name}
        </h3>
        
        {/* Localisation */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          marginBottom: '12px', 
          justifyContent: 'center' 
        }}>
          <span style={{ 
            fontSize: '0.875rem', 
            color: 'rgba(255,255,255,0.95)',
            fontWeight: '500'
          }}>
            📍 {content.location_region}
          </span>
        </div>
        
        {/* Description */}
        <p style={{ 
          fontSize: '0.875rem', 
          color: 'rgba(255,255,255,0.9)', 
          lineHeight: '1.5',
          marginBottom: '12px',
          textAlign: 'center'
        }}>
          {content.description}
        </p>
        
        {/* Rewards/Benefits Banner */}
        {content.rewards && (
          <div style={{
            padding: '10px 16px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '0.75rem',
            fontWeight: '600',
            marginBottom: '16px',
            textAlign: 'center',
            backdropFilter: 'blur(10px)'
          }}>
            {content.rewards}
          </div>
        )}
        
        {/* Tags produits */}
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '6px', 
          marginBottom: '16px', 
          justifyContent: 'center' 
        }}>
          {content.products?.map((product: string, idx: number) => (
            <Badge 
              key={`p-${idx}`} 
              variant="neutral"
              style={{ 
                backgroundColor: 'rgba(255,255,255,0.2)', 
                color: '#fff', 
                border: '1px solid rgba(255,255,255,0.3)' 
              }}
            >
              {product}
            </Badge>
          ))}
        </div>
        
        {/* Bouton CTA */}
        <button
          onClick={handleClick}
          style={{
            padding: '14px 24px',
            backgroundColor: 'rgba(255,255,255,0.95)',
            color: ctaConfig.type === 'start' ? '#667eea' : '#f5576c',
            border: 'none',
            borderRadius: '10px',
            fontWeight: '700',
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            width: '100%',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}
          onMouseEnter={(e: MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.25)';
          }}
          onMouseLeave={(e: MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
          }}
        >
          {content.buttonText} {ctaConfig.icon}
        </button>
      </div>
    </div>
  );
};

export default CTACard;

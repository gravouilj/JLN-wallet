import React from 'react';
import './ImmersionComponents.css';

interface TokenHeroSectionProps {
  name: string;
  description?: string;
  image?: string;
  verified?: boolean;
  ticker?: string;
}

export const TokenHeroSection: React.FC<TokenHeroSectionProps> = ({
  name,
  description,
  image,
  verified,
  ticker
}) => {
  if (!description && !image) return null;

  return (
    <div className="immersion-hero">
      <div className="immersion-hero-header">
        {image && (
          <img
            src={image}
            alt={name}
            className="immersion-hero-image"
          />
        )}
        <div className="immersion-hero-content">
          <div className="immersion-hero-title-row">
            <h2 className="immersion-hero-title">
              {name}
            </h2>
            {verified && (
              <span className="immersion-verified-badge" title="Profil vérifié">✓</span>
            )}
          </div>
          {ticker && (
            <div className="immersion-ticker-badge">
              {ticker}
            </div>
          )}
        </div>
      </div>

      {description && (
        <p className="immersion-hero-description">
          {description}
        </p>
      )}
    </div>
  );
};

interface TokenPurposeCardProps {
  purpose?: string;
  counterpart?: string;
}

export const TokenPurposeCard: React.FC<TokenPurposeCardProps> = ({ purpose, counterpart }) => {
  if (!purpose && !counterpart) return null;

  return (
    <div className="immersion-card">
      {purpose && (
        <div className={counterpart ? 'mb-4' : ''}>
          <div className="immersion-card-label">
            <span>🎯</span>
            <span>Utilité du jeton</span>
          </div>
          <p className="immersion-card-text">
            {purpose}
          </p>
        </div>
      )}

      {counterpart && (
        <div>
          <div className="immersion-card-label">
            <span>🤝</span>
            <span>Contrepartie offerte</span>
          </div>
          <p className="immersion-card-text">
            {counterpart}
          </p>
        </div>
      )}
    </div>
  );
};

interface CreatorSocialLinksProps {
  socials?: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    whatsapp?: string;
    telegram?: string;
  };
}

export const CreatorSocialLinks: React.FC<CreatorSocialLinksProps> = ({ socials }) => {
  if (!socials) return null;

  const socialLinks = [
    { key: 'facebook', icon: '📘', label: 'Facebook', url: socials.facebook },
    { key: 'instagram', icon: '📷', label: 'Instagram', url: socials.instagram },
    { key: 'tiktok', icon: '🎵', label: 'TikTok', url: socials.tiktok },
    { key: 'youtube', icon: '📺', label: 'YouTube', url: socials.youtube },
    { key: 'whatsapp', icon: '💬', label: 'WhatsApp', url: socials.whatsapp },
    { key: 'telegram', icon: '✈️', label: 'Telegram', url: socials.telegram }
  ].filter(social => social.url && social.url.trim().length > 0);

  if (socialLinks.length === 0) return null;

  return (
    <div className="immersion-card">
      <div className="immersion-card-label">
        <span>🌐</span>
        <span>Réseaux sociaux</span>
      </div>

      <div className="immersion-social-grid">
        {socialLinks.map(social => (
          <a
            key={social.key}
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            className="immersion-social-link"
          >
            <span className="immersion-social-icon">{social.icon}</span>
            <span>{social.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
};

interface CreatorContactCardProps {
  country?: string;
  region?: string;
  city?: string;
  website?: string;
  email?: string;
  phone?: string;
}

export const CreatorContactCard: React.FC<CreatorContactCardProps> = ({
  country,
  region,
  city,
  website,
  email,
  phone
}) => {
  const hasLocation = country || region || city;
  const hasContact = website || email || phone;

  if (!hasLocation && !hasContact) return null;

  return (
    <div className="immersion-card">
      <div className="immersion-card-label">
        <span>📍</span>
        <span>Contact & Localisation</span>
      </div>

      <div>
        {hasLocation && (
          <div className="immersion-contact-row">
            <span className="immersion-contact-icon">🗺️</span>
            <span className="immersion-contact-text">
              {[city, region, country].filter(Boolean).join(', ')}
            </span>
          </div>
        )}

        {website && (
          <div className="immersion-contact-row">
            <span className="immersion-contact-icon">🌐</span>
            <a
              href={website.startsWith('http') ? website : `https://${website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="immersion-contact-link"
            >
              {website}
            </a>
          </div>
        )}

        {email && (
          <div className="immersion-contact-row">
            <span className="immersion-contact-icon">✉️</span>
            <a href={`mailto:${email}`} className="immersion-contact-link">
              {email}
            </a>
          </div>
        )}

        {phone && (
          <div className="immersion-contact-row">
            <span className="immersion-contact-icon">📞</span>
            <a href={`tel:${phone}`} className="immersion-contact-link">
              {phone}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

// Creator Actions Component (for creator's own tokens)
interface CreatorActionsProps {
  tokenId: string;
  onNavigateToTokenPage: () => void;
}

export const CreatorActions: React.FC<CreatorActionsProps> = ({ tokenId, onNavigateToTokenPage }) => {
  return (
    <div className="immersion-creator-actions">
      <div className="immersion-creator-badge">
        <span>👑</span>
        <span>Vous êtes le créateur de ce jeton</span>
      </div>
      
      <div className="immersion-actions-grid">
        <button
          onClick={onNavigateToTokenPage}
          className="immersion-action-btn"
        >
          <span className="immersion-action-icon">🕹️</span>
          <span>Control Room</span>
        </button>
      </div>
      
      <p style={{ 
        fontSize: '12px', 
        color: 'var(--text-secondary)', 
        margin: '12px 0 0 0',
        textAlign: 'center'
      }}>
        Accédez à la Control Room pour gérer ce jeton (Mint, Burn, Airdrop, Messages)
      </p>
    </div>
  );
};

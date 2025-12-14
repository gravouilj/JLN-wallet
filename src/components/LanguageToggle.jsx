import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import i18n from '../i18n';

const LanguageToggle = () => {
  const { locale } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Fermer le menu en cliquant en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Drapeaux pour chaque langue
  const flags = {
    en: '🇬🇧',
    fr: '🇫🇷'
  };

  const languages = [
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'en', label: 'English', flag: '🇬🇧' }
  ];

  const handleLanguageChange = (langCode) => {
    // Change la langue via i18n
    i18n.changeLanguage(langCode);
    setIsOpen(false);
  };

  // Trouver la langue active pour afficher le bon drapeau
  const currentLanguage = languages.find(lang => lang.code === locale) || languages[0];

  return (
    <div className="language-toggle-container" ref={menuRef}>
      {/* Bouton drapeau */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="language-flag-button"
        type="button"
        title={`Langue: ${currentLanguage.label}`}
        aria-label={`Changer la langue. Actuelle: ${currentLanguage.label}`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        {currentLanguage.flag}
      </button>

      {/* Menu déroulant */}
      {isOpen && (
        <div className="language-dropdown-menu" role="menu">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`language-option ${locale === lang.code ? 'active' : ''}`}
              role="menuitem"
              title={`Sélectionner ${lang.label}`}
            >
              <span className="option-flag">{lang.flag}</span>
              <span className="option-label">{lang.label}</span>
              {locale === lang.code && <span className="option-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageToggle;

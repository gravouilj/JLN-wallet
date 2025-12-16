import React from 'react';

/**
 * PageLayout - Wrapper standard pour les pages
 * Gère le padding pour la BottomNavigation
 */
export const PageLayout = ({ children, hasBottomNav = false, className = '' }) => {
  return (
    <div 
      className={`page-layout ${className}`}
      style={{
        paddingBottom: hasBottomNav ? '80px' : '20px', // Espace pour la nav
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary, #f8fafc)'
      }}
    >
      {children}
    </div>
  );
};

// --- CONTENEURS DE BASE ---

export const Card = ({ children, className = '', style = {} }) => (
  <div 
    className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden ${className}`}
    style={{ ...style }}
  >
    {children}
  </div>
);

export const CardContent = ({ children, className = '', noPadding = false }) => (
  <div className={`card-content ${className}`} style={{ padding: noPadding ? '0' : '24px' }}>
    {children}
  </div>
);

export const Stack = ({ children, spacing = 'md', className = '' }) => {
  const gap = spacing === 'sm' ? '0.5rem' : spacing === 'lg' ? '1.5rem' : '1rem';
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap }}>
      {children}
    </div>
  );
};

// --- FORMULAIRES (Inputs & Boutons) ---

export const Input = ({ className = '', label, rightIcon, actionButton, helperText, ...props }) => (
  <div className={`w-full ${className}`} style={{ marginBottom: '16px' }}>
    {label && (
      <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>
        {label}
      </label>
    )}
    <div style={{ position: 'relative' }}>
      <input 
        style={{
          width: '100%',
          padding: '0 16px', // Padding horizontal propre
          height: '50px',    // Hauteur fixe standardisée
          fontSize: '1rem',
          border: '1px solid var(--border-color, #e5e7eb)',
          borderRadius: '12px',
          backgroundColor: 'var(--bg-input, #fff)',
          color: 'var(--text-primary)',
          boxSizing: 'border-box',
          outline: 'none',
          transition: 'border-color 0.2s',
          paddingRight: actionButton ? '60px' : (rightIcon ? '40px' : '16px') // Espace pour l'action
        }}
        onFocus={(e) => e.target.style.borderColor = 'var(--primary-color, #0074e4)'}
        onBlur={(e) => e.target.style.borderColor = 'var(--border-color, #e5e7eb)'}
        {...props} 
      />
      
      {/* Bouton d'action (MAX) - Style Texte simple cliquable */}
      {actionButton && (
        <button
          type="button"
          onClick={actionButton.onClick}
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: 'var(--primary-color, #0074e4)',
            fontWeight: '700',
            fontSize: '0.85rem',
            cursor: 'pointer',
            padding: '4px 8px',
            zIndex: 10
          }}
        >
          {actionButton.label}
        </button>
      )}
    </div>
    {helperText && (
      <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '6px', marginLeft: '2px' }}>
        {helperText}
      </p>
    )}
  </div>
);

/**
 * Button - Bouton standardisé (Hauteur garantie)
 */
export const Button = ({ children, className = '', variant = 'primary', icon, fullWidth = false, ...props }) => {
  // Variantes de couleurs
  const styles = {
    primary: { bg: '#0074e4', text: '#fff', border: 'none' },
    secondary: { bg: '#64748b', text: '#fff', border: 'none' },
    danger: { bg: '#ef4444', text: '#fff', border: 'none' },
    outline: { bg: 'transparent', text: '#1e293b', border: '1px solid #e2e8f0' },
    ghost: { bg: 'transparent', text: '#0074e4', border: 'none' }
  };

  const currentStyle = styles[variant] || styles.primary;

  return (
    <button 
      className={className} 
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '0 24px',
        minHeight: '56px',
        borderRadius: '12px',
        fontSize: '1rem',
        fontWeight: '600',
        width: fullWidth ? '100%' : 'auto',
        backgroundColor: currentStyle.bg,
        color: currentStyle.text,
        border: currentStyle.border,
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        opacity: props.disabled ? 0.6 : 1,
        transition: 'all 0.2s ease',
        ...props.style
      }} 
      {...props}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
};

export const Label = ({ children, className = '', htmlFor = '', ...props }) => (
  <label 
    htmlFor={htmlFor}
    className={className}
    style={{
      display: 'block',
      fontSize: '0.9rem',
      fontWeight: '600',
      color: 'var(--text-primary)',
      marginBottom: '8px'
    }}
    {...props}
  >
    {children}
  </label>
);

export const Checkbox = ({ className = '', label = '', ...props }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
    <input 
      type="checkbox"
      className={className}
      style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer', accentColor: 'var(--primary-color, #0074e4)' }}
      {...props} 
    />
    {label && <span>{label}</span>}
  </label>
);

export const Select = ({ className = '', label = '', options = [], ...props }) => (
  <div className={className} style={{ marginBottom: '16px' }}>
    {label && <Label>{label}</Label>}
    <select 
      style={{
        width: '100%',
        padding: '0 16px',
        height: '50px',
        fontSize: '1rem',
        border: '1px solid var(--border-color, #e5e7eb)',
        borderRadius: '12px',
        backgroundColor: 'var(--bg-input, #fff)',
        color: 'var(--text-primary)',
        cursor: 'pointer',
        outline: 'none'
      }}
      {...props}
    >
      {options.map((opt, idx) => (
        <option key={idx} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

export const Textarea = ({ className = '', label = '', ...props }) => (
  <div className={className} style={{ marginBottom: '16px' }}>
    {label && <Label>{label}</Label>}
    <textarea 
      style={{
        width: '100%',
        padding: '16px',
        fontSize: '1rem',
        border: '1px solid var(--border-color, #e5e7eb)',
        borderRadius: '12px',
        backgroundColor: 'var(--bg-input, #fff)',
        color: 'var(--text-primary)',
        resize: 'vertical',
        minHeight: '100px',
        outline: 'none',
        fontFamily: 'inherit'
      }}
      onFocus={(e) => e.target.style.borderColor = 'var(--primary-color, #0074e4)'}
      onBlur={(e) => e.target.style.borderColor = 'var(--border-color, #e5e7eb)'}
      {...props} 
    />
  </div>
);

// --- COMPOSANTS UI AVANCÉS ---

export const Badge = ({ children, variant = 'neutral', className = '' }) => {
  const colors = {
    primary: { bg: '#dbeafe', text: '#1e40af' },
    success: { bg: '#dcfce7', text: '#166534' },
    warning: { bg: '#fef9c3', text: '#854d0e' },
    danger: { bg: '#fee2e2', text: '#991b1b' },
    neutral: { bg: '#f3f4f6', text: '#374151' },
    info: { bg: '#e0f2fe', text: '#075985' }
  };
  const style = colors[variant] || colors.neutral;

  return (
    <span className={className} style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: '600',
      backgroundColor: style.bg,
      color: style.text,
      whiteSpace: 'nowrap'
    }}>
      {children}
    </span>
  );
};

/**
 * Tabs - Interface à onglets (Style unifié sans scrollbar visible)
 */
export const Tabs = ({ tabs, activeTab, onChange, className = '' }) => (
  <div 
    className={`tabs-container ${className}`}
    style={{ 
      display: 'flex', 
      width: '100%', 
      borderBottom: '1px solid #e5e7eb',
      overflowX: 'auto',        
      scrollbarWidth: 'none',   /* Firefox */
      msOverflowStyle: 'none'   /* IE/Edge */
    }}
  >
    <style>{`
      .tabs-container::-webkit-scrollbar { display: none; }
    `}</style>
    {tabs.map((tab) => (
      <button
        type="button"
        key={tab.id}
        onClick={() => onChange(tab.id)}
        style={{
          flex: 1,                 
          whiteSpace: 'nowrap',
          padding: '14px 16px',
          textAlign: 'center',
          fontSize: '0.9rem',
          fontWeight: activeTab === tab.id ? '600' : '500',
          color: activeTab === tab.id ? '#0074e4' : '#64748b',
          borderBottom: activeTab === tab.id ? '3px solid #0074e4' : '3px solid transparent',
          background: activeTab === tab.id ? '#fff' : 'transparent',
          cursor: 'pointer',
          borderTop: 'none',
          borderLeft: 'none',
          borderRight: 'none',
          marginBottom: '-1px'
        }}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

export const Switch = ({ checked, onChange, disabled = false, className = '' }) => (
  <label className={className} style={{
    position: 'relative',
    display: 'inline-block',
    width: '52px',
    height: '28px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1
  }}>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => !disabled && onChange(e.target.checked)}
      disabled={disabled}
      style={{ opacity: 0, width: 0, height: 0 }}
    />
    <span style={{
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: checked ? 'var(--primary-color, #0074e4)' : '#e5e7eb',
      borderRadius: '28px',
      transition: 'background-color 0.3s',
    }}>
      <span style={{
        position: 'absolute',
        content: '""',
        height: '20px',
        width: '20px',
        left: checked ? '28px' : '4px',
        bottom: '4px',
        backgroundColor: 'white',
        borderRadius: '50%',
        transition: 'left 0.3s',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }} />
    </span>
  </label>
);

export const VisibilityToggle = ({ isVisible, onChange, labelVisible = "Visible", labelHidden = "Masqué", disabled = false }) => (
  <div 
    onClick={() => !disabled && onChange(!isVisible)}
    style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '8px', 
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      padding: '4px 8px',
      borderRadius: '8px',
      backgroundColor: isVisible ? '#dcfce7' : '#f3f4f6', // Vert clair / Gris
      border: `1px solid ${isVisible ? '#86efac' : '#e5e7eb'}`,
      transition: 'all 0.2s'
    }}
  >
    <div style={{
      width: '36px', height: '20px', backgroundColor: isVisible ? '#16a34a' : '#cbd5e1',
      borderRadius: '20px', position: 'relative', transition: 'background-color 0.2s'
    }}>
      <div style={{
        width: '16px', height: '16px', backgroundColor: 'white', borderRadius: '50%',
        position: 'absolute', top: '2px', left: isVisible ? '18px' : '2px', transition: 'left 0.2s',
        boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
      }} />
    </div>
    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: isVisible ? '#15803d' : '#64748b' }}>
      {isVisible ? `👁️ ${labelVisible}` : `🙈 ${labelHidden}`}
    </span>
  </div>
);

export const Modal = ({ children, isOpen = false, onClose, className = '' }) => {
  if (!isOpen) return null;
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem',
      backdropFilter: 'blur(2px)'
    }} onClick={onClose}>
      <div className={className} style={{
        background: 'var(--bg-primary, #fff)',
        borderRadius: '16px',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
      }} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

Modal.Header = ({ children }) => (
  <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', fontSize: '1.25rem', fontWeight: 'bold' }}>{children}</div>
);
Modal.Body = ({ children }) => <div style={{ padding: '1.5rem' }}>{children}</div>;
Modal.Footer = ({ children }) => (
  <div style={{ padding: '1.5rem', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>{children}</div>
);

export const PageHeader = ({ icon = '', title = '', subtitle = '' }) => (
  <div style={{ padding: '1.5rem', background: 'var(--bg-secondary, #f8fafc)', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{icon}</div>
    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>{title}</h1>
    {subtitle && <p style={{ margin: '0.5rem 0 0 0', color: '#64748b' }}>{subtitle}</p>}
  </div>
);

export const BalanceCard = ({ leftContent, rightContent, onRightClick }) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: '1fr 1px 1fr',
    gap: '1rem',
    padding: '1.5rem',
    background: 'linear-gradient(to bottom right, #ffffff, #f8fafc)',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    marginBottom: '20px'
  }}>
    <div>
      <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>{leftContent.subtitle}</div>
      <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{leftContent.label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color, #0074e4)' }}>{leftContent.value}</div>
    </div>
    <div style={{ backgroundColor: '#e2e8f0' }} />
    <div onClick={onRightClick} style={{ cursor: onRightClick ? 'pointer' : 'default', textAlign: 'right' }}>
      <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>{rightContent.subtitle}</div>
      <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{rightContent.label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color, #0074e4)' }}>{rightContent.value}</div>
      {rightContent.conversion && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>≈ {rightContent.conversion.toFixed(2)}</div>}
    </div>
  </div>
);

// --- COMPOSANTS PHASE 1.1 : ALERTS & MESSAGES ---

/**
 * InfoBox - Alerts/Notifications contextuelles
 * @param {string} type - Type: 'info', 'success', 'warning', 'error'
 * @param {string} title - Titre optionnel
 * @param {node} children - Contenu
 * @param {string} icon - Icône custom optionnelle
 * @param {function} onDismiss - Callback pour fermer
 */
export const InfoBox = ({ type = 'info', title, children, icon, onDismiss, className = '' }) => {
  const styles = {
    info: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', icon: 'ℹ️' },
    success: { bg: '#dcfce7', border: '#16a34a', text: '#166534', icon: '✅' },
    warning: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', icon: '⚠️' },
    error: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b', icon: '❌' }
  };
  const style = styles[type] || styles.info;
  
  return (
    <div 
      className={className}
      style={{
        padding: '1rem',
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
        borderLeft: `4px solid ${style.border}`,
        borderRadius: '8px',
        color: style.text,
        marginBottom: '1rem'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
        <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{icon || style.icon}</span>
        <div style={{ flex: 1 }}>
          {title && <p style={{ fontWeight: '600', marginBottom: '0.5rem', margin: 0 }}>{title}</p>}
          <div style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>{children}</div>
        </div>
        {onDismiss && (
          <button 
            onClick={onDismiss} 
            style={{ 
              border: 'none', 
              background: 'none', 
              cursor: 'pointer', 
              fontSize: '1.5rem', 
              color: style.text,
              opacity: 0.7,
              padding: '0 0.25rem',
              lineHeight: 1,
              flexShrink: 0
            }}
            aria-label="Fermer"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * StatusBadge - Badges de statut standardisés avec couleurs sémantiques
 * @param {string} status - Statut à afficher
 * @param {string} type - Type de statut: 'verification', 'profil', 'report'
 */
export const StatusBadge = ({ status, type = 'verification', className = '' }) => {
  const verificationStyles = {
    none: { bg: '#f3f4f6', text: '#6b7280', label: '📋 Aucun badge' },
    pending: { bg: '#fef3c7', text: '#92400e', label: '⏳ En attente' },
    info_requested: { bg: '#dbeafe', text: '#1e40af', label: '💬 Info demandée' },
    verified: { bg: '#dcfce7', text: '#166534', label: '✅ Vérifié' },
    rejected: { bg: '#fee2e2', text: '#991b1b', label: '🚫 Refusé' }
  };
  
  const profilStatusStyles = {
    draft: { bg: '#f3f4f6', text: '#6b7280', label: '📝 Brouillon' },
    active: { bg: '#dcfce7', text: '#166534', label: '✅ Public' },
    suspended: { bg: '#fef3c7', text: '#92400e', label: '⏸️ Suspendu' },
    banned: { bg: '#fee2e2', text: '#991b1b', label: '🛑 Banni' },
    deleted: { bg: '#fee2e2', text: '#991b1b', label: '🗑️ Supprimé' }
  };
  
  const reportStatusStyles = {
    pending: { bg: '#fef3c7', text: '#92400e', label: '⏳ En attente' },
    investigating: { bg: '#dbeafe', text: '#1e40af', label: '🔍 En examen' },
    resolved: { bg: '#dcfce7', text: '#166534', label: '✅ Résolu' },
    ignored: { bg: '#f3f4f6', text: '#6b7280', label: '⏭️ Ignoré' }
  };
  
  const styles = type === 'verification' ? verificationStyles : 
                 type === 'farm' ? farmStatusStyles : reportStatusStyles;
  
  const style = styles[status] || { bg: '#f3f4f6', text: '#6b7280', label: status };
  
  return (
    <Badge 
      className={className}
      style={{ 
        backgroundColor: style.bg, 
        color: style.text 
      }}
    >
      {style.label}
    </Badge>
  );
};

/**
 * MessageThread - Affichage d'un historique de messages
 * @param {array} messages - Tableau de messages avec { author, message, timestamp }
 * @param {boolean} loading - État de chargement
 * @param {string} emptyMessage - Message si aucun message
 */
export const MessageThread = ({ messages = [], loading = false, emptyMessage = 'Aucun message', className = '' }) => {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
        <p>Chargement des messages...</p>
      </div>
    );
  }
  
  if (!messages || messages.length === 0) {
    return (
      <InfoBox type="info">
        {emptyMessage}
      </InfoBox>
    );
  }
  
  return (
    <div 
      className={className}
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1rem', 
        maxHeight: '400px', 
        overflowY: 'auto',
        padding: '0.5rem'
      }}
    >
      {messages.map((msg, idx) => (
        <div 
          key={idx} 
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: msg.author === 'admin' ? 'flex-end' : 
                       msg.author === 'system' ? 'center' : 'flex-start'
          }}
        >
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: '12px',
            maxWidth: '85%',
            backgroundColor: msg.author === 'admin' ? '#3b82f6' : 
                             msg.author === 'system' ? '#f3f4f6' : '#fff',
            color: msg.author === 'admin' ? '#fff' : '#1f2937',
            border: msg.author === 'admin' ? 'none' : '1px solid #e5e7eb',
            fontStyle: msg.author === 'system' ? 'italic' : 'normal',
            fontSize: '0.95rem',
            lineHeight: '1.5',
            wordBreak: 'break-word'
          }}>
            {msg.message}
          </div>
          <span style={{ 
            fontSize: '0.7rem', 
            color: '#9ca3af', 
            marginTop: '0.25rem',
            fontStyle: 'italic'
          }}>
            {new Date(msg.timestamp).toLocaleString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>
      ))}
    </div>
  );
};

/**
 * ActionBar - Barre d'actions contextuelles avec boutons
 * @param {string} title - Titre de la section
 * @param {node} children - Boutons d'action
 * @param {string} variant - Style: 'default', 'primary', 'danger'
 */
export const ActionBar = ({ title, children, variant = 'default', className = '' }) => {
  const styles = {
    default: { bg: '#f9fafb', border: '#e5e7eb' },
    primary: { bg: '#eff6ff', border: '#3b82f6' },
    danger: { bg: '#fef2f2', border: '#ef4444' },
    success: { bg: '#f0fdf4', border: '#16a34a' }
  };
  const style = styles[variant] || styles.default;
  
  return (
    <div 
      className={className}
      style={{
        padding: '1rem',
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: '12px',
        marginTop: '1rem'
      }}
    >
      {title && (
        <p style={{ 
          fontSize: '0.75rem', 
          fontWeight: '700', 
          color: '#6b7280', 
          textTransform: 'uppercase', 
          letterSpacing: '0.05em',
          marginBottom: '0.75rem',
          margin: '0 0 0.75rem 0'
        }}>
          {title}
        </p>
      )}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {children}
      </div>
    </div>
  );
};

/**
 * Accordion - Section pliable/dépliable (remplace <details>)
 * @param {string} title - Titre de la section
 * @param {node} badge - Badge optionnel (compteur, etc.)
 * @param {node} children - Contenu
 * @param {boolean} defaultOpen - Ouvert par défaut
 * @param {string} variant - Style: 'default', 'success', 'warning', 'danger'
 */
export const Accordion = ({ title, badge, children, defaultOpen = false, variant = 'default', className = '' }) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  
  const variants = {
    default: { bg: '#f0f9ff', border: '#3b82f6', text: '#1e40af', icon: '📋' },
    success: { bg: '#f0fdf4', border: '#16a34a', text: '#166534', icon: '✅' },
    warning: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e', icon: '⚠️' },
    danger: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b', icon: '🚨' }
  };
  const style = variants[variant] || variants.default;
  
  return (
    <div className={className} style={{ marginBottom: '1.5rem' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '1.25rem',
          backgroundColor: style.bg,
          border: `2px solid ${style.border}`,
          borderRadius: '12px',
          fontSize: '1.125rem',
          fontWeight: '700',
          color: style.text,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'all 0.2s ease',
          outline: 'none'
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
      >
        <span style={{ fontSize: '1rem', transition: 'transform 0.2s', display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          ▶
        </span>
        <span style={{ flex: 1 }}>{title}</span>
        {badge && <div style={{ marginLeft: 'auto' }}>{badge}</div>}
      </button>
      
      {isOpen && (
        <Card style={{ 
          marginTop: '0.5rem', 
          backgroundColor: style.bg, 
          borderColor: style.border,
          animation: 'fadeIn 0.2s ease-in'
        }}>
          <CardContent>
            {children}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
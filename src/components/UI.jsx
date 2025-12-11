// Lightweight UI components replacing shadcn/ui dependencies
// These work with our custom CSS only

/**
 * Card - Simple container component
 */
export const Card = ({ children, className = '', variant = 'default' }) => {
  const variantStyles = {
    default: {},
    infobox: {
      backgroundColor: 'var(--bg-secondary, #f9fafb)',
      border: 'none',
      borderRadius: '8px',
      padding: '0.75rem',
      fontSize: '0.875rem'
    }
  };

  return (
    <div 
      className={`card ${className}`}
      style={variantStyles[variant]}
    >
      {children}
    </div>
  );
};

/**
 * CardContent - Content wrapper for cards
 */
export const CardContent = ({ children, className = '' }) => (
  <div className={`card-content ${className}`}>
    {children}
  </div>
);

/**
 * InfoBox - Zone d'information grisée (frais, avertissements)
 * Fond gris clair, coins arrondis, padding réduit, texte petit
 */
export const InfoBox = ({ children, className = '', icon = '' }) => (
  <div 
    className={className}
    style={{
      backgroundColor: 'var(--bg-secondary, #f9fafb)',
      border: 'none',
      borderRadius: '8px',
      padding: '0.75rem',
      fontSize: '0.875rem',
      color: 'var(--text-secondary)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.5rem'
    }}
  >
    {icon && <span style={{ flexShrink: 0 }}>{icon}</span>}
    <div style={{ flex: 1 }}>{children}</div>
  </div>
);

/**
 * Button - Simple button component with variants
 */
export const Button = ({ children, className = '', variant = 'default', ...props }) => {
  const variantStyles = {
    default: {
      backgroundColor: 'var(--bg-secondary)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-primary)'
    },
    primary: {
      backgroundColor: 'var(--primary-color)',
      color: '#fff',
      border: 'none'
    },
    outline: {
      backgroundColor: 'transparent',
      color: 'var(--primary-color)',
      border: '1px solid var(--primary-color)'
    },
    danger: {
      backgroundColor: '#dc3545',
      color: '#fff',
      border: 'none'
    },
    success: {
      backgroundColor: '#28a745',
      color: '#fff',
      border: 'none'
    }
  };

  const baseStyle = {
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    fontWeight: '600',
    borderRadius: '8px',
    cursor: props.disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    minHeight: variant === 'primary' || variant === 'success' || variant === 'danger' ? '50px' : 'auto',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: props.disabled ? 0.6 : 1,
    ...variantStyles[variant]
  };

  return (
    <button 
      className={`btn ${className}`} 
      style={baseStyle}
      onMouseEnter={(e) => {
        if (!props.disabled) {
          e.target.style.transform = 'translateY(-1px)';
          e.target.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
        }
      }}
      onMouseLeave={(e) => {
        if (!props.disabled) {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
        }
      }}
      {...props}
    >
      {children}
    </button>
  );
};

/**
 * PageLayout - Layout wrapper for pages
 */
export const PageLayout = ({ children, className = '', hasBottomNav = false }) => (
  <div className={`page-layout ${hasBottomNav ? 'has-bottom-nav' : ''} ${className}`}>
    {children}
  </div>
);

/**
 * Badge - Status badge component
 */
export const Badge = ({ children, className = '', variant = 'default' }) => (
  <span className={`badge badge-${variant} ${className}`}>
    {children}
  </span>
);

/**
 * Tabs - Tabbed interface
 */
export const Tabs = ({ tabs, activeTab, onChange, className = '' }) => (
  <div 
    className={`tabs-container ${className}`}
    style={{ 
      display: 'flex', 
      width: '100%', 
      gap: '2px',
      backgroundColor: 'transparent',
      borderBottom: 'none',
      marginBottom: 0,
      overflowX: 'visible'
    }}
  >
    {tabs.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={`tab ${activeTab === tab.id ? 'active' : ''}`}
        style={{
          flex: 1,
          minWidth: 0,
          padding: '12px',
          textAlign: 'center',
          border: 'none',
          borderBottom: activeTab === tab.id ? '3px solid var(--primary-color, #007bff)' : '1px solid transparent',
          fontWeight: activeTab === tab.id ? '600' : '500',
          fontSize: '0.9rem',
          color: activeTab === tab.id ? 'var(--primary-color, #007bff)' : 'var(--text-secondary, #6b7280)',
          backgroundColor: activeTab === tab.id ? 'var(--bg-primary, #fff)' : 'var(--bg-secondary, #f5f5f5)',
          borderTopLeftRadius: '8px',
          borderTopRightRadius: '8px',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          transition: 'all 0.2s ease'
        }}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

/**
 * BalanceCard - Card showing balance split between two currencies
 */
export const BalanceCard = ({ leftContent, rightContent, onLeftClick, onRightClick, className = '' }) => (
  <div className={`balance-card ${className}`} style={{
    display: 'grid',
    gridTemplateColumns: '1fr 1px 1fr',
    gap: '1rem',
    padding: '1.5rem',
    background: 'var(--card-bg)',
    border: '1px solid var(--border-primary)',
    borderRadius: '12px',
    boxShadow: '0 1px 3px var(--card-shadow)'
  }}>
    {/* Left section */}
    <div onClick={onLeftClick} style={{ cursor: onLeftClick ? 'pointer' : 'default' }}>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
        {leftContent.subtitle}
      </div>
      <div style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
        {leftContent.label}
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-primary)' }}>
        {leftContent.value}
      </div>
    </div>

    {/* Divider */}
    <div style={{
      backgroundColor: 'var(--border-primary)',
      margin: '0.5rem 0'
    }} />

    {/* Right section */}
    <div onClick={onRightClick} style={{ cursor: onRightClick ? 'pointer' : 'default', textAlign: 'right' }}>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
        {rightContent.subtitle}
      </div>
      <div style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
        {rightContent.label}
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-primary)' }}>
        {rightContent.value}
      </div>
      {rightContent.conversion && (
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          ≈ {rightContent.conversion?.toFixed(4)}
        </div>
      )}
    </div>
  </div>
);

/**
 * Stack - Vertical spacing container
 */
export const Stack = ({ children, spacing = 'md', className = '' }) => {
  const spacingMap = {
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem'
  };

  return (
    <div
      className={`stack ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacingMap[spacing] || spacing
      }}
    >
      {children}
    </div>
  );
};

/**
 * PageHeader - Header section with title, subtitle and action
 */
export const PageHeader = ({ icon = '', title = '', subtitle = '', action, className = '' }) => (
  <div className={`page-header ${className}`} style={{
    padding: '1.5rem',
    background: 'var(--card-bg)',
    border: '1px solid var(--border-primary)',
    borderRadius: '12px',
    marginBottom: '1.5rem'
  }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
          {icon}
        </div>
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          color: 'var(--text-primary)',
          margin: '0 0 0.25rem 0'
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{
            fontSize: '0.9rem',
            color: 'var(--text-secondary)',
            margin: '0'
          }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div style={{ minWidth: '150px' }}>
          {action}
        </div>
      )}
    </div>
  </div>
);

/**
 * Input - Simple input component with label, icons, and action button
 */
export const Input = ({ className = '', label = '', rightIcon, actionButton, helperText, ...props }) => (
  <div className={`input-wrapper ${className}`}>
    {label && (
      <label style={{
        display: 'block',
        fontSize: '0.875rem',
        fontWeight: '500',
        color: 'var(--text-primary)',
        marginBottom: '0.5rem'
      }}>
        {label}
      </label>
    )}
    <div style={{ position: 'relative' }}>
      <input 
        className="input"
        style={{
          width: '100%',
          padding: rightIcon ? '1rem 3rem 1rem 1rem' : actionButton ? '1rem 4rem 1rem 1rem' : '1rem 1rem',
          fontSize: '1rem',
          border: '1px solid var(--border-primary)',
          borderRadius: '8px',
          background: 'var(--input-bg)',
          color: 'var(--text-primary)',
          transition: 'border-color 0.2s',
          outline: 'none'
        }}
        onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
        onBlur={(e) => e.target.style.borderColor = 'var(--border-primary)'}
        {...props} 
      />
      {rightIcon && (
        <div style={{
          position: 'absolute',
          right: '1rem',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          alignItems: 'center'
        }}>
          {rightIcon}
        </div>
      )}
      {actionButton && (
        <span
          onClick={actionButton.onClick}
          style={{
            position: 'absolute',
            right: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--primary-color)',
            fontWeight: 'bold',
            fontSize: '0.8rem',
            cursor: 'pointer',
            userSelect: 'none',
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.opacity = '0.7'}
          onMouseLeave={(e) => e.target.style.opacity = '1'}
        >
          {actionButton.label}
        </span>
      )}
    </div>
    {helperText && (
      <p style={{
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
        marginTop: '0.25rem',
        marginBottom: 0
      }}>
        {helperText}
      </p>
    )}
  </div>
);

/**
 * Label - Simple label component
 */
export const Label = ({ children, className = '', htmlFor = '', ...props }) => (
  <label 
    htmlFor={htmlFor}
    className={`label ${className}`}
    style={{
      display: 'block',
      fontSize: '0.875rem',
      fontWeight: '500',
      color: 'var(--text-primary)',
      marginBottom: '0.5rem'
    }}
    {...props}
  >
    {children}
  </label>
);

/**
 * Checkbox - Simple checkbox component
 */
export const Checkbox = ({ className = '', label = '', ...props }) => (
  <label style={{
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: 'var(--text-primary)'
  }}>
    <input 
      type="checkbox"
      className={`checkbox ${className}`}
      style={{
        width: '1.25rem',
        height: '1.25rem',
        cursor: 'pointer',
        accentColor: 'var(--accent-primary)'
      }}
      {...props} 
    />
    {label && <span>{label}</span>}
  </label>
);

/**
 * Select - Simple select component
 */
export const Select = ({ className = '', label = '', options = [], ...props }) => (
  <div className={`select-wrapper ${className}`}>
    {label && (
      <label style={{
        display: 'block',
        fontSize: '0.875rem',
        fontWeight: '500',
        color: 'var(--text-primary)',
        marginBottom: '0.5rem'
      }}>
        {label}
      </label>
    )}
    <select 
      className="select"
      style={{
        width: '100%',
        padding: '0.75rem 1rem',
        fontSize: '1rem',
        border: '1px solid var(--border-primary)',
        borderRadius: '8px',
        background: 'var(--input-bg)',
        color: 'var(--text-primary)',
        cursor: 'pointer',
        outline: 'none'
      }}
      {...props}
    >
      {options.map((opt, idx) => (
        <option key={idx} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

/**
 * Textarea - Simple textarea component
 */
export const Textarea = ({ className = '', label = '', ...props }) => (
  <div className={`textarea-wrapper ${className}`}>
    {label && (
      <label style={{
        display: 'block',
        fontSize: '0.875rem',
        fontWeight: '500',
        color: 'var(--text-primary)',
        marginBottom: '0.5rem'
      }}>
        {label}
      </label>
    )}
    <textarea 
      className="textarea"
      style={{
        width: '100%',
        padding: '0.75rem 1rem',
        fontSize: '1rem',
        border: '1px solid var(--border-primary)',
        borderRadius: '8px',
        background: 'var(--input-bg)',
        color: 'var(--text-primary)',
        resize: 'vertical',
        minHeight: '100px',
        outline: 'none'
      }}
      onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
      onBlur={(e) => e.target.style.borderColor = 'var(--border-primary)'}
      {...props} 
    />
  </div>
);

/**
 * Modal - Simple modal component
 */
export const Modal = ({ children, isOpen = false, onClose, className = '' }) => {
  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div 
        className={`modal ${className}`}
        style={{
          background: 'var(--card-bg)',
          borderRadius: '12px',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

// Modal sub-components
Modal.Header = ({ children, className = '' }) => (
  <div 
    className={`modal-header ${className}`}
    style={{
      padding: '1.5rem',
      borderBottom: '1px solid var(--border-primary)',
      fontSize: '1.25rem',
      fontWeight: '700',
      color: 'var(--text-primary)'
    }}
  >
    {children}
  </div>
);

Modal.Body = ({ children, className = '' }) => (
  <div 
    className={`modal-body ${className}`}
    style={{
      padding: '1.5rem'
    }}
  >
    {children}
  </div>
);

Modal.Footer = ({ children, className = '' }) => (
  <div 
    className={`modal-footer ${className}`}
    style={{
      padding: '1.5rem',
      borderTop: '1px solid var(--border-primary)',
      display: 'flex',
      gap: '0.75rem',
      justifyContent: 'flex-end'
    }}
  >
    {children}
  </div>
);

/**
 * Switch - Toggle switch component
 */
export const Switch = ({ checked, onChange, disabled = false, className = '' }) => (
  <label
    className={`switch ${className}`}
    style={{
      position: 'relative',
      display: 'inline-block',
      width: '52px',
      height: '28px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1
    }}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => !disabled && onChange(e.target.checked)}
      disabled={disabled}
      style={{ opacity: 0, width: 0, height: 0 }}
    />
    <span
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: checked ? 'var(--primary-color, #007bff)' : 'var(--bg-secondary, #ccc)',
        borderRadius: '28px',
        transition: 'background-color 0.3s',
        boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.1)'
      }}
    >
      <span
        style={{
          position: 'absolute',
          content: '',
          height: '20px',
          width: '20px',
          left: checked ? '28px' : '4px',
          bottom: '4px',
          backgroundColor: 'white',
          borderRadius: '50%',
          transition: 'left 0.3s',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
        }}
      />
    </span>
  </label>
);

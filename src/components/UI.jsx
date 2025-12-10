// Lightweight UI components replacing shadcn/ui dependencies
// These work with our custom CSS only

/**
 * Card - Simple container component
 */
export const Card = ({ children, className = '' }) => (
  <div className={`card ${className}`} >
    {children}
  </div>
);

/**
 * CardContent - Content wrapper for cards
 */
export const CardContent = ({ children, className = '' }) => (
  <div className={`card-content ${className}`}>
    {children}
  </div>
);

/**
 * Button - Simple button component
 */
export const Button = ({ children, className = '', ...props }) => (
  <button className={`btn ${className}`} {...props}>
    {children}
  </button>
);

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
  <div className={`tabs-container ${className}`}>
    {tabs.map((tab) => (
      <button
        key={tab.id}
        className={`tab ${activeTab === tab.id ? 'active' : ''}`}
        onClick={() => onChange(tab.id)}
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
          padding: rightIcon ? '0.75rem 3rem 0.75rem 1rem' : actionButton ? '0.75rem 5rem 0.75rem 1rem' : '0.75rem 1rem',
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
          right: '0.5rem',
          top: '50%',
          transform: 'translateY(-50%)'
        }}>
          {rightIcon}
        </div>
      )}
      {actionButton && (
        <button
          type="button"
          onClick={actionButton.onClick}
          style={{
            position: 'absolute',
            right: '0.5rem',
            top: '50%',
            transform: 'translateY(-50%)',
            padding: '0.25rem 0.75rem',
            fontSize: '0.75rem',
            fontWeight: '600',
            color: 'var(--accent-primary)',
            background: 'transparent',
            border: '1px solid var(--accent-primary)',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'var(--accent-primary)';
            e.target.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'transparent';
            e.target.style.color = 'var(--accent-primary)';
          }}
        >
          {actionButton.label}
        </button>
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

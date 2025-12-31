import React from 'react';

// --- Label ---
interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
}

export const Label: React.FC<LabelProps> = ({ children, className = '', style, ...props }) => (
  <label 
    className={className}
    style={{
      display: 'block',
      fontSize: '0.9rem',
      fontWeight: 600,
      color: 'var(--text-primary)',
      marginBottom: '8px',
      ...style
    }}
    {...props}
  >
    {children}
  </label>
);

// --- Input ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  rightIcon?: React.ReactNode;
  leftIcon?: React.ReactNode; // Présent dans les props mais pas utilisé dans le rendu original
  actionButton?: {
    label: string;
    onClick: () => void;
  };
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({ className = '', label, rightIcon, actionButton, helperText, style, ...props }) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { leftIcon, ...inputProps } = props;
  
  return (
    <div className={`w-full ${className}`} style={{ marginBottom: '16px' }}>
      {label && <Label>{label}</Label>}
      <div style={{ position: 'relative' }}>
        <input 
          style={{
            width: '100%',
            padding: '0 16px',
            height: '50px',
            fontSize: '1rem',
            border: '1px solid var(--border-color, #e5e7eb)',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-input, #fff)',
            color: 'var(--text-primary)',
            boxSizing: 'border-box',
            outline: 'none',
            transition: 'border-color 0.2s',
            paddingRight: actionButton ? '60px' : (rightIcon ? '40px' : '16px'),
            ...style
          }}
          onFocus={(e) => e.target.style.borderColor = 'var(--primary-color, #0074e4)'}
          onBlur={(e) => e.target.style.borderColor = 'var(--border-color, #e5e7eb)'}
          {...inputProps} 
        />
        
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
              fontWeight: 700,
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
};

// --- Checkbox ---
interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ className = '', label = '', style, ...props }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
    <input 
      type="checkbox"
      className={className}
      style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer', accentColor: 'var(--primary-color, #0074e4)', ...style }}
      {...props} 
    />
    {label && <span>{label}</span>}
  </label>
);

// --- Select ---
interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: SelectOption[];
}

export const Select: React.FC<SelectProps> = ({ className = '', label = '', options = [], style, ...props }) => (
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
        outline: 'none',
        ...style
      }}
      {...props}
    >
      {options.map((opt, idx) => (
        <option key={idx} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

// --- Textarea ---
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ className = '', label = '', style, ...props }) => (
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
        fontFamily: 'inherit',
        ...style
      }}
      onFocus={(e) => e.target.style.borderColor = 'var(--primary-color, #0074e4)'}
      onBlur={(e) => e.target.style.borderColor = 'var(--border-color, #e5e7eb)'}
      {...props} 
    />
  </div>
);
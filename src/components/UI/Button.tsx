import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  className = '', 
  variant = 'primary', 
  icon, 
  fullWidth = false, 
  style,
  ...props 
}) => {
  const styles: Record<ButtonVariant, React.CSSProperties> = {
    primary: { backgroundColor: '#0074e4', color: '#fff', border: 'none' },
    secondary: { backgroundColor: '#64748b', color: '#fff', border: 'none' },
    danger: { backgroundColor: '#ef4444', color: '#fff', border: 'none' },
    outline: { backgroundColor: 'transparent', color: '#1e293b', border: '1px solid #e2e8f0' },
    ghost: { backgroundColor: 'transparent', color: '#0074e4', border: 'none' }
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
        fontWeight: 600,
        width: fullWidth ? '100%' : 'auto',
        backgroundColor: currentStyle.backgroundColor,
        color: currentStyle.color,
        border: currentStyle.border,
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        opacity: props.disabled ? 0.6 : 1,
        transition: 'all 0.2s ease',
        ...style
      }} 
      {...props}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
};
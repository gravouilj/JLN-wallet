import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, disabled = false, className = '' }) => (
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

interface VisibilityToggleProps {
  isVisible: boolean;
  onChange: (visible: boolean) => void;
  labelVisible?: string;
  labelHidden?: string;
  disabled?: boolean;
}

export const VisibilityToggle: React.FC<VisibilityToggleProps> = ({ isVisible, onChange, labelVisible = "Visible", labelHidden = "Masqué", disabled = false }) => (
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
      backgroundColor: isVisible ? '#dcfce7' : '#f3f4f6', 
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
    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: isVisible ? '#15803d' : '#64748b' }}>
      {isVisible ? `👁️ ${labelVisible}` : `🙈 ${labelHidden}`}
    </span>
  </div>
);
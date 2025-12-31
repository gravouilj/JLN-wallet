import React from 'react';

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className = '' }) => (
  <div 
    className={`tabs-container ${className}`}
    style={{ 
      display: 'flex', 
      width: '100%', 
      borderBottom: '1px solid #e5e7eb',
      overflowX: 'auto',        
      // @ts-expect-error - Non-standard CSS properties for scrollbar styling
      scrollbarWidth: 'none',
      msOverflowStyle: 'none'
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
          fontWeight: activeTab === tab.id ? 600 : 500,
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
import React from 'react';

interface FormattingToolbarProps {
  onFormat: (type: 'bold' | 'italic' | 'code' | 'strikethrough' | 'link') => void;
  style?: React.CSSProperties;
}

export const FormattingToolbar: React.FC<FormattingToolbarProps> = ({ onFormat, style }) => {
  const buttons = [
    { type: 'bold' as const, label: 'B', title: 'Жирный (Ctrl+B)', style: { fontWeight: 'bold' } },
    { type: 'italic' as const, label: 'I', title: 'Курсив (Ctrl+I)', style: { fontStyle: 'italic' } },
    { type: 'code' as const, label: '</>', title: 'Код (Ctrl+E)', style: { fontFamily: 'monospace' } },
    { type: 'strikethrough' as const, label: 'S', title: 'Зачёркнутый (Ctrl+Shift+X)', style: { textDecoration: 'line-through' } },
    { type: 'link' as const, label: '🔗', title: 'Ссылка (Ctrl+K)', style: {} },
  ];

  return (
    <div
      style={{
        display: 'flex',
        gap: '4px',
        padding: '8px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        ...style,
      }}
    >
      {buttons.map((button) => (
        <button
          key={button.type}
          onClick={() => onFormat(button.type)}
          title={button.title}
          style={{
            padding: '6px 12px',
            backgroundColor: 'rgba(0, 242, 255, 0.1)',
            border: '1px solid rgba(0, 242, 255, 0.3)',
            borderRadius: '6px',
            color: '#00f2ff',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s',
            ...button.style,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 242, 255, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(0, 242, 255, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 242, 255, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(0, 242, 255, 0.3)';
          }}
        >
          {button.label}
        </button>
      ))}
      
      <div style={{ flexGrow: 1 }} />
      
      <div
        style={{
          fontSize: '11px',
          color: '#888',
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
        }}
      >
        Markdown поддерживается
      </div>
    </div>
  );
};

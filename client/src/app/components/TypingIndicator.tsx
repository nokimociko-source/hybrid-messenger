import React from 'react';

export function TypingIndicator() {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '2px',
      color: '#00f2ff',
    }}>
      <span style={{ animation: 'typing-dot 1.4s infinite', animationDelay: '0s' }}>●</span>
      <span style={{ animation: 'typing-dot 1.4s infinite', animationDelay: '0.2s' }}>●</span>
      <span style={{ animation: 'typing-dot 1.4s infinite', animationDelay: '0.4s' }}>●</span>
      <style>{`
        @keyframes typing-dot {
          0%, 60%, 100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          30% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </span>
  );
}

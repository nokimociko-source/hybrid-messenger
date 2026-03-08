import React from 'react';

interface MessageStatusIconProps {
  status: 'sending' | 'sent' | 'delivered' | 'read';
  size?: number;
}

export function MessageStatusIcon({ status, size = 16 }: MessageStatusIconProps) {
  const color = status === 'read' ? '#00f2ff' : '#666';
  
  if (status === 'sending') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="2" opacity="0.3" />
        <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="2" strokeDasharray="20" strokeDashoffset="10">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 8 8"
            to="360 8 8"
            dur="1s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
    );
  }

  if (status === 'sent') {
    // Одна галочка
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        <path
          d="M3 8L6 11L13 4"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // Две галочки (delivered или read)
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M1 8L4 11L9 6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 8L8 11L15 4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

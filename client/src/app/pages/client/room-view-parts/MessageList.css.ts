import { style, keyframes } from '@vanilla-extract/css';

const slideUp = keyframes({
  from: {
    opacity: 0,
    transform: 'translateY(10px)',
  },
  to: {
    opacity: 1,
    transform: 'translateY(0)',
  },
});

const fadeIn = keyframes({
  from: {
    opacity: 0,
  },
  to: {
    opacity: 1,
  },
});

export const root = style({
  flexGrow: 1,
  position: 'relative',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
});

export const loadingContainer = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
  flex: 1,
  minHeight: '120px',
});

export const jumpButton = style({
  position: 'absolute',
  right: '20px',
  bottom: '20px',
  zIndex: 50,

  display: 'flex',
  alignItems: 'center',
  gap: '8px',

  padding: '12px 20px',
  border: 'none',
  borderRadius: '24px',

  background: 'var(--color-accent-gradient, linear-gradient(135deg, #00f2ff, #00c8ff))',
  color: 'var(--color-accent-contrast, #000)',
  cursor: 'pointer',

  fontSize: '14px',
  fontWeight: '600',
  boxShadow: 'var(--color-accent-glow, 0 4px 20px rgba(0, 242, 255, 0.4))',

  transition: 'transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease',

  animation: `0.3s ease-out ${slideUp}`,

  ':hover': {
    transform: 'translateY(-2px)',
    boxShadow: 'var(--color-accent-glow-hover, 0 6px 24px rgba(0, 242, 255, 0.5))',
  },

  ':focus-visible': {
    outline: '2px solid var(--color-focus-ring, rgba(255, 255, 255, 0.9))',
    outlineOffset: '2px',
  },

  '@media': {
    '(max-width: 600px)': {
      right: '16px',
      bottom: '80px',
      padding: '10px 16px',
      fontSize: '13px',
    },
    '(prefers-reduced-motion: reduce)': {
      animation: 'none',
      transition: 'none',
    },
  },
});

export const jumpButtonIcon = style({
  flexShrink: 0,
});

export const emptyState = style({
  display: 'flex',
  height: '100%',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '20px',
  padding: '20px',

  animation: `0.4s ease-out ${fadeIn}`,

  '@media': {
    '(max-width: 600px)': {
      gap: '16px',
      padding: '16px',
    },
    '(prefers-reduced-motion: reduce)': {
      animation: 'none',
    },
  },
});

export const emptyStateIcon = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',

  width: '80px',
  height: '80px',
  border: '1px solid var(--color-border-secondary, rgba(0, 242, 255, 0.15))',
  borderRadius: '50%',

  background: 'var(--color-bg-secondary, rgba(0, 242, 255, 0.08))',
  fontSize: '36px',

  '@media': {
    '(max-width: 600px)': {
      width: '60px',
      height: '60px',
      fontSize: '28px',
    },
  },
});

export const emptyStateText = style({
  textAlign: 'center',
});

export const emptyStateTitle = style({
  marginBottom: '8px',
  color: 'var(--color-text-secondary, rgba(255, 255, 255, 0.7))',
  fontSize: '18px',
  fontWeight: '600',

  '@media': {
    '(max-width: 600px)': {
      fontSize: '16px',
    },
  },
});

export const emptyStateSubtitle = style({
  color: 'var(--color-text-tertiary, rgba(255, 255, 255, 0.35))',
  fontSize: '14px',

  '@media': {
    '(max-width: 600px)': {
      fontSize: '13px',
    },
  },
});

export const dateHeaderWrap = style({
  padding: '20px 0',
  textAlign: 'center',
});

export const messageRow = style({
  paddingBottom: '16px',
});

const uploadPulse = keyframes({
  '0%, 100%': { opacity: 0.8 },
  '50%': { opacity: 0.4 },
});

export const uploadingBubble = style({
  opacity: 0.8,
  minWidth: '200px',
  animation: `1.5s ease-in-out ${uploadPulse} infinite`,
});

export const uploadingContent = style({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
});

export const uploadingText = style({
  fontSize: '14px',
  color: 'rgba(255, 255, 255, 0.8)',
});

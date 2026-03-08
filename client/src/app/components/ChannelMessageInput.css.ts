import { style } from '@vanilla-extract/css';

export const DisabledInputContainer = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px 24px',
  margin: '0 auto',
  maxWidth: '1100px',
  width: '100%',
});

export const DisabledInputContent = style({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '14px 24px',
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '24px',
  width: '100%',
  maxWidth: '800px',
  transition: 'all 0.2s ease',
  
  ':hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
});

export const LockIcon = style({
  color: 'rgba(255, 255, 255, 0.4)',
  flexShrink: 0,
});

export const DisabledMessage = style({
  color: 'rgba(255, 255, 255, 0.5)',
  fontSize: '14px',
  fontWeight: '500',
  userSelect: 'none',
});

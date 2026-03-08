import { style, keyframes } from '@vanilla-extract/css';

const pulse = keyframes({
    '0%': { transform: 'scale(1)', opacity: 0.5 },
    '50%': { transform: 'scale(1.1)', opacity: 0.8 },
    '100%': { transform: 'scale(1)', opacity: 0.5 },
});

export const CallOverlay = style({
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 5, 5, 0.85)',
    backdropFilter: 'blur(40px)',
    zIndex: 10000,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
});

export const CallContainer = style({
    width: '400px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '32px',
    textAlign: 'center',
});

export const CallerAvatar = style({
    width: '160px',
    height: '160px',
    borderRadius: '50%',
    backgroundColor: '#1a1a1a',
    border: '4px solid #00f2ff',
    boxShadow: '0 0 30px rgba(0, 242, 255, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '64px',
    fontWeight: 'bold',
    color: '#00f2ff',
    position: 'relative',
    selectors: {
        '&::before': {
            content: '""',
            position: 'absolute',
            top: '-10px', left: '-10px', right: '-10px', bottom: '-10px',
            borderRadius: '50%',
            border: '2px solid rgba(0, 242, 255, 0.2)',
            animation: `${pulse} 2s infinite ease-in-out`,
        }
    }
});

export const VideoGrid = style({
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '16px',
    width: '100%',
    maxWidth: '800px',
    padding: '20px',
});

export const VideoWindow = style({
    width: '100%',
    height: '400px',
    backgroundColor: '#000',
    borderRadius: '24px',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    position: 'relative',
    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
});

export const CallActions = style({
    display: 'flex',
    gap: '24px',
    marginTop: '40px',
});

export const ActionButton = style({
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: 'none',
    color: '#fff',
    selectors: {
        '&:hover': {
            transform: 'scale(1.1)',
        }
    }
});

export const EndCallBtn = style([ActionButton, {
    backgroundColor: '#ff3b30',
    boxShadow: '0 0 20px rgba(255, 59, 48, 0.4)',
}]);

export const AcceptCallBtn = style([ActionButton, {
    backgroundColor: '#34c759',
    boxShadow: '0 0 20px rgba(52, 199, 89, 0.4)',
}]);

export const UtilityBtn = style([ActionButton, {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    width: '56px',
    height: '56px',
}]);

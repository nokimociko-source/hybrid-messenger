import { style, globalStyle } from '@vanilla-extract/css';
import { config } from 'folds';

export const ShellRoot = style({
    display: 'flex',
    height: '100vh',
    width: '100vw',
    backgroundColor: 'var(--bg-primary)',
    overflow: 'hidden',
    '@media': {
        '(max-width: 768px)': {
            flexDirection: 'column',
        },
    },
});

export const TelegramBar = style({
    width: '72px',
    height: '100%',
    backgroundColor: 'rgba(10, 10, 10, 0.8)',
    backdropFilter: 'blur(30px)',
    borderRight: '1px solid rgba(0, 242, 255, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px 0',
    gap: '12px',
    zIndex: 1000,
    '@media': {
        '(max-width: 768px)': {
            width: '100%',
            height: '60px',
            flexDirection: 'row',
            padding: '0 16px',
            borderRight: 'none',
            borderBottom: '1px solid rgba(0, 242, 255, 0.1)',
            justifyContent: 'space-around',
        },
    },
});

export const NavIconWrapper = style({
    width: '48px',
    height: '48px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    color: 'var(--text-tertiary)',
    position: 'relative',
    ':hover': {
        backgroundColor: 'var(--bg-hover)',
        color: 'var(--accent-primary)',
        boxShadow: '0 0 15px var(--accent-primary)',
    },
    '@media': {
        '(max-width: 768px)': {
            width: '40px',
            height: '40px',
            borderRadius: '12px',
        },
    },
});

export const NavIconActive = style({
    backgroundColor: 'var(--bg-active)',
    color: 'var(--accent-primary)',
    boxShadow: '0 0 20px var(--accent-primary)',
    '::before': {
        content: '""',
        position: 'absolute',
        left: '-12px',
        top: '12px',
        bottom: '12px',
        width: '4px',
        backgroundColor: 'var(--accent-primary)',
        borderRadius: '0 4px 4px 0',
        boxShadow: '0 0 10px var(--accent-primary)',
    },
    '@media': {
        '(max-width: 768px)': {
            '::before': {
                left: '12px',
                right: '12px',
                top: 'auto',
                bottom: '-8px',
                width: 'auto',
                height: '3px',
                borderRadius: '4px 4px 0 0',
            },
        },
    },
});

export const ContentArea = style({
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'row',
    height: '100%',
    '@media': {
        '(max-width: 768px)': {
            flexDirection: 'column',
            height: 'calc(100% - 60px)',
        },
    },
});

export const SidePanel = style({
    width: '320px',
    height: '100%',
    backgroundColor: 'rgba(15, 15, 15, 0.6)',
    backdropFilter: 'blur(30px) saturate(150%)',
    borderRight: '1px solid rgba(0, 242, 255, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    overflow: 'hidden',
    selectors: {
        '&[data-nav-collapsed="true"]': {
            width: '0px',
            opacity: 0,
            borderRight: 'none',
            pointerEvents: 'none',
        }
    },
    '@media': {
        '(max-width: 768px)': {
            width: '100%',
            height: '100%',
            borderRight: 'none',
            borderBottom: '1px solid rgba(0, 242, 255, 0.1)',
        },
    },
});

export const MainChatArea = style({
    flexGrow: 1,
    height: '100%',
    position: 'relative',
    backgroundColor: 'var(--bg-primary)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
});

// Mobile: hide by default, show when room is selected
globalStyle(`${MainChatArea}`, {
    '@media': {
        '(max-width: 768px)': {
            display: 'none',
        },
    },
});

globalStyle(`${MainChatArea}[data-room-selected="true"]`, {
    '@media': {
        '(max-width: 768px)': {
            display: 'block',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 100,
            width: '100vw',
            height: '100vh',
        },
    },
});

globalStyle(`${SidePanel}[data-room-selected="true"]`, {
    '@media': {
        '(max-width: 768px)': {
            display: 'none',
        },
    },
});

import { style, globalStyle } from '@vanilla-extract/css';

// Custom scrollbar styles for profile panel - targeting the scroll container
globalStyle('.profile-scroll-container ::-webkit-scrollbar', {
    width: '8px',
    height: '8px'
});

globalStyle('.profile-scroll-container ::-webkit-scrollbar-track', {
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '10px'
});

globalStyle('.profile-scroll-container ::-webkit-scrollbar-thumb', {
    background: 'rgba(0, 242, 255, 0.3)',
    borderRadius: '10px',
    border: '2px solid rgba(0, 0, 0, 0.2)',
    transition: 'background 0.2s'
});

globalStyle('.profile-scroll-container ::-webkit-scrollbar-thumb:hover', {
    background: 'rgba(0, 242, 255, 0.5)'
});

// Firefox scrollbar
globalStyle('.profile-scroll-container', {
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(0, 242, 255, 0.3) rgba(0, 0, 0, 0.2)'
});

// Also style horizontal scrollbar in tabs
globalStyle('.profile-tabs-scroll::-webkit-scrollbar', {
    height: '4px'
});

globalStyle('.profile-tabs-scroll::-webkit-scrollbar-track', {
    background: 'transparent'
});

globalStyle('.profile-tabs-scroll::-webkit-scrollbar-thumb', {
    background: 'rgba(0, 242, 255, 0.2)',
    borderRadius: '10px'
});

globalStyle('.profile-tabs-scroll::-webkit-scrollbar-thumb:hover', {
    background: 'rgba(0, 242, 255, 0.4)'
});

export const ProfilePanelContainer = style({
    width: '380px',
    height: '100%',
    backgroundColor: 'rgba(10, 10, 10, 0.75)',
    backdropFilter: 'blur(25px)',
    borderLeft: '1px solid rgba(0, 242, 255, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: 200,
    '@media': {
        'screen and (max-width: 1200px)': {
            position: 'absolute',
            right: 0,
            boxShadow: '-20px 0 60px rgba(0, 0, 0, 0.9)',
            width: '100%',
            maxWidth: '380px'
        },
        'screen and (max-width: 768px)': {
            width: '100%',
            maxWidth: '100%'
        }
    }
});

export const ProfileHeader = style({
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    gap: '24px',
    borderBottom: '1px solid rgba(0, 242, 255, 0.1)',
    backgroundColor: 'rgba(10, 10, 10, 0.6)',
    backdropFilter: 'blur(20px)',
    position: 'sticky',
    top: 0,
    zIndex: 10
});

export const CloseButton = style({
    color: 'rgba(255, 255, 255, 0.6)',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    ':hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        color: '#fff'
    }
});

export const HeaderTitle = style({
    fontSize: '18px',
    fontWeight: '500',
    color: '#fff'
});

export const ProfileBanner = style({
    height: '240px',
    width: '100%',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderBottom: '1px solid rgba(0, 242, 255, 0.05)',
    overflow: 'hidden',
    flexShrink: 0
});

export const ProfileAvatarWrapper = style({
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    border: '3px solid #00f2ff',
    boxShadow: '0 0 20px rgba(0, 242, 255, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '48px',
    fontWeight: 'bold',
    cursor: 'pointer',
    position: 'relative',
    zIndex: 1
});

export const OnlineDotLarge = style({
    position: 'absolute',
    bottom: '10px',
    right: '10px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#00ff00',
    border: '3px solid #0a0a0a',
    boxShadow: '0 0 10px #00ff00'
});

export const ProfileInfoSection = style({
    padding: '0 24px 24px',
    display: 'flex',
    flexDirection: 'column',
});

export const InfoRow = style({
    display: 'flex',
    alignItems: 'flex-start',
    padding: '16px',
    gap: '24px',
    cursor: 'pointer',
    borderRadius: '12px',
    transition: 'all 0.2s',
    ':hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        transform: 'translateX(2px)'
    }
});

export const InfoIcon = style({
    color: '#8b8b8b',
    marginTop: '2px'
});

export const InfoContent = style({
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
});

export const InfoValue = style({
    color: '#fff',
    fontSize: '15px',
    lineHeight: '1.4'
});

export const InfoLabel = style({
    color: '#8b8b8b',
    fontSize: '13px'
});

export const ProfileBadges = style({
    display: 'flex',
    gap: '8px',
    marginTop: '4px'
});

export const Badge = style({
    padding: '4px 8px',
    borderRadius: '8px',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#aaa',
    border: '1px solid rgba(255,255,255,0.1)'
});

export const Divider = style({
    height: '1px',
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    margin: '10px 0'
});

export const AboutSection = style({
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
});

export const SectionTitle = style({
    fontSize: '12px',
    color: '#00f2ff',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontWeight: 'bold'
});

export const AboutText = style({
    color: '#ddd',
    fontSize: '14px',
    lineHeight: '1.5'
});

export const MediaTabsContainer = style({
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    marginTop: '10px'
});

export const MediaTabsHeader = style({
    display: 'flex',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    padding: '0 10px'
});

export const MediaTab = style({
    padding: '12px 16px',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#888',
    position: 'relative',
    transition: 'color 0.2s',
    selectors: {
        '&:hover': {
            color: '#fff'
        }
    }
});

export const MediaTabActive = style({
    color: '#00f2ff',
    selectors: {
        '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '2px',
            backgroundColor: '#00f2ff',
            boxShadow: '0 0 10px #00f2ff'
        }
    }
});

export const MediaGrid = style({
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '2px',
    padding: '2px'
});

export const MediaItem = style({
    aspectRatio: '1/1',
    backgroundColor: '#111',
    transition: 'opacity 0.2s',
    selectors: {
        '&:hover': {
            opacity: 0.8
        }
    }
});

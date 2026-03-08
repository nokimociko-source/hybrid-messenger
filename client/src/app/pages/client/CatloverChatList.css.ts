import { style } from '@vanilla-extract/css';
import { config } from 'folds';

export const ChatListContainer = style({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    backgroundColor: 'transparent',
    padding: '16px',
    gap: '16px',
    boxSizing: 'border-box',
    '@media': {
        '(max-width: 768px)': {
            padding: '12px',
            gap: '12px',
        },
    },
});

export const SearchBarWrapper = style({
    position: 'relative',
    width: '100%',
    marginBottom: '8px',
});

export const SearchInput = style({
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 16px 12px 40px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(0, 242, 255, 0.2)',
    borderRadius: '24px',
    color: '#e0e0e0',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.3s ease',
    boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
    ':focus': {
        border: '1px solid #00f2ff',
        boxShadow: '0 0 15px rgba(0, 242, 255, 0.3), inset 0 0 10px rgba(0,0,0,0.5)',
        backgroundColor: 'rgba(0, 242, 255, 0.05)',
    },
    '::placeholder': {
        color: 'rgba(255, 255, 255, 0.3)',
    },
});

export const SearchIcon = style({
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'rgba(0, 242, 255, 0.5)',
    pointerEvents: 'none',
});

export const ChatFolderTabs = style({
    display: 'flex',
    gap: '8px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    paddingBottom: '12px',
    overflowX: 'auto',
    whiteSpace: 'nowrap',
    alignItems: 'center',
    scrollbarWidth: 'none', // Firefox
    msOverflowStyle: 'none', // IE and Edge
    '::-webkit-scrollbar': {
        display: 'none', // Chrome, Safari, Opera
    },
});

export const FolderTab = style({
    position: 'relative',
    padding: '6px 12px',
    borderRadius: '16px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.5)',
    transition: 'all 0.2s ease',
    ':hover': {
        color: '#e0e0e0',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
});

export const FolderTabActive = style({
    color: '#00f2ff',
    backgroundColor: 'rgba(0, 242, 255, 0.1)',
    boxShadow: '0 0 10px rgba(0, 242, 255, 0.2)',
});

export const ChatListScrollArea = style({
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flexGrow: 1,
    overflowY: 'auto',
    paddingRight: '4px',
    '::-webkit-scrollbar': {
        width: '4px',
    },
    '::-webkit-scrollbar-track': {
        background: 'transparent',
    },
    '::-webkit-scrollbar-thumb': {
        background: 'rgba(0, 242, 255, 0.2)',
        borderRadius: '4px',
    },
    selectors: {
        '&::-webkit-scrollbar-thumb:hover': {
            background: 'rgba(0, 242, 255, 0.5)',
        },
    },
});

export const RoomsList = style({
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
});

export const LoadingBox = style({
    display: 'flex',
    justifyContent: 'center',
    padding: '40px',
});

export const EmptyBox = style({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    color: 'rgba(255, 255, 255, 0.3)',
    textAlign: 'center',
    gap: '12px',
});

export const ChatTile = style({
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid transparent',
    position: 'relative',
    ':hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
    },
});

export const ChatTileActive = style({
    backgroundColor: 'rgba(0, 242, 255, 0.08)',
    border: '1px solid rgba(0, 242, 255, 0.3)',
    boxShadow: '0 4px 15px rgba(0, 242, 255, 0.1)',
});

export const AvatarBox = style({
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#1a1a1a',
    flexShrink: 0,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    border: '2px solid rgba(0, 242, 255, 0.2)',
});

export const OnlineDot = style({
    position: 'absolute',
    bottom: '0',
    right: '0',
    width: '12px',
    height: '12px',
    backgroundColor: '#00f2ff',
    borderRadius: '50%',
    border: '2px solid #0d0d0d',
    boxShadow: '0 0 8px #00f2ff',
});

export const ChatInfoBox = style({
    display: 'flex',
    flexDirection: 'column',
    marginLeft: '12px',
    flexGrow: 1,
    overflow: 'hidden',
});

export const ChatHeaderLine = style({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
});

export const ChatName = style({
    color: '#e0e0e0',
    fontWeight: 'bold',
    fontSize: '15px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
});

export const ChatTime = style({
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: '11px',
});

export const ChatMessageLine = style({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
});

export const ChatPreview = style({
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '13px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '85%',
});

export const UnreadBadgeList = style({
    backgroundColor: '#a200ff',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 'bold',
    padding: '2px 6px',
    borderRadius: '10px',
    boxShadow: '0 0 8px rgba(162, 0, 255, 0.8)',
});

export const ChatActions = style({
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
    transition: 'all 0.2s ease',
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    backgroundColor: 'rgba(13, 13, 13, 0.95)',
    padding: '4px',
    borderRadius: '8px',
    border: '1px solid rgba(0, 242, 255, 0.2)',
});

export const ActionButton = style({
    background: 'none',
    border: 'none',
    color: '#666',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    transition: 'all 0.2s ease',
    ':hover': {
        backgroundColor: 'rgba(0, 242, 255, 0.1)',
        color: '#00f2ff',
    },
});

export const ActionButtonActive = style({
    color: '#00f2ff',
});

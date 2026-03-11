import { style, globalStyle } from '@vanilla-extract/css';

export const ChatAreaContainer = style({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    '@media': {
        '(max-width: 768px)': {
            height: '100vh',
            width: '100vw',
        },
    },
});

// Immersive Background
export const ChatBackground = style({
    position: 'absolute',
    inset: 0,
    backgroundColor: '#0a0a0a',
    zIndex: 0,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundImage: 'var(--chat-bg-image, none)',
    '::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 'var(--chat-bg-opacity, 0.04)',
        backgroundImage: 'var(--chat-bg-pattern, url("https://www.transparenttextures.com/patterns/carbon-fibre.png"))',
        backgroundColor: 'var(--chat-bg-overlay, transparent)',
        pointerEvents: 'none',
        zIndex: 0
    }
});

export const ChatHeader = style({
    position: 'relative',
    zIndex: 10,
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    padding: '0 24px',
    backgroundColor: 'rgba(10, 10, 10, 0.6)',
    backdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(0, 242, 255, 0.1)',
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.5)',
    gap: '16px',
    '@media': {
        '(max-width: 768px)': {
            height: '56px',
            padding: '0 12px',
            gap: '12px',
        },
    },
});

export const HeaderAvatar = style({
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#1a1a1a',
    border: '2px solid rgba(0, 242, 255, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#00f2ff',
    fontWeight: 'bold',
    boxShadow: '0 0 10px rgba(0, 242, 255, 0.2)',
    '@media': {
        '(max-width: 768px)': {
            width: '36px',
            height: '36px',
            fontSize: '14px',
        },
    },
});

export const HeaderInfo = style({
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minWidth: 0,
    overflow: 'hidden',
});

export const HeaderTitle = style({
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    textShadow: '0 0 10px rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    '@media': {
        '(max-width: 768px)': {
            fontSize: '14px',
            letterSpacing: '0.3px',
        },
    },
});

export const HeaderStatus = style({
    color: '#00f2ff',
    fontSize: '12px',
    textShadow: '0 0 8px rgba(0, 242, 255, 0.5)',
    '@media': {
        '(max-width: 768px)': {
            fontSize: '11px',
        },
    },
});

export const ChatHeaderActions = style({
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    '@media': {
        '(max-width: 768px)': {
            gap: '4px',
        },
    },
});

export const HeaderActionButton = style({
    backgroundColor: 'transparent',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.5)',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    minWidth: '36px',
    minHeight: '36px',
    ':hover': {
        color: '#00f2ff',
        backgroundColor: 'rgba(0, 242, 255, 0.1)',
        boxShadow: '0 0 15px rgba(0, 242, 255, 0.2)',
    },
    '@media': {
        '(max-width: 768px)': {
            padding: '8px',
            minWidth: '44px',
            minHeight: '44px',
            borderRadius: '10px',
        },
    },
});

export const HeaderActionButtonActive = style({
    color: '#00f2ff',
    backgroundColor: 'rgba(0, 242, 255, 0.1)',
    boxShadow: '0 0 15px rgba(0, 242, 255, 0.3)',
});

export const BackButton = style({
    display: 'none',
    '@media': {
        '(max-width: 768px)': {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#00f2ff',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            ':hover': {
                backgroundColor: 'rgba(0, 242, 255, 0.1)',
            },
        },
    },
});

// Message Timeline
export const MessageTimeline = style({
    position: 'relative',
    zIndex: 1,
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '24px',
    gap: '16px',
    overflowY: 'auto',
    '::-webkit-scrollbar': {
        width: '6px',
    },
    '::-webkit-scrollbar-track': {
        background: 'transparent',
    },
    '::-webkit-scrollbar-thumb': {
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '6px',
    },
    '@media': {
        '(max-width: 768px)': {
            padding: '16px 12px',
            gap: '12px',
        },
    },
});

export const MessageWrapper = style({
    display: 'flex',
    width: '100%',
});

export const MessageWrapperSelf = style({
    justifyContent: 'flex-end',
});

export const MessageBubble = style({
    maxWidth: '70%',
    padding: '8px 12px 6px',
    borderRadius: '16px',
    position: 'relative',
    color: '#fff',
    fontSize: '15px',
    lineHeight: '1.4',
    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
    zIndex: 1,
    selectors: {
        [`${MessageWrapper}:hover &`]: {
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }
    },
    '@media': {
        '(max-width: 768px)': {
            maxWidth: '85%',
            fontSize: '14px',
            padding: '6px 10px 4px',
        },
    },
});

export const MessageActions = style({
    position: 'absolute',
    top: '-10px',
    right: '10px',
    display: 'none',
    gap: '4px',
    backgroundColor: 'rgba(20, 20, 20, 0.9)',
    backdropFilter: 'blur(10px)',
    padding: '4px 8px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    zIndex: 10,
    selectors: {
        [`${MessageWrapper}:hover &`]: {
            display: 'flex',
        }
    }
});

export const ActionIcon = style({
    color: 'rgba(255, 255, 255, 0.5)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    transition: 'all 0.2s',
    ':hover': {
        color: '#00f2ff',
        backgroundColor: 'rgba(0, 242, 255, 0.1)',
    }
});

export const ActionIconDelete = style([ActionIcon, {
    ':hover': {
        color: '#ff4d4d',
        backgroundColor: 'rgba(255, 77, 77, 0.1)',
    }
}]);

export const DateHeader = style({
    display: 'flex',
    justifyContent: 'center',
    margin: '24px 0',
    position: 'sticky',
    top: '10px',
    zIndex: 5,
});

globalStyle(`${DateHeader} span`, {
    backgroundColor: 'rgba(20, 20, 20, 0.6)',
    backdropFilter: 'blur(10px)',
    color: '#fff',
    fontSize: '13px',
    fontWeight: '500',
    padding: '4px 14px',
    borderRadius: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
    border: '1px solid rgba(255, 255, 255, 0.05)'
});

export const MessageBubbleOther = style({
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderTopLeftRadius: '4px',
});

export const MessageBubbleSelf = style({
    backgroundColor: 'rgba(0, 242, 255, 0.1)',
    border: '1px solid rgba(0, 242, 255, 0.3)',
    borderTopRightRadius: '4px',
    boxShadow: '0 4px 15px rgba(0, 242, 255, 0.1)',
});

export const MessageTime = style({
    fontSize: '10px',
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: '4px',
    textAlign: 'right',
});

// Floating Input Area
export const InputAreaContainer = style({
    position: 'relative',
    zIndex: 10,
    padding: '0 24px 24px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    '@media': {
        '(max-width: 768px)': {
            padding: '0 12px 12px 12px',
        },
    },
});

export const EditBar = style({
    maxWidth: '1100px',
    margin: '0 auto',
    width: 'calc(100% - 48px)',
    padding: '8px 20px',
    backgroundColor: 'rgba(0, 242, 255, 0.05)',
    borderLeft: '3px solid #00f2ff',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
});

export const FloatingInputPill = style({
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 20, 20, 0.85)',
    backdropFilter: 'blur(30px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '35px',
    padding: '8px 20px',
    gap: '16px',
    boxShadow: '0 15px 35px rgba(0, 0, 0, 0.6)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    maxWidth: '1100px',
    width: 'calc(100% - 48px)',
    margin: '0 auto',
    ':focus-within': {
        borderColor: 'rgba(0, 242, 255, 0.4)',
        boxShadow: '0 20px 50px rgba(0, 242, 255, 0.2), 0 0 20px rgba(0, 242, 255, 0.15)',
    },
    '@media': {
        '(max-width: 768px)': {
            padding: '8px 16px',
            gap: '12px',
            width: 'calc(100% - 16px)',
            margin: '0 8px',
            borderRadius: '28px',
        },
    },
});

export const InputField = style({
    flexGrow: 1,
    backgroundColor: 'transparent',
    border: 'none',
    color: '#ffffff',
    fontSize: '15px',
    padding: '8px 0',
    outline: 'none',
    '::placeholder': {
        color: 'rgba(255, 255, 255, 0.3)',
    },
});

export const IconButton = style({
    color: 'rgba(255, 255, 255, 0.5)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s ease',
    minWidth: '24px',
    minHeight: '24px',
    ':hover': {
        color: '#00f2ff',
        filter: 'drop-shadow(0 0 5px rgba(0, 242, 255, 0.5))',
    },
    '@media': {
        '(max-width: 768px)': {
            minWidth: '20px',
            minHeight: '20px',
        },
    },
});

export const SendButton = style({
    color: '#00f2ff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0, 242, 255, 0.1)',
    transition: 'all 0.2s ease',
    minWidth: '36px',
    minHeight: '36px',
    ':hover': {
        backgroundColor: 'rgba(0, 242, 255, 0.2)',
        boxShadow: '0 0 15px rgba(0, 242, 255, 0.4)',
    },
    '@media': {
        '(max-width: 768px)': {
            padding: '6px',
            minWidth: '32px',
            minHeight: '32px',
        },
    },
});

export const MessageQuickActions = style({
    selectors: {
        [`${MessageWrapper}:hover &`]: {
            opacity: '1 !important',
        }
    }
});
// Mention highlighting styles
globalStyle('.mention-highlight', {
    backgroundColor: 'rgba(0, 242, 255, 0.2)',
    color: '#00f2ff',
    padding: '2px 4px',
    borderRadius: '4px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
});

globalStyle('.mention-highlight:hover', {
    backgroundColor: 'rgba(0, 242, 255, 0.3)',
});

// Channel Post Styles
export const ChannelPost = style({
    maxWidth: '800px',
    width: '100%',
    margin: '12px auto',
    padding: '24px',
    background: 'rgba(20, 20, 20, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '24px',
    backdropFilter: 'blur(30px)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    ':hover': {
        borderColor: 'rgba(0, 242, 255, 0.2)',
        boxShadow: '0 15px 50px rgba(0, 0, 0, 0.5)',
        transform: 'translateY(-2px)',
    },
    '@media': {
        '(max-width: 768px)': {
            padding: '16px',
            borderRadius: '20px',
            margin: '8px auto',
        },
    },
});

export const PostHeader = style({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '4px',
});

export const PostFooter = style({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '8px',
    paddingTop: '16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
});

export const CommentsButton = style({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#00f2ff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '8px 16px',
    borderRadius: '12px',
    background: 'rgba(0, 242, 255, 0.1)',
    transition: 'all 0.2s',
    border: '1px solid rgba(0, 242, 255, 0.2)',
    ':hover': {
        background: 'rgba(0, 242, 255, 0.2)',
        transform: 'translateY(-1px)',
        boxShadow: '0 0 15px rgba(0, 242, 255, 0.2)',
    }
});

export const MessageContent = style({
    wordBreak: 'break-word',
    fontSize: '15px',
    lineHeight: '1.5',
    color: 'rgba(255, 255, 255, 0.9)',
});

export const MessageFooter = style({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '4px',
    marginTop: '4px',
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.5)',
});

export const ReactionsContainer = style({
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    marginTop: '6px',
});

export const ReactionBubble = style({
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    userSelect: 'none',
});

export const ModalOverlay = style({
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    animation: 'fadeIn 0.2s ease-out'
});
export const ChatContainer = style({
    display: 'flex',
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    vars: {
        '--background-color': '#0d0d0d',
    },
    backgroundColor: 'var(--background-color)',
});

export const ChatMain = style({
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    zIndex: 1,
});

export const PinnedBanner = style({
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    zIndex: 50,
    position: 'relative',
    minHeight: '54px',
    margin: '8px 16px',
    borderRadius: '12px',
    backgroundColor: 'rgba(20, 20, 20, 0.6)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(0, 242, 255, 0.1)',
    transition: 'all 0.2s',
    ':hover': {
        backgroundColor: 'rgba(30, 30, 30, 0.8)',
        borderColor: 'rgba(0, 242, 255, 0.3)',
    }
});

export const ChatMessages = style({
    flex: 1,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
});

export const JumpToUnread = style({
    position: 'absolute',
    bottom: '20px',
    right: '25px',
    backgroundColor: 'rgba(0, 242, 255, 0.9)',
    color: '#000',
    padding: '8px 16px',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    zIndex: 100,
    boxShadow: '0 4px 15px rgba(0, 242, 255, 0.4)',
    fontWeight: 'bold',
    fontSize: '13px',
    transition: 'all 0.2s',
    ':hover': {
        transform: 'translateY(-2px)',
        backgroundColor: '#00f2ff',
    }
});

export const MultiSelectToolbar = style({
    position: 'absolute',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'auto',
    minWidth: '300px',
    padding: '12px 24px',
    backgroundColor: 'rgba(20, 20, 20, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '16px',
    border: '1px solid rgba(0, 242, 255, 0.3)',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '24px',
    zIndex: 1000,
    animation: 'slideDown 0.3s ease-out',
});

export const MultiSelectInfo = style({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: '#00f2ff',
    fontWeight: 'bold',
});

export const MultiSelectActions = style({
    display: 'flex',
    gap: '12px',
});

export const DangerAction = style({
    color: '#ff4d4d',
});

export const ActionToast = style({
    position: 'absolute',
    bottom: '100px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(0, 242, 255, 0.9)',
    color: '#000',
    padding: '10px 20px',
    borderRadius: '20px',
    fontWeight: '600',
    zIndex: 2000,
    boxShadow: '0 4px 12px rgba(0, 242, 255, 0.4)',
    animation: 'toastSlideUp 3s ease-in-out',
});

export const MediaOverlay = style({
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backdropFilter: 'blur(20px)',
});

export const MediaClose = style({
    position: 'absolute',
    top: '24px',
    right: '24px',
    color: '#fff',
    cursor: 'pointer',
    opacity: 0.7,
    transition: 'opacity 0.2s',
    ':hover': {
        opacity: 1,
    }
});

globalStyle(`${MediaOverlay} img, ${MediaOverlay} video`, {
    maxWidth: '90vw',
    maxHeight: '90vh',
    borderRadius: '12px',
    boxShadow: '0 0 50px rgba(0,0,0,0.5)',
});

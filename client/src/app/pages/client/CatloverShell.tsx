import React, { ReactNode, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Icon, Icons } from 'folds';
import * as css from './CatloverShell.css';
import { SettingsModal } from '../../components/SettingsModal';
import { CatloverUserSearch } from './CatloverUserSearch';
import { ProfileSettingsPanel } from '../../components/ProfileSettingsPanel';

type CatloverShellProps = {
    nav: ReactNode;
    children: ReactNode;
};

export function CatloverShell({ nav, children }: CatloverShellProps) {
    const [showSettings, setShowSettings] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [showProfileSettings, setShowProfileSettings] = useState(false);
    const [isNavCollapsed, setIsNavCollapsed] = useState(false);
    const location = useLocation();

    // Check if we're on a room page for mobile navigation
    const isRoomSelected = location.pathname.includes('/room/');

    return (
        <div className={css.ShellRoot}>
            {/* Piece 1: Telegram Left Bar */}
            <div className={css.TelegramBar}>
                <div
                    className={`${css.NavIconWrapper} ${css.NavIconActive}`}
                    onClick={() => {
                        setIsNavCollapsed(!isNavCollapsed);
                        setShowSettings(false);
                        setShowSearch(false);
                        setShowProfileSettings(false);
                    }}
                >
                    <Icon size="300" src={Icons.Home} />
                </div>
                <div className={css.NavIconWrapper} onClick={() => {
                    setShowProfileSettings(!showProfileSettings);
                    setShowSettings(false);
                    setShowSearch(false);
                }}>
                    <Icon size="300" src={Icons.User} />
                </div>
                <div className={css.NavIconWrapper} onClick={() => {
                    setShowSearch(!showSearch);
                    setShowSettings(false);
                    setShowProfileSettings(false);
                }}>
                    <Icon size="300" src={Icons.Search} />
                </div>
                <div style={{ flexGrow: 1 }} />
                <div className={css.NavIconWrapper} onClick={() => {
                    setShowSettings(!showSettings);
                    setShowProfileSettings(false);
                    setShowSearch(false);
                }}>
                    <Icon size="300" src={Icons.Setting} />
                </div>
            </div>

            {/* Profile Settings Panel */}
            {showProfileSettings && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: '72px',
                    zIndex: 1000,
                }}>
                    <ProfileSettingsPanel onClose={() => setShowProfileSettings(false)} />
                </div>
            )}

            {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
            {showSearch && <CatloverUserSearch onClose={() => setShowSearch(false)} />}

            <div className={css.ContentArea}>
                {/* Piece 2: Middle Panel (List of chats/rooms) */}
                <div
                    className={css.SidePanel}
                    data-room-selected={isRoomSelected}
                    data-nav-collapsed={isNavCollapsed}
                >
                    {nav}
                </div>

                {/* Piece 3: Main Room View */}
                <div className={css.MainChatArea} data-room-selected={isRoomSelected}>
                    {children}
                </div>
            </div>
        </div>
    );
}

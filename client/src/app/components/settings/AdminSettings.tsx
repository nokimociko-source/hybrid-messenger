import { logger } from '../../utils/logger';
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import { Spinner, Icon, Icons, Scroll } from 'folds';
import { CatloverModal } from '../CatloverModal';
import { useUserPresence } from '../../hooks/useUserPresence';
import { useQueryClient } from '@tanstack/react-query';

// Admin Tabs
import { AdminTab } from './AdminTabs/types';
import { AdminTheme } from './AdminTabs/theme';
import { UsersTab } from './AdminTabs/UsersTab';
import { RoomsTab } from './AdminTabs/RoomsTab';
import { MessagesTab } from './AdminTabs/MessagesTab';
import { LogsTab } from './AdminTabs/LogsTab';
import { ReportsTab } from './AdminTabs/ReportsTab';

export function AdminSettings() {
    const queryClient = useQueryClient();
    const { isOnline: isUserOnline } = useUserPresence();

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
    const [activeTab, setActiveTab] = useState<AdminTab>('users');

    // Modal state
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        type: 'alert' | 'confirm' | 'prompt';
        title: string;
        message: string;
        confirmLabel?: string;
        cancelLabel?: string;
        onConfirm?: (value?: string) => void;
        isDanger?: boolean;
        placeholder?: string;
        defaultValue?: string;
    }>({
        isOpen: false,
        type: 'alert',
        title: '',
        message: '',
    });

    const showModal = useCallback((config: Partial<typeof modalConfig>) => {
        setModalConfig(prev => ({
            ...prev,
            isOpen: true,
            confirmLabel: 'ОК',
            cancelLabel: 'ОТМЕНА',
            isDanger: false,
            onConfirm: undefined,
            ...config
        }));
    }, []);

    const closeModal = useCallback(() => {
        setModalConfig(prev => ({ ...prev, isOpen: false }));
    }, []);

    // Check if current user is admin
    useEffect(() => {
        const checkAdmin = async () => {
            setIsCheckingAdmin(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setIsAuthenticated(false);
                    return;
                }

                const { data: profile, error } = await supabase
                    .from('users')
                    .select('is_admin')
                    .eq('id', user.id)
                    .single();

                if (error) throw error;
                setIsAuthenticated(!!profile?.is_admin);
            } catch (err) {
                logger.error('Error checking admin status:', err);
                setIsAuthenticated(false);
            } finally {
                setIsCheckingAdmin(false);
            }
        };

        checkAdmin();
    }, []);

    const handleDeleteRoom = (roomId: string) => {
        showModal({
            type: 'confirm',
            title: 'Удаление комнаты',
            message: `Вы уверены, что хотите безвозвратно удалить комнату ${roomId}?`,
            confirmLabel: 'УДАЛИТЬ',
            isDanger: true,
            onConfirm: async () => {
                try {
                    const { error } = await supabase.from('rooms').delete().eq('id', roomId);
                    if (error) throw error;
                    queryClient.invalidateQueries({ queryKey: ['admin', 'rooms'] });
                    showModal({ title: 'Готово', message: 'Комната успешно удалена' });
                } catch (err) {
                    logger.error('Error deleting room:', err);
                    showModal({ title: 'Ошибка', message: 'Не удалось удалить комнату' });
                }
            }
        });
    };

    const handleDeleteMessage = (messageId: string) => {
        showModal({
            type: 'confirm',
            title: 'Удаление сообщения',
            message: 'Удалить это сообщение из системы?',
            confirmLabel: 'УДАЛИТЬ',
            isDanger: true,
            onConfirm: async () => {
                try {
                    const { error } = await supabase.from('messages').delete().eq('id', messageId);
                    if (error) throw error;
                    queryClient.invalidateQueries({ queryKey: ['admin'] }); // Invalidate all admin queries
                    showModal({ title: 'Готово', message: 'Сообщение удалено' });
                } catch (err) {
                    logger.error('Error deleting message:', err);
                    showModal({ title: 'Ошибка', message: 'Не удалось удалить сообщение' });
                }
            }
        });
    };

    const handleClearHistory = () => {
        showModal({
            type: 'confirm',
            title: 'Опасно!',
            message: 'Внимание: Это действие не реализовано напрямую в UI для безопасности. Пожалуйста, используйте SQL Console для массового удаления.',
            confirmLabel: 'ПОНЯТНО',
            isDanger: true
        });
    };

    if (isCheckingAdmin) {
        return (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: AdminTheme.colors.bg }}>
                <Spinner size="400" variant="Secondary" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: AdminTheme.colors.bg, textAlign: 'center' }}>
                <div style={{ maxWidth: '400px' }}>
                    <Icon size="400" src={Icons.Shield} style={{ color: AdminTheme.colors.danger, marginBottom: '24px' }} />
                    <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: '700', margin: '0 0 12px 0' }}>Доступ ограничен</h1>
                    <p style={{ color: AdminTheme.colors.textMuted, lineHeight: '1.6', marginBottom: '24px' }}>
                        Ваш аккаунт не имеет прав администратора. Пожалуйста, выполните следующие шаги:
                    </p>

                    <div style={{ background: 'rgba(255, 60, 60, 0.05)', border: `1px solid ${AdminTheme.colors.danger}`, borderRadius: '12px', padding: '16px', textAlign: 'left', marginBottom: '24px' }}>
                        <ol style={{ margin: 0, paddingLeft: '20px', color: AdminTheme.colors.textMuted, fontSize: '13px' }}>
                            <li style={{ marginBottom: '8px' }}>Запустите SQL-миграцию <code style={{ color: AdminTheme.colors.primary }}>admin_security_overhaul.sql</code> в консоли Supabase.</li>
                            <li>Выполните команду для своего пользователя:<br />
                                <code style={{ display: 'block', background: 'rgba(0,0,0,0.5)', padding: '8px', marginTop: '4px', borderRadius: '4px', color: AdminTheme.colors.success }}>
                                    UPDATE users SET is_admin = true WHERE username = 'Mini Fox';
                                </code>
                            </li>
                        </ol>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: AdminTheme.colors.bg }}>
            {/* Header / Tabs */}
            <div style={{
                padding: '12px 24px',
                background: AdminTheme.colors.tableHeaderBg,
                borderBottom: `1px solid ${AdminTheme.colors.tableBorder}`,
                display: 'flex',
                gap: '8px',
                overflowX: 'auto'
            }}>
                {(['users', 'rooms', 'messages', 'logs', 'reports', 'danger'] as AdminTab[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={AdminTheme.styles.button(activeTab === tab ? 'primary' : 'ghost')}
                    >
                        {tab === 'users' ? 'Пользователи' :
                            tab === 'rooms' ? 'Комнаты' :
                                tab === 'messages' ? 'Сообщения' :
                                    tab === 'logs' ? 'Логи' :
                                        tab === 'reports' ? 'Жалобы' : 'Опасно'}
                    </button>
                ))}
            </div>

            <Scroll style={{ flex: 1 }}>
                <div style={{ padding: '24px' }}>
                    {activeTab === 'users' && <UsersTab isUserOnline={isUserOnline} />}
                    {activeTab === 'rooms' && <RoomsTab onDeleteRoom={handleDeleteRoom} onDeleteMessage={handleDeleteMessage} />}
                    {activeTab === 'messages' && <MessagesTab onDeleteMessage={handleDeleteMessage} />}
                    {activeTab === 'logs' && <LogsTab />}
                    {activeTab === 'reports' && <ReportsTab />}
                    {activeTab === 'danger' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ ...AdminTheme.styles.card, border: `1px solid ${AdminTheme.colors.danger}` }}>
                                <h3 style={{ color: AdminTheme.colors.danger, marginTop: 0 }}>Опасная зона</h3>
                                <p style={{ color: AdminTheme.colors.textMuted }}>Эти действия могут привести к потере данных.</p>
                                <button
                                    onClick={handleClearHistory}
                                    style={AdminTheme.styles.button('danger')}
                                >
                                    ОЧИСТИТЬ ВСЮ ИСТОРИЮ
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </Scroll>

            <CatloverModal
                isOpen={modalConfig.isOpen}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
                confirmLabel={modalConfig.confirmLabel}
                cancelLabel={modalConfig.cancelLabel}
                onConfirm={modalConfig.onConfirm}
                onCancel={closeModal}
                onClose={closeModal}
                isDanger={modalConfig.isDanger}
                placeholder={modalConfig.placeholder}
                defaultValue={modalConfig.defaultValue}
            />
        </div>
    );
}
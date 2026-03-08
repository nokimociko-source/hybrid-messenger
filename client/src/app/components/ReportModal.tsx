import { logger } from '../utils/logger';
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Icon, Icons } from 'folds';

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    reportType: 'user' | 'message' | 'room';
    targetId: string;
    targetName?: string;
    reportedContent?: string;
}

export function ReportModal({ isOpen, onClose, reportType, targetId, targetName, reportedContent }: ReportModalProps) {
    const [reason, setReason] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const reasons = {
        user: ['Спам', 'Оскорбления', 'Угрозы', 'Мошенничество', 'Порнография', 'Другое'],
        message: ['Спам', 'Оскорбления', 'Угрозы', 'Порнография', 'Нарушение авторских прав', 'Другое'],
        room: ['Спам', 'Оскорбления', 'Порнография', 'Мошенничество', 'Нарушение правил', 'Другое']
    };

    useEffect(() => {
        if (!isOpen) {
            setReason('');
            setDescription('');
            setError('');
            setSuccess(false);
            setIsDropdownOpen(false);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason) {
            setError('Выберите причину');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setError('Вы не авторизованы');
                setLoading(false);
                return;
            }

            const reportData: any = {
                reporter_id: user.id,
                reason,
                description: description || null,
                status: 'open'
            };

            if (reportType === 'user') reportData.reported_user_id = targetId;
            else if (reportType === 'message') reportData.reported_message_id = targetId;
            else if (reportType === 'room') reportData.reported_room_id = targetId;

            if (reportedContent) reportData.reported_content = reportedContent;

            const { error: insertError } = await supabase.from('reports').insert([reportData]);
            if (insertError) throw insertError;

            setSuccess(true);
            setTimeout(() => onClose(), 1500);
        } catch (err: any) {
            logger.error('Error submitting report:', err);
            setError(err.message || 'Ошибка при отправке жалобы');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const typeLabel = { user: 'пользователя', message: 'сообщение', room: 'комнату' }[reportType];

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            animation: 'fadeIn 0.2s ease-out'
        }} onClick={onClose}>
            <div style={{
                background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
                border: '1px solid rgba(255, 77, 77, 0.3)',
                borderRadius: '24px',
                width: '400px',
                maxWidth: '90%',
                padding: '24px',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 77, 77, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                animation: 'modalSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative'
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '12px',
                        background: 'rgba(255, 77, 77, 0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff4d4d'
                    }}>
                        <Icon size="200" src={Icons.Info} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#fff' }}>
                        Пожаловаться на {typeLabel}
                    </h3>
                </div>

                {/* Sub-header info */}
                {targetName && (
                    <div style={{
                        color: 'rgba(255,255,255,0.4)', fontSize: '12px',
                        padding: '10px 14px', background: 'rgba(255,255,255,0.03)',
                        borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        На кого жалоба: <span style={{ color: '#fff', fontWeight: '500' }}>{targetName}</span>
                    </div>
                )}

                {/* Reported Content Preview */}
                {reportedContent && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Текст сообщения
                        </span>
                        <div style={{
                            padding: '12px',
                            background: 'rgba(255, 77, 77, 0.02)',
                            borderLeft: '3px solid rgba(255, 77, 77, 0.5)',
                            borderRadius: '8px',
                            fontSize: '13px',
                            color: 'rgba(255, 255, 255, 0.8)',
                            maxHeight: '80px',
                            overflowY: 'auto',
                            wordBreak: 'break-word',
                            fontStyle: 'italic',
                            lineHeight: '1.4'
                        }}>
                            {reportedContent}
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Custom Dropdown */}
                    <div style={{ position: 'relative' }}>
                        <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '8px' }}>
                            Причина жалобы
                        </label>
                        <div
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: `1px solid ${isDropdownOpen ? 'rgba(255, 77, 77, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                                borderRadius: '12px',
                                color: reason ? '#fff' : 'rgba(255,255,255,0.4)',
                                fontSize: '14px',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'all 0.2s'
                            }}
                        >
                            <span>{reason || 'Выберите причину...'}</span>
                            <div style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'rgba(255,255,255,0.3)' }}>
                                <Icon size="100" src={Icons.ChevronBottom} />
                            </div>
                        </div>

                        {isDropdownOpen && (
                            <div style={{
                                position: 'absolute',
                                top: 'calc(100% + 8px)', left: 0, right: 0,
                                background: '#1a1a1a',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                zIndex: 10,
                                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                animation: 'fadeIn 0.1s ease-out'
                            }}>
                                {reasons[reportType].map(r => (
                                    <div
                                        key={r}
                                        onClick={() => {
                                            setReason(r);
                                            setIsDropdownOpen(false);
                                        }}
                                        style={{
                                            padding: '12px 16px',
                                            fontSize: '14px',
                                            color: reason === r ? '#ff4d4d' : '#fff',
                                            background: reason === r ? 'rgba(255, 77, 77, 0.1)' : 'transparent',
                                            cursor: 'pointer',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                                        onMouseLeave={e => e.currentTarget.style.background = reason === r ? 'rgba(255, 77, 77, 0.1)' : 'transparent'}
                                    >
                                        {r}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Description Textarea */}
                    <div>
                        <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '8px' }}>
                            Описание (необязательно)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Расскажите подробнее..."
                            maxLength={500}
                            style={{
                                width: '100%', padding: '12px 16px',
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                color: '#fff', fontSize: '14px',
                                outline: 'none', resize: 'none', minHeight: '90px',
                                transition: 'all 0.2s', fontFamily: 'inherit'
                            }}
                            onFocus={e => e.currentTarget.style.borderColor = 'rgba(255, 77, 77, 0.5)'}
                            onBlur={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                        />
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', marginTop: '4px', textAlign: 'right' }}>
                            {description.length}/500
                        </div>
                    </div>

                    {error && (
                        <div style={{ color: '#ff4d4d', fontSize: '13px', textAlign: 'center', background: 'rgba(255, 77, 77, 0.1)', padding: '10px', borderRadius: '12px' }}>
                            {error}
                        </div>
                    )}

                    {success && (
                        <div style={{ color: '#00f2ff', fontSize: '13px', textAlign: 'center', background: 'rgba(0, 242, 255, 0.1)', padding: '10px', borderRadius: '12px' }}>
                            ✓ Жалоба отправлена. Спасибо за бдительность!
                        </div>
                    )}

                    {/* Footer Buttons */}
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            type="button" onClick={onClose}
                            style={{
                                flex: 1, padding: '14px',
                                background: 'transparent',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '14px',
                                color: 'rgba(255, 255, 255, 0.5)',
                                fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'; }}
                        >
                            Отмена
                        </button>
                        <button
                            type="submit" disabled={loading || !reason}
                            style={{
                                flex: 1, padding: '14px',
                                background: 'rgba(255, 77, 77, 0.15)',
                                border: '1px solid rgba(255, 77, 77, 0.3)',
                                borderRadius: '14px',
                                color: '#ff4d4d', fontSize: '14px', fontWeight: '600',
                                cursor: loading || !reason ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                opacity: loading || !reason ? 0.5 : 1
                            }}
                            onMouseEnter={e => !loading && reason && (e.currentTarget.style.background = 'rgba(255, 77, 77, 0.25)')}
                            onMouseLeave={e => !loading && reason && (e.currentTarget.style.background = 'rgba(255, 77, 77, 0.15)')}
                        >
                            {loading ? 'Отправка...' : 'Отправить'}
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes modalSlideIn {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}

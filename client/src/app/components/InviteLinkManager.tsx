import React, { useState } from 'react';
import { Icon, Icons, Spinner } from 'folds';
import { useInviteLinks } from '../hooks/useInviteLinks';
import { CatloverModal } from './CatloverModal';

interface InviteLinkManagerProps {
  roomId: string;
  onClose: () => void;
}

export function InviteLinkManager({ roomId, onClose }: InviteLinkManagerProps) {
  const { links, loading, createLink, revokeLink, deleteLink, getFullLink } = useInviteLinks(roomId);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState<number | undefined>(undefined);
  const [maxUses, setMaxUses] = useState<number | undefined>(undefined);
  const [creating, setCreating] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm' | 'prompt';
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: (value?: string) => void;
    isDanger?: boolean;
  }>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
  });

  const handleCreate = async () => {
    setCreating(true);
    const link = await createLink({
      expiresInHours,
      maxUses,
    });
    setCreating(false);

    if (link) {
      setShowCreateForm(false);
      setExpiresInHours(undefined);
      setMaxUses(undefined);
    }
  };

  const handleCopy = (linkCode: string, linkId: string) => {
    const fullLink = getFullLink(linkCode);
    navigator.clipboard.writeText(fullLink);
    setCopiedLinkId(linkId);
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isExpired = (link: any) => {
    if (!link.expires_at) return false;
    return new Date(link.expires_at) < new Date();
  };

  const isMaxedOut = (link: any) => {
    if (!link.max_uses) return false;
    return link.current_uses >= link.max_uses;
  };

  const onRevokeConfirm = (linkId: string) => {
    setModalConfig({
      isOpen: true,
      type: 'confirm',
      title: 'Отозвать ссылку',
      message: 'Вы действительно хотите отозвать эту ссылку? Новые пользователи не смогут по ней войти.',
      confirmLabel: 'Отозвать',
      cancelLabel: 'Отмена',
      isDanger: true,
      onConfirm: async () => {
        await revokeLink(linkId);
        setModalConfig((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const onDeleteConfirm = (linkId: string) => {
    setModalConfig({
      isOpen: true,
      type: 'confirm',
      title: 'Удалить ссылку',
      message: 'Удалить запись об этой ссылке из истории?',
      confirmLabel: 'Удалить',
      cancelLabel: 'Отмена',
      isDanger: true,
      onConfirm: async () => {
        await deleteLink(linkId);
        setModalConfig((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'linear-gradient(135deg, rgba(15, 15, 15, 0.98) 0%, rgba(20, 20, 20, 0.98) 100%)',
            border: '1px solid rgba(0, 242, 255, 0.3)',
            borderRadius: '20px',
            padding: '32px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#fff' }}>
              Пригласительные ссылки
            </h2>
            <div onClick={onClose} style={{ cursor: 'pointer', color: '#888' }}>
              <Icon size="200" src={Icons.Cross} />
            </div>
          </div>

          {/* Create Button */}
          {!showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #00f2ff 0%, #0099ff 100%)',
                border: 'none',
                borderRadius: '12px',
                color: '#000',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                marginBottom: '20px',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              + Создать новую ссылку
            </button>
          )}

          {/* Create Form */}
          {showCreateForm && (
            <div
              style={{
                background: 'rgba(0, 242, 255, 0.05)',
                border: '1px solid rgba(0, 242, 255, 0.2)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '20px',
              }}
            >
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#00f2ff' }}>Настройки ссылки</h3>

              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="link-expiry-input" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#aaa' }}>
                  Срок действия (часов)
                </label>
                <input
                  id="link-expiry-input"
                  name="link-expiry"
                  type="number"
                  placeholder="Без ограничений"
                  value={expiresInHours || ''}
                  onChange={(e) => setExpiresInHours(e.target.value ? parseInt(e.target.value) : undefined)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="link-max-uses-input" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#aaa' }}>
                  Максимум использований
                </label>
                <input
                  id="link-max-uses-input"
                  name="link-max-uses"
                  type="number"
                  placeholder="Без ограничений"
                  value={maxUses || ''}
                  onChange={(e) => setMaxUses(e.target.value ? parseInt(e.target.value) : undefined)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#00f2ff',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#000',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: creating ? 'not-allowed' : 'pointer',
                    opacity: creating ? 0.6 : 1,
                  }}
                >
                  {creating ? 'Создание...' : 'Создать'}
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Отмена
                </button>
              </div>
            </div>
          )}

          {/* Links List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spinner variant="Secondary" />
            </div>
          ) : links.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              Нет активных ссылок
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {links.map((link) => {
                const expired = isExpired(link);
                const maxedOut = isMaxedOut(link);
                const inactive = !link.is_active || expired || maxedOut;

                return (
                  <div
                    key={link.id}
                    style={{
                      background: inactive ? 'rgba(255,255,255,0.03)' : 'rgba(0, 242, 255, 0.05)',
                      border: `1px solid ${inactive ? 'rgba(255,255,255,0.1)' : 'rgba(0, 242, 255, 0.2)'}`,
                      borderRadius: '12px',
                      padding: '16px',
                      opacity: inactive ? 0.6 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div
                        style={{
                          flex: 1,
                          background: 'rgba(0,0,0,0.3)',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          color: '#00f2ff',
                          fontFamily: 'monospace',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {getFullLink(link.link_code)}
                      </div>
                      <button
                        onClick={() => handleCopy(link.link_code, link.id)}
                        style={{
                          padding: '10px 16px',
                          background: copiedLinkId === link.id ? '#00ff88' : 'rgba(0, 242, 255, 0.2)',
                          border: 'none',
                          borderRadius: '8px',
                          color: copiedLinkId === link.id ? '#000' : '#00f2ff',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        {copiedLinkId === link.id ? '✓ Скопировано' : 'Копировать'}
                      </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888', marginBottom: '8px' }}>
                      <span>
                        Использований: {link.current_uses}
                        {link.max_uses && ` / ${link.max_uses}`}
                      </span>
                      {link.expires_at && (
                        <span style={{ color: expired ? '#ff4d4d' : '#888' }}>
                          {expired ? 'Истекла' : `До ${formatDate(link.expires_at)}`}
                        </span>
                      )}
                    </div>

                    {!inactive && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => onRevokeConfirm(link.id)}
                          style={{
                            flex: 1,
                            padding: '8px',
                            background: 'rgba(255, 77, 77, 0.1)',
                            border: '1px solid rgba(255, 77, 77, 0.3)',
                            borderRadius: '6px',
                            color: '#ff4d4d',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          Отозвать
                        </button>
                        <button
                          onClick={() => onDeleteConfirm(link.id)}
                          style={{
                            flex: 1,
                            padding: '8px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '6px',
                            color: '#888',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          Удалить
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Global Modal */}
        <CatloverModal
          isOpen={modalConfig.isOpen}
          type={modalConfig.type}
          title={modalConfig.title}
          message={modalConfig.message}
          confirmLabel={modalConfig.confirmLabel}
          cancelLabel={modalConfig.cancelLabel}
          isDanger={modalConfig.isDanger}
          onConfirm={modalConfig.onConfirm}
          onCancel={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
          onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
        />
      </div>
    </>
  );
}

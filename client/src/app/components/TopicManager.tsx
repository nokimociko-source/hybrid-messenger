import React, { useState } from 'react';
import { Icon, Icons, Spinner } from 'folds';
import { useRoomTopics } from '../hooks/useRoomTopics';
import { CatloverModal } from './CatloverModal';

interface TopicManagerProps {
  roomId: string;
  onClose: () => void;
  onSelectTopic?: (topicId: string | null) => void;
}

export function TopicManager({ roomId, onClose, onSelectTopic }: TopicManagerProps) {
  const { topics, loading, createTopic, updateTopic, deleteTopic } = useRoomTopics(roomId);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [description, setDescription] = useState('');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('💬');
  const [creating, setCreating] = useState(false);

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
    message: ''
  });

  const commonIcons = ['💬', '📢', '🎯', '💡', '🔥', '⭐', '📝', '🎨', '🎮', '📚', '🎵', '🍕'];

  const handleCreate = async () => {
    if (!name.trim()) {
      setModalConfig({
        isOpen: true,
        type: 'alert',
        title: 'Ошибка',
        message: 'Введите название темы',
        isDanger: true
      });
      return;
    }

    setCreating(true);
    const topic = await createTopic({
      name: name.trim(),
      icon,
      description: description.trim() || undefined,
    });
    setCreating(false);

    if (topic) {
      setShowCreateForm(false);
      setName('');
      setIcon('💬');
      setDescription('');
    }
  };

  const handleDelete = async (topicId: string, topicName: string) => {
    setModalConfig({
      isOpen: true,
      type: 'confirm',
      title: 'Удалить тему',
      message: `Удалить тему "${topicName}"? Сообщения останутся, но потеряют привязку к теме.`,
      confirmLabel: 'Удалить',
      cancelLabel: 'Отмена',
      isDanger: true,
      onConfirm: async () => {
        await deleteTopic(topicId);
      }
    });
  };

  const handleToggleClosed = async (topicId: string, isClosed: boolean) => {
    await updateTopic(topicId, { is_closed: !isClosed });
  };

  return (
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
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#fff' }}>Темы группы</h2>
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
            }}
          >
            + Создать тему
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
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#00f2ff' }}>Новая тема</h3>

            {/* Icon Selector */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#aaa' }}>
                Иконка
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {commonIcons.map((emoji) => (
                  <div
                    key={emoji}
                    onClick={() => setIcon(emoji)}
                    style={{
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      background: icon === emoji ? 'rgba(0, 242, 255, 0.2)' : 'rgba(255,255,255,0.05)',
                      border: `2px solid ${icon === emoji ? '#00f2ff' : 'transparent'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {emoji}
                  </div>
                ))}
              </div>
            </div>

            {/* Name */}
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="topic-name-input" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#aaa' }}>
                Название
              </label>
              <input
                id="topic-name-input"
                name="topic-name"
                type="text"
                placeholder="Например: Общее обсуждение"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
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

            {/* Description */}
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="topic-description-input" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#aaa' }}>
                Описание (необязательно)
              </label>
              <textarea
                id="topic-description-input"
                name="topic-description"
                placeholder="Краткое описание темы..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  resize: 'none',
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

        {/* Topics List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spinner variant="Secondary" />
          </div>
        ) : topics.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Нет тем</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* All Messages (no topic) */}
            <div
              onClick={() => onSelectTopic?.(null)}
              style={{
                background: 'rgba(0, 242, 255, 0.05)',
                border: '1px solid rgba(0, 242, 255, 0.2)',
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0, 242, 255, 0.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0, 242, 255, 0.05)')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '24px' }}>💬</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#fff' }}>Все сообщения</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>Без привязки к теме</div>
                </div>
              </div>
            </div>

            {/* Topics */}
            {topics.map((topic) => (
              <div
                key={topic.id}
                style={{
                  background: topic.is_closed ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '16px',
                  opacity: topic.is_closed ? 0.6 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                  <div style={{ fontSize: '24px' }}>{topic.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#fff', marginBottom: '4px' }}>
                      {topic.name}
                      {topic.is_closed && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#ff4d4d' }}>🔒 Закрыта</span>}
                    </div>
                    {topic.description && (
                      <div style={{ fontSize: '13px', color: '#aaa', marginBottom: '8px' }}>{topic.description}</div>
                    )}
                    <div style={{ fontSize: '12px', color: '#888' }}>
                      {topic.message_count || 0} сообщений
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button
                    onClick={() => onSelectTopic?.(topic.id)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: 'rgba(0, 242, 255, 0.1)',
                      border: '1px solid rgba(0, 242, 255, 0.3)',
                      borderRadius: '6px',
                      color: '#00f2ff',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    Открыть
                  </button>
                  <button
                    onClick={() => handleToggleClosed(topic.id, topic.is_closed)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    {topic.is_closed ? 'Открыть' : 'Закрыть'}
                  </button>
                  <button
                    onClick={() => handleDelete(topic.id, topic.name)}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(255, 77, 77, 0.1)',
                      border: '1px solid rgba(255, 77, 77, 0.3)',
                      borderRadius: '6px',
                      color: '#ff4d4d',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CatloverModal
        isOpen={modalConfig.isOpen}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmLabel={modalConfig.confirmLabel}
        cancelLabel={modalConfig.cancelLabel}
        onConfirm={(val) => {
          modalConfig.onConfirm?.(val);
          setModalConfig((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
        isDanger={modalConfig.isDanger}
      />
    </div>
  );
}

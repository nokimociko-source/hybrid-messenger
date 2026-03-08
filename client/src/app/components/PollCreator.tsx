import { logger } from '../utils/logger';
import React, { useState } from 'react';
import { Icon, Icons } from 'folds';
import { CatloverModal } from './CatloverModal';

interface PollCreatorProps {
  onClose: () => void;
  onCreate: (data: {
    question: string;
    options: string[];
    isAnonymous: boolean;
    allowsMultiple: boolean;
    closesInHours?: number;
  }) => Promise<void>;
}

export function PollCreator({ onClose, onCreate }: PollCreatorProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [allowsMultiple, setAllowsMultiple] = useState(false);
  const [closesInHours, setClosesInHours] = useState<number | undefined>(undefined);
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

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCreate = async () => {
    const validOptions = options.filter((o) => o.trim());
    if (!question.trim() || validOptions.length < 2) {
      setModalConfig({
        isOpen: true,
        type: 'alert',
        title: 'Ошибка',
        message: 'Введите вопрос и минимум 2 варианта ответа',
        isDanger: true
      });
      return;
    }

    setCreating(true);
    try {
      await onCreate({
        question: question.trim(),
        options: validOptions,
        isAnonymous,
        allowsMultiple,
        closesInHours,
      });
      onClose();
    } catch (err) {
      logger.error('Error creating poll:', err);
      setModalConfig({
        isOpen: true,
        type: 'alert',
        title: 'Ошибка',
        message: 'Не удалось создать опрос',
        isDanger: true
      });
    } finally {
      setCreating(false);
    }
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
          maxWidth: '500px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#fff' }}>Создать опрос</h2>
          <div onClick={onClose} style={{ cursor: 'pointer', color: '#888' }}>
            <Icon size="200" src={Icons.Cross} />
          </div>
        </div>

        {/* Question */}
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="poll-question-input" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#aaa' }}>
            Вопрос
          </label>
          <input
            id="poll-question-input"
            name="poll-question"
            type="text"
            placeholder="Введите вопрос..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={200}
            style={{
              width: '100%',
              padding: '12px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
            }}
          />
        </div>

        {/* Options */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#aaa' }}>
            Варианты ответа
          </label>
          {options.map((option, index) => (
            <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <label htmlFor={`poll-option-${index}`} style={{ display: 'none' }}>Вариант {index + 1}</label>
              <input
                id={`poll-option-${index}`}
                name={`poll-option-${index}`}
                type="text"
                placeholder={`Вариант ${index + 1}`}
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                maxLength={100}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                }}
              />
              {options.length > 2 && (
                <button
                  onClick={() => removeOption(index)}
                  style={{
                    padding: '10px',
                    background: 'rgba(255, 77, 77, 0.1)',
                    border: '1px solid rgba(255, 77, 77, 0.3)',
                    borderRadius: '8px',
                    color: '#ff4d4d',
                    cursor: 'pointer',
                  }}
                >
                  <Icon size="200" src={Icons.Cross} />
                </button>
              )}
            </div>
          ))}
          {options.length < 10 && (
            <button
              onClick={addOption}
              style={{
                width: '100%',
                padding: '10px',
                background: 'rgba(0, 242, 255, 0.1)',
                border: '1px solid rgba(0, 242, 255, 0.3)',
                borderRadius: '8px',
                color: '#00f2ff',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              + Добавить вариант
            </button>
          )}
        </div>

        {/* Settings */}
        <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              id="poll-anonymous-checkbox"
              name="poll-anonymous"
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '14px', color: '#fff' }}>Анонимное голосование</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              id="poll-multiple-checkbox"
              name="poll-multiple"
              type="checkbox"
              checked={allowsMultiple}
              onChange={(e) => setAllowsMultiple(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '14px', color: '#fff' }}>Множественный выбор</span>
          </label>

          <div>
            <label htmlFor="poll-closes-input" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#aaa' }}>
              Закрыть через (часов)
            </label>
            <input
              id="poll-closes-input"
              name="poll-closes"
              type="number"
              placeholder="Без ограничений"
              value={closesInHours || ''}
              onChange={(e) => setClosesInHours(e.target.value ? parseInt(e.target.value) : undefined)}
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
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleCreate}
            disabled={creating}
            style={{
              flex: 1,
              padding: '14px',
              background: creating ? '#666' : 'linear-gradient(135deg, #00f2ff 0%, #0099ff 100%)',
              border: 'none',
              borderRadius: '12px',
              color: creating ? '#aaa' : '#000',
              fontSize: '15px',
              fontWeight: '600',
              cursor: creating ? 'not-allowed' : 'pointer',
            }}
          >
            {creating ? 'Создание...' : 'Создать опрос'}
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '14px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Отмена
          </button>
        </div>
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

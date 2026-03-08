import { logger } from '../utils/logger';
/**
 * Key Migration Prompt Component
 * 
 * Displays a prompt to users with legacy keys in localStorage,
 * guiding them through the migration process to secure IndexedDB storage.
 * 
 * Features:
 * - Password input with validation
 * - Migration progress indicator
 * - Success/error messages
 * - "Skip for now" option
 * - Migration status display
 */

import React, { useState, useEffect } from 'react';
import { KeyMigration, MigrationStatus } from '../utils/keyMigration';
import { SecureKeyStorage } from '../utils/secureKeyStorage';

interface KeyMigrationPromptProps {
  onClose: () => void;
  onMigrationComplete?: () => void;
}

type MigrationState = 'idle' | 'checking' | 'migrating' | 'success' | 'error';

export function KeyMigrationPrompt({ onClose, onMigrationComplete }: KeyMigrationPromptProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [migrationState, setMigrationState] = useState<MigrationState>('checking');
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');

  useEffect(() => {
    checkMigrationStatus();
  }, []);

  const checkMigrationStatus = async () => {
    try {
      const secureStorage = new SecureKeyStorage();
      const migration = new KeyMigration(secureStorage);
      const status = await migration.checkMigrationStatus();
      setMigrationStatus(status);
      
      if (!status.migrationRequired) {
        setMigrationState('idle');
        // If no migration needed, close the prompt
        if (!status.hasLegacyKeys) {
          onClose();
        }
      } else {
        setMigrationState('idle');
      }
    } catch (error) {
      logger.error('Failed to check migration status:', error);
      setErrorMessage('Не удалось проверить статус миграции');
      setMigrationState('error');
    }
  };

  const validatePassword = (): boolean => {
    setPasswordError('');

    if (!password) {
      setPasswordError('Пожалуйста, введите пароль');
      return false;
    }

    if (password.length < 8) {
      setPasswordError('Пароль должен содержать минимум 8 символов');
      return false;
    }

    if (password !== confirmPassword) {
      setPasswordError('Пароли не совпадают');
      return false;
    }

    return true;
  };

  const handleMigrate = async () => {
    if (!validatePassword()) {
      return;
    }

    setMigrationState('migrating');
    setErrorMessage('');

    try {
      const secureStorage = new SecureKeyStorage();
      await secureStorage.initialize();
      
      const migration = new KeyMigration(secureStorage);
      const success = await migration.migrate(password);

      if (success) {
        setMigrationState('success');
        setTimeout(() => {
          onMigrationComplete?.();
          onClose();
        }, 2000);
      } else {
        setMigrationState('error');
        setErrorMessage('Миграция не удалась. Ваши ключи остались в безопасности.');
      }
    } catch (error) {
      logger.error('Migration failed:', error);
      setMigrationState('error');
      setErrorMessage(
        error instanceof Error 
          ? error.message 
          : 'Произошла ошибка при миграции ключей'
      );
    }
  };

  const handleSkip = () => {
    // User chose to skip migration for now
    onClose();
  };

  if (migrationState === 'checking') {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
            border: '1px solid rgba(0, 242, 255, 0.3)',
            borderRadius: '16px',
            padding: '32px',
            minWidth: '400px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>🔍</div>
          <div style={{ fontSize: '16px', color: '#fff' }}>
            Проверка статуса миграции...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && migrationState !== 'migrating') {
          handleSkip();
        }
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
          border: '1px solid rgba(0, 242, 255, 0.3)',
          borderRadius: '16px',
          padding: '24px',
          minWidth: '500px',
          maxWidth: '90%',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3
            style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#fff',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '24px' }}>🔐</span>
            Миграция ключей шифрования
          </h3>
          {migrationState !== 'migrating' && (
            <div
              onClick={handleSkip}
              style={{
                cursor: 'pointer',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '24px',
                lineHeight: '1',
                padding: '4px 8px',
              }}
            >
              ×
            </div>
          )}
        </div>

        {/* Migration Status Info */}
        {migrationStatus?.migrationRequired && migrationState === 'idle' && (
          <div
            style={{
              padding: '16px',
              background: 'rgba(255, 200, 0, 0.1)',
              border: '1px solid rgba(255, 200, 0, 0.3)',
              borderRadius: '12px',
            }}
          >
            <div style={{ fontSize: '15px', color: '#ffc800', fontWeight: '500', marginBottom: '8px' }}>
              ⚠️ Требуется миграция ключей
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.6' }}>
              Обнаружены ключи шифрования в устаревшем хранилище. Для повышения безопасности 
              рекомендуется мигрировать их в защищенное хранилище с шифрованием на основе пароля.
            </div>
          </div>
        )}

        {/* Success State */}
        {migrationState === 'success' && (
          <div
            style={{
              padding: '24px',
              background: 'rgba(0, 242, 255, 0.1)',
              border: '1px solid rgba(0, 242, 255, 0.3)',
              borderRadius: '12px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
            <div style={{ fontSize: '18px', color: '#00f2ff', fontWeight: '600', marginBottom: '8px' }}>
              Миграция завершена успешно!
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>
              Ваши ключи теперь надежно защищены
            </div>
          </div>
        )}

        {/* Error State */}
        {migrationState === 'error' && errorMessage && (
          <div
            style={{
              padding: '16px',
              background: 'rgba(255, 0, 0, 0.1)',
              border: '1px solid rgba(255, 0, 0, 0.3)',
              borderRadius: '12px',
            }}
          >
            <div style={{ fontSize: '15px', color: '#ff4444', fontWeight: '500', marginBottom: '8px' }}>
              ❌ Ошибка миграции
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)' }}>
              {errorMessage}
            </div>
          </div>
        )}

        {/* Migration Form */}
        {(migrationState === 'idle' || migrationState === 'error') && migrationStatus?.migrationRequired && (
          <>
            {/* Info Section */}
            <div
              style={{
                padding: '16px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
              }}
            >
              <div style={{ fontSize: '15px', color: '#fff', fontWeight: '500', marginBottom: '8px' }}>
                Что произойдет?
              </div>
              <ul
                style={{
                  fontSize: '13px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  lineHeight: '1.6',
                  margin: 0,
                  paddingLeft: '20px',
                }}
              >
                <li>Ваши ключи будут зашифрованы с использованием пароля</li>
                <li>Ключи будут перемещены в защищенное хранилище IndexedDB</li>
                <li>Старые ключи будут удалены из localStorage</li>
                <li>Все существующие зашифрованные сообщения останутся доступными</li>
              </ul>
            </div>

            {/* Password Input */}
            <div
              style={{
                padding: '16px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
              }}
            >
              <div style={{ fontSize: '15px', color: '#fff', fontWeight: '500', marginBottom: '12px' }}>
                Установите пароль для защиты ключей
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <label
                  htmlFor="migration-password"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    marginBottom: '6px',
                  }}
                >
                  Пароль (минимум 8 символов)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="migration-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Введите пароль"
                    style={{
                      width: '100%',
                      padding: '10px 40px 10px 12px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(0, 242, 255, 0.5)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: 'rgba(255, 255, 255, 0.5)',
                      cursor: 'pointer',
                      fontSize: '18px',
                      padding: '4px 8px',
                    }}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label
                  htmlFor="migration-confirm-password"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    marginBottom: '6px',
                  }}
                >
                  Подтвердите пароль
                </label>
                <input
                  id="migration-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Повторите пароль"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(0, 242, 255, 0.5)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  }}
                />
              </div>

              {passwordError && (
                <div
                  style={{
                    fontSize: '13px',
                    color: '#ff4444',
                    marginTop: '8px',
                  }}
                >
                  {passwordError}
                </div>
              )}

              <div
                style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  marginTop: '8px',
                }}
              >
                💡 Совет: Используйте надежный пароль, который вы сможете запомнить. 
                Потеря пароля приведет к невозможности расшифровать ваши ключи.
              </div>
            </div>
          </>
        )}

        {/* Migration Progress */}
        {migrationState === 'migrating' && (
          <div
            style={{
              padding: '24px',
              background: 'rgba(0, 242, 255, 0.05)',
              border: '1px solid rgba(0, 242, 255, 0.2)',
              borderRadius: '12px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                margin: '0 auto 16px',
                border: '4px solid rgba(0, 242, 255, 0.2)',
                borderTop: '4px solid #00f2ff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <div style={{ fontSize: '16px', color: '#00f2ff', fontWeight: '500', marginBottom: '8px' }}>
              Миграция ключей...
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)' }}>
              Пожалуйста, подождите. Это может занять несколько секунд.
            </div>
          </div>
        )}

        {/* Actions */}
        {(migrationState === 'idle' || migrationState === 'error') && migrationStatus?.migrationRequired && (
          <div
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              paddingTop: '8px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <button
              onClick={handleSkip}
              disabled={migrationState === 'migrating'}
              style={{
                padding: '10px 20px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                cursor: migrationState === 'migrating' ? 'not-allowed' : 'pointer',
                opacity: migrationState === 'migrating' ? 0.5 : 1,
              }}
            >
              Пропустить
            </button>
            <button
              onClick={handleMigrate}
              disabled={migrationState === 'migrating' || !password || !confirmPassword}
              style={{
                padding: '10px 20px',
                background: 
                  migrationState === 'migrating' || !password || !confirmPassword
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(0, 242, 255, 0.2)',
                border: `1px solid ${
                  migrationState === 'migrating' || !password || !confirmPassword
                    ? 'rgba(255, 255, 255, 0.2)'
                    : 'rgba(0, 242, 255, 0.5)'
                }`,
                borderRadius: '8px',
                color: 
                  migrationState === 'migrating' || !password || !confirmPassword
                    ? 'rgba(255, 255, 255, 0.5)'
                    : '#00f2ff',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 
                  migrationState === 'migrating' || !password || !confirmPassword
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              {migrationState === 'migrating' ? 'Миграция...' : 'Мигрировать ключи'}
            </button>
          </div>
        )}

        {/* Retry button for error state */}
        {migrationState === 'error' && (
          <div
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              paddingTop: '8px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <button
              onClick={handleSkip}
              style={{
                padding: '10px 20px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Закрыть
            </button>
            <button
              onClick={() => {
                setMigrationState('idle');
                setErrorMessage('');
                setPassword('');
                setConfirmPassword('');
              }}
              style={{
                padding: '10px 20px',
                background: 'rgba(0, 242, 255, 0.2)',
                border: '1px solid rgba(0, 242, 255, 0.5)',
                borderRadius: '8px',
                color: '#00f2ff',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              Попробовать снова
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default KeyMigrationPrompt;

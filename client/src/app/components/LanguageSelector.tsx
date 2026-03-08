import React from 'react';
import { Box, Text, Button, Menu, MenuItem, Icon, Icons } from 'folds';
import { useI18n, SupportedLanguage } from '../hooks/useI18n';

interface LanguageSelectorProps {
  variant?: 'button' | 'dropdown';
  size?: 'small' | 'medium' | 'large';
}

export function LanguageSelector({ variant = 'dropdown', size = 'medium' }: LanguageSelectorProps) {
  const { t, currentLanguage, setLanguage, availableLanguages, languageNames } = useI18n();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleLanguageChange = async (lang: SupportedLanguage) => {
    await setLanguage(lang);
    setIsOpen(false);
  };

  if (variant === 'button') {
    return (
      <Box direction="Column" gap="200">
        <Text size="T300" priority="300">
          {t('settings.language')}
        </Text>
        <Box direction="Row" gap="200" wrap="Wrap">
          {availableLanguages.map((lang) => (
            <Button
              key={lang}
              variant={currentLanguage === lang ? 'Primary' : 'Secondary'}
              size={size === 'small' ? '300' : size === 'large' ? '500' : '400'}
              onClick={() => handleLanguageChange(lang)}
            >
              {languageNames[lang]}
            </Button>
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box direction="Column" gap="200">
      <Text size="T300" priority="300">
        {t('settings.language')}
      </Text>
      <div style={{ position: 'relative' }}>
        <Button
          variant="Secondary"
          size={size === 'small' ? '300' : size === 'large' ? '500' : '400'}
          after={<Icon src={Icons.ChevronBottom} size="100" />}
          onClick={() => setIsOpen(!isOpen)}
        >
          <Box direction="Row" gap="200" alignItems="Center">
            <Icon src={Icons.Globe} size="100" />
            <Text size="T300">{languageNames[currentLanguage]}</Text>
          </Box>
        </Button>
        
        {isOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'var(--bg-surface)',
            border: '1px solid var(--bg-surface-border)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            marginTop: '4px'
          }}>
            {availableLanguages.map((lang) => (
              <div
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderRadius: '6px',
                  margin: '4px',
                  background: currentLanguage === lang ? 'var(--bg-surface-hover)' : 'transparent'
                }}
                onMouseEnter={(e) => {
                  if (currentLanguage !== lang) {
                    e.currentTarget.style.background = 'var(--bg-surface-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentLanguage !== lang) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {currentLanguage === lang && <Icon src={Icons.Check} size="100" />}
                <Text size="T300">{languageNames[lang]}</Text>
              </div>
            ))}
          </div>
        )}
      </div>
    </Box>
  );
}

// Compact version for header/toolbar
export function LanguageSelectorCompact() {
  const { currentLanguage, setLanguage, availableLanguages, languageNames } = useI18n();
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <Button 
        variant="Secondary" 
        size="300" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <Box direction="Row" gap="100" alignItems="Center">
          <Icon src={Icons.Globe} size="100" />
          <Text size="T200">{currentLanguage.toUpperCase()}</Text>
        </Box>
      </Button>
      
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          minWidth: '150px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--bg-surface-border)',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 1000,
          marginTop: '4px'
        }}>
          {availableLanguages.map((lang) => (
            <div
              key={lang}
              onClick={() => {
                setLanguage(lang);
                setIsOpen(false);
              }}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '6px',
                margin: '4px',
                background: currentLanguage === lang ? 'var(--bg-surface-hover)' : 'transparent'
              }}
              onMouseEnter={(e) => {
                if (currentLanguage !== lang) {
                  e.currentTarget.style.background = 'var(--bg-surface-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (currentLanguage !== lang) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {currentLanguage === lang && <Icon src={Icons.Check} size="100" />}
              <Text size="T300">{languageNames[lang]}</Text>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
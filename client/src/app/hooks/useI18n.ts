import { logger } from '../utils/logger';
import { useState, useEffect, useCallback } from 'react';

export type SupportedLanguage = 'en' | 'ru' | 'de' | 'es' | 'fr' | 'zh' | 'ja' | 'ko';

interface I18nData {
  [key: string]: string | I18nData;
}

const STORAGE_KEY = 'hybrid_messenger_language';
const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

// Language names for display
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  ru: 'Русский',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  zh: '中文',
  ja: '日本語',
  ko: '한국어'
};

class I18nManager {
  private currentLanguage: SupportedLanguage = DEFAULT_LANGUAGE;
  private translations: Record<SupportedLanguage, I18nData> = {} as any;
  private listeners: Set<() => void> = new Set();

  constructor() {
    // Load saved language from localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && this.isValidLanguage(saved)) {
      this.currentLanguage = saved as SupportedLanguage;
    } else {
      // Try to detect browser language
      const browserLang = navigator.language.split('-')[0];
      if (this.isValidLanguage(browserLang)) {
        this.currentLanguage = browserLang as SupportedLanguage;
      }
    }
  }

  private isValidLanguage(lang: string): boolean {
    return Object.keys(LANGUAGE_NAMES).includes(lang);
  }

  async loadLanguage(lang: SupportedLanguage): Promise<void> {
    if (this.translations[lang]) {
      return; // Already loaded
    }

    try {
      // Fetch from public/locales directory
      // In dev: served from public folder
      // In prod: copied to dist/public/locales by vite-plugin-static-copy
      const response = await fetch(`/public/locales/${lang}.json`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch locale file for ${lang}`);
      }

      const data = await response.json();
      this.translations[lang] = data;
    } catch (error) {
      logger.warn(`Failed to load language ${lang}:`, error);
      if (lang !== 'en') {
        // Fallback to English if language not available
        await this.loadLanguage('en');
      }
    }
  }

  async setLanguage(lang: SupportedLanguage): Promise<void> {
    if (lang === this.currentLanguage) return;

    await this.loadLanguage(lang);
    this.currentLanguage = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    this.notifyListeners();
  }

  getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  translate(key: string, params?: Record<string, string | number>): string {
    // Try current language first
    let translation = this.getNestedValue(this.translations[this.currentLanguage], key);
    
    // Fallback to English if not found
    if (!translation) {
      translation = this.getNestedValue(this.translations['en'], key);
    }
    
    // If still not found, return the key itself
    if (!translation) {
      logger.warn(`Translation key not found: ${key}`);
      return key;
    }

    // Interpolate parameters if provided
    if (params && typeof translation === 'string') {
      return this.interpolate(translation, params);
    }

    return typeof translation === 'string' ? translation : key;
  }

  private getNestedValue(obj: I18nData | undefined, path: string): string | undefined {
    if (!obj) return undefined;
    
    const keys = path.split('.');
    let current: any = obj;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    
    return typeof current === 'string' ? current : undefined;
  }

  private interpolate(template: string, params: Record<string, string | number>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return params[key]?.toString() || match;
    });
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  async initialize(): Promise<void> {
    try {
      // Load current language
      await this.loadLanguage(this.currentLanguage);
      // Also preload English as fallback
      if (this.currentLanguage !== 'en') {
        await this.loadLanguage('en');
      }
    } catch (error) {
      logger.warn('Failed to initialize i18n:', error);
    }
  }
}

const i18nManager = new I18nManager();

export function useI18n() {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const unsubscribe = i18nManager.subscribe(() => {
      forceUpdate({});
    });

    // Initialize on first use
    i18nManager.initialize();

    return unsubscribe;
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    return i18nManager.translate(key, params);
  }, []);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    return i18nManager.setLanguage(lang);
  }, []);

  const currentLanguage = i18nManager.getCurrentLanguage();

  return {
    t,
    setLanguage,
    currentLanguage,
    availableLanguages: Object.keys(LANGUAGE_NAMES) as SupportedLanguage[],
    languageNames: LANGUAGE_NAMES
  };
}

export default i18nManager;
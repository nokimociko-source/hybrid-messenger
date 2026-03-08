import { logger } from './logger';
/**
 * I18n setup and initialization
 * This file should be imported early in the app lifecycle
 */

import i18nManager from '../hooks/useI18n';

// Initialize i18n on app startup
export async function initializeI18n(): Promise<void> {
  try {
    await i18nManager.initialize();
  } catch (error) {
    logger.warn('Failed to initialize i18n:', error);
  }
}

// Export for use in main app
export { i18nManager };
export default initializeI18n;
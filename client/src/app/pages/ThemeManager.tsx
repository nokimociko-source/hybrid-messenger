import React, { ReactNode, useEffect } from 'react';
import { configClass, varsClass } from 'folds';
import { useTheme } from '../hooks/useTheme';
import { useSetting } from '../state/hooks/settings';
import { settingsAtom } from '../state/settings';

export function UnAuthRouteThemeManager() {
  const { theme } = useTheme();

  useEffect(() => {
    document.body.className = '';
    document.body.classList.add(configClass, varsClass, 'catlover-theme');
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return null;
}

export function AuthRouteThemeManager({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const [monochromeMode] = useSetting(settingsAtom, 'monochromeMode');

  useEffect(() => {
    document.body.className = '';
    document.body.classList.add(configClass, varsClass, 'catlover-theme');
    document.documentElement.setAttribute('data-theme', theme);

    if (monochromeMode) {
      document.body.style.filter = 'grayscale(1)';
    } else {
      document.body.style.filter = '';
    }
  }, [theme, monochromeMode]);

  return <>{children}</>;
}

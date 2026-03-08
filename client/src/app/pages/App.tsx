import React, { useEffect, useMemo, useState } from 'react';
import { Provider as JotaiProvider } from 'jotai';
import { OverlayContainerProvider, PopOutContainerProvider, TooltipContainerProvider } from 'folds';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';

import '../styles/theme.css';
import { ClientConfigLoader } from '../components/ClientConfigLoader';
import { ClientConfigProvider } from '../hooks/useClientConfig';
import { ConfigConfigError, ConfigConfigLoading } from './ConfigConfig';
import { FeatureCheck } from './FeatureCheck';
import { createRouter } from './Router';
import { ScreenSizeProvider, useScreenSize } from '../hooks/useScreenSize';
import { EncryptionProvider } from '../context/EncryptionContext';
import { useUserPresence } from '../hooks/useUserPresence';

import { requestNotificationPermission } from '../utils/platformNotifications';
import { initializeI18n } from '../utils/i18nSetup';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function GlobalPresence() {
  useUserPresence();
  return null;
}

interface MainAppContentProps {
  config: any;
  screenSize: any;
  session: any;
}

const MainAppContent: React.FC<MainAppContentProps> = ({ config, screenSize, session }) => {
  // Memoize router to prevent recreation on every re-render (e.g. on resize)
  const router = useMemo(() =>
    createRouter(config, screenSize),
    [config, screenSize]
  );

  return (
    <ClientConfigProvider value={config}>
      <QueryClientProvider client={queryClient}>
        <JotaiProvider>
          <EncryptionProvider>
            {session && <GlobalPresence />}
            <RouterProvider
              router={router}
              fallbackElement={<div>Loading...</div>}
              future={{ v7_startTransition: true }}
            />
          </EncryptionProvider>
        </JotaiProvider>
      </QueryClientProvider>
    </ClientConfigProvider>
  );
};

function App() {
  const screenSize = useScreenSize();
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    requestNotificationPermission();
    initializeI18n();

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const portalContainer = document.getElementById('portalContainer') ?? undefined;

  return (
    <TooltipContainerProvider value={portalContainer}>
      <PopOutContainerProvider value={portalContainer}>
        <OverlayContainerProvider value={portalContainer}>
          <ScreenSizeProvider value={screenSize}>
            <FeatureCheck>
              {/* @ts-ignore */}
              <ClientConfigLoader
                fallback={() => <ConfigConfigLoading />}
                error={(err: any, retry: any, ignore: any) => (
                  <ConfigConfigError error={err} retry={retry} ignore={ignore} />
                )}
              >
                {(config) => (
                  <MainAppContent config={config} screenSize={screenSize} session={session} />
                )}
              </ClientConfigLoader>
            </FeatureCheck>
          </ScreenSizeProvider>
        </OverlayContainerProvider>
      </PopOutContainerProvider>
    </TooltipContainerProvider>
  );
}

export default App;

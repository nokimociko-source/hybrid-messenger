import React, { Suspense } from 'react';
import {
  Outlet,
  Route,
  createBrowserRouter,
  createHashRouter,
  createRoutesFromElements,
  redirect,
} from 'react-router-dom';

import { ClientConfig } from '../hooks/useClientConfig';
import {
  HOME_PATH,
  LOGIN_PATH,
  REGISTER_PATH,
  RESET_PASSWORD_PATH,
} from './paths';
import {
  getHomePath,
  getLoginPath,
} from './pathUtils';
import { ScreenSize } from '../hooks/useScreenSize';
import { AuthRouteThemeManager, UnAuthRouteThemeManager } from './ThemeManager';
import { supabase } from '../../supabaseClient';

// Lazy-loaded route components for code-splitting
const AuthLayout = React.lazy(() => import('./auth').then(m => ({ default: m.AuthLayout })));
const Login = React.lazy(() => import('./auth').then(m => ({ default: m.Login })));
const Register = React.lazy(() => import('./auth').then(m => ({ default: m.Register })));
const ResetPassword = React.lazy(() => import('./auth').then(m => ({ default: m.ResetPassword })));
const CatloverShell = React.lazy(() => import('./client/CatloverShell').then(m => ({ default: m.CatloverShell })));
const CatloverChatList = React.lazy(() => import('./client/CatloverChatList').then(m => ({ default: m.CatloverChatList })));
const WelcomePage = React.lazy(() => import('./client/WelcomePage').then(m => ({ default: m.WelcomePage })));
const CatloverRoomView = React.lazy(() => import('./client/CatloverRoomView').then(m => ({ default: m.CatloverRoomView })));

const LazyFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888' }}>
    Загрузка...
  </div>
);

export const createRouter = (clientConfig: ClientConfig, screenSize: ScreenSize) => {
  const { hashRouter } = clientConfig;

  const routes = createRoutesFromElements(
    <Route>
      <Route
        index
        loader={async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) return redirect(getHomePath());
          return redirect(getLoginPath());
        }}
      />
      <Route
        loader={async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            return redirect(getHomePath());
          }
          return null;
        }}
        element={
          <Suspense fallback={<LazyFallback />}>
            <AuthLayout />
            <UnAuthRouteThemeManager />
          </Suspense>
        }
      >
        <Route path={LOGIN_PATH} element={<Login />} />
        <Route path={REGISTER_PATH} element={<Register />} />
        <Route path={RESET_PASSWORD_PATH} element={<ResetPassword />} />
      </Route>

      <Route
        loader={async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            return redirect(getLoginPath());
          }

          try {
            const { data: banData } = await supabase
              .from('global_bans')
              .select('reason')
              .eq('user_id', session.user.id)
              .maybeSingle();

            if (banData) {
              await supabase.auth.signOut();
              alert(`Ваш аккаунт заблокирован.\nПричина: ${banData.reason || 'Нарушение правил'}`);
              return redirect(getLoginPath());
            }
          } catch (e) {
            // Ignore errors (e.g. if table doesn't exist yet)
          }

          return null;
        }}
        element={
          <AuthRouteThemeManager>
            <Suspense fallback={<LazyFallback />}>
              <CatloverShell nav={<CatloverChatList />}>
                <Outlet />
              </CatloverShell>
            </Suspense>
          </AuthRouteThemeManager>
        }
      >
        <Route path={HOME_PATH} element={<WelcomePage />} />
        <Route path={`${HOME_PATH}room/:roomId`} element={<CatloverRoomView />} />
      </Route>
      <Route path="/*" element={<p>Page not found</p>} />
    </Route>
  );

  // Только router-level future flags (без v7_partialHydration для SPA)
  const browserRouterConfig = {
    basename: import.meta.env.BASE_URL,
    future: {
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_skipActionErrorRevalidation: true,
      v7_startTransition: true,
    },
  };

  const hashRouterConfig = {
    basename: hashRouter?.basename,
    future: {
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_skipActionErrorRevalidation: true,
      v7_startTransition: true,
    },
  };

  return hashRouter?.enabled
    ? createHashRouter(routes, hashRouterConfig)
    : createBrowserRouter(routes, browserRouterConfig);
};

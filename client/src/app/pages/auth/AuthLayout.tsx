import React from 'react';
import { Box, Header, Scroll, Text } from 'folds';
import { Outlet } from 'react-router-dom';
import classNames from 'classnames';

import { AuthFooter } from './AuthFooter';
import * as css from './styles.css';
import * as PatternsCss from '../../styles/Patterns.css';

export function AuthLayout() {
  return (
    <Scroll variant="Background" visibility="Hover" size="300" hideTrack>
      <Box
        className={classNames(css.AuthLayout)}
        direction="Column"
        alignItems="Center"
        justifyContent="SpaceBetween"
        gap="400"
      >
        <Box direction="Column" className={css.AuthCard}>
          <Header className={css.AuthHeader} size="600" variant="Surface">
            <Box grow="Yes" direction="Row" gap="300" alignItems="Center">
              <Text size="H3" style={{ color: '#00f2ff', textShadow: '0 0 10px #00f2ff' }}>Catlover</Text>
            </Box>
          </Header>
          <Box className={css.AuthCardContent} direction="Column">
            <Outlet />
          </Box>
        </Box>
        <AuthFooter />
      </Box>
    </Scroll>
  );
}

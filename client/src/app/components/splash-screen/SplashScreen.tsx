import { Box, Text } from 'folds';
import React, { ReactNode } from 'react';
import classNames from 'classnames';
import * as patternsCSS from '../../styles/Patterns.css';
import * as css from './SplashScreen.css';

type SplashScreenProps = {
  children: ReactNode;
};
export function SplashScreen({ children }: SplashScreenProps) {
  return (
    <Box
      className={classNames(css.SplashScreen)}
      direction="Column"
      justifyContent="Center"
      alignItems="Center"
    >
      {children}
      <Box
        className={css.SplashScreenFooter}
        shrink="No"
        alignItems="Center"
        justifyContent="Center"
      >
        <Text size="H1" align="Center" style={{ color: '#00f2ff', textShadow: '0 0 15px #00f2ff' }}>
          Catlover
        </Text>
      </Box>
    </Box>
  );
}

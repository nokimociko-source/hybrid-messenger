import React from 'react';
import { Box, Text } from 'folds';
import * as css from './styles.css';

export function AuthFooter() {
  return (
    <Box className={css.AuthFooter} justifyContent="Center" gap="400" wrap="Wrap">
      <Text size="T300" style={{ opacity: 0.6 }}>
        © 2026 Demonestokom • Catlover
      </Text>
    </Box>
  );
}

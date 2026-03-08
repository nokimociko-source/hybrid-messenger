import { Box, Text } from 'folds';
import React from 'react';
import { Link } from 'react-router-dom';
import { LOGIN_PATH } from '../../paths';

export function ResetPassword() {
  return (
    <Box direction="Column" gap="500">
      <Text size="H2" priority="400" style={{ color: '#00f2ff' }}>
        Восстановление пароля
      </Text>
      <Text size="T300">
        Эта функция находится в разработке (подключение email-сервиса Supabase).
      </Text>
      <span data-spacing-node />

      <Text align="Center">
        Вспомнили пароль? <Link to={LOGIN_PATH}>Войти</Link>
      </Text>
    </Box>
  );
}

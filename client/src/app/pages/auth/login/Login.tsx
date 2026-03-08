import React from 'react';
import { Box, Text } from 'folds';
import { Link } from 'react-router-dom';
import { PasswordLoginForm } from './PasswordLoginForm';
import { REGISTER_PATH } from '../../paths';

export function Login() {
  return (
    <Box direction="Column" gap="500">
      <Text size="H2" priority="400" style={{ color: '#00f2ff' }}>
        Вход
      </Text>
      <PasswordLoginForm />
      <span data-spacing-node />
      <Text align="Center">
        Нет аккаунта? <Link to={REGISTER_PATH}>Зарегистрироваться</Link>
      </Text>
    </Box>
  );
}

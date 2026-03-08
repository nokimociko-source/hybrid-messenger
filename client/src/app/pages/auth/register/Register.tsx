import React from 'react';
import { Box, Text } from 'folds';
import { Link } from 'react-router-dom';
import { PasswordRegisterForm } from '../register/PasswordRegisterForm';
import { LOGIN_PATH } from '../../paths';

export function Register() {
  return (
    <Box direction="Column" gap="500">
      <Text size="H2" priority="400" style={{ color: '#00f2ff' }}>
        Регистрация
      </Text>
      <PasswordRegisterForm />
      <span data-spacing-node />
      <Text align="Center">
        Уже есть аккаунт? <Link to={LOGIN_PATH}>Войти</Link>
      </Text>
    </Box>
  );
}

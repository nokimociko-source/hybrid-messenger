import React, { FormEventHandler, useState } from 'react';
import { Box, Button, Input, Overlay, OverlayBackdrop, OverlayCenter, Spinner, Text, config } from 'folds';
import { Link, useNavigate } from 'react-router-dom';
import { PasswordInput } from '../../../components/password-input';
import { FieldError } from '../FiledError';
import { getHomePath } from '../../pathUtils';
import { RESET_PASSWORD_PATH } from '../../paths';
import { supabase } from '../../../../supabaseClient';

export function PasswordLoginForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (evt) => {
    evt.preventDefault();
    const { usernameInput, passwordInput } = evt.target as HTMLFormElement & {
      usernameInput: HTMLInputElement;
      passwordInput: HTMLInputElement;
    };

    const email = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) return;

    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    if (data.session) {
      navigate(getHomePath(), { replace: true });
    }
  };

  return (
    <Box as="form" onSubmit={handleSubmit} direction="Inherit" gap="400">
      <Box direction="Column" gap="100">
        <Text as="label" htmlFor="login-email-input" size="L400" priority="300" style={{ color: '#00f2ff' }}>
          Емейл
        </Text>
        <Input
          id="login-email-input"
          name="usernameInput"
          type="email"
          variant="Background"
          size="500"
          required
          outlined
          placeholder="your@email.com"
          autoComplete="email"
        />
      </Box>
      <Box direction="Column" gap="100">
        <Text as="label" htmlFor="login-password-input" size="L400" priority="300" style={{ color: '#00f2ff' }}>
          Пароль
        </Text>
        <PasswordInput
          id="login-password-input"
          name="passwordInput"
          variant="Background"
          size="500"
          outlined
          required
          autoComplete="current-password"
        />
        <Box alignItems="Start" justifyContent="SpaceBetween" gap="200">
          {errorMsg && (
            <FieldError message={errorMsg} />
          )}
          <Box grow="Yes" shrink="No" justifyContent="End">
            <Text as="span" size="T200" priority="400" align="Right">
              <Link to={RESET_PASSWORD_PATH}>Забыли пароль?</Link>
            </Text>
          </Box>
        </Box>
      </Box>
      <Button type="submit" variant="Primary" size="500" style={{ background: 'linear-gradient(45deg, #a200ff, #00f2ff)', border: 'none' }}>
        <Text as="span" size="B500" style={{ color: '#fff', fontWeight: 'bold' }}>
          Войти
        </Text>
      </Button>

      <Overlay open={loading} backdrop={<OverlayBackdrop />}>
        <OverlayCenter>
          <Spinner variant="Secondary" size="600" />
        </OverlayCenter>
      </Overlay>
    </Box>
  );
}

import React, { ChangeEventHandler, useState } from 'react';
import { Box, Button, Input, Overlay, OverlayBackdrop, OverlayCenter, Spinner, Text, color } from 'folds';
import { PasswordInput } from '../../../components/password-input';
import { FieldError } from '../FiledError';
import { ConfirmPasswordMatch } from '../../../components/ConfirmPasswordMatch';
import { supabase } from '../../../../supabaseClient';
import { setFallbackSession } from '../../../state/sessions';
import { useNavigate } from 'react-router-dom';
import { getHomePath } from '../../pathUtils';

export function PasswordRegisterForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit: ChangeEventHandler<HTMLFormElement> = async (evt) => {
    evt.preventDefault();
    const {
      usernameInput,
      emailInput,
      passwordInput,
      confirmPasswordInput,
    } = evt.target as HTMLFormElement & {
      usernameInput: HTMLInputElement;
      emailInput: HTMLInputElement;
      passwordInput: HTMLInputElement;
      confirmPasswordInput: HTMLInputElement;
    };

    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (password !== confirmPassword) return;
    if (!username || !email || !password) return;

    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        }
      }
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    if (data.session) {
      // Auto-login if email confirmation isn't required by Supabase
      setFallbackSession('http://localhost', data.session.access_token);
      navigate(getHomePath(), { replace: true });
    } else {
      setErrorMsg('Регистрация успешна! Проверьте email для подтверждения (если включено), или войдите.');
    }
  };

  return (
    <>
      <Box as="form" onSubmit={handleSubmit} direction="Inherit" gap="400">
        <Box direction="Column" gap="100">
          <Text as="label" htmlFor="register-username-input" size="L400" priority="300" style={{ color: '#00f2ff' }}>
            Имя пользователя (Никнейм)
          </Text>
          <Input
            id="register-username-input"
            variant="Background"
            name="usernameInput"
            size="500"
            outlined
            required
            placeholder="cyberpunk99"
            autoComplete="username"
          />
        </Box>
        <Box direction="Column" gap="100">
          <Text as="label" htmlFor="register-email-input" size="L400" priority="300" style={{ color: '#00f2ff' }}>
            Емейл
          </Text>
          <Input
            id="register-email-input"
            variant="Background"
            name="emailInput"
            type="email"
            size="500"
            required
            outlined
            placeholder="cyber@punk.com"
            autoComplete="email"
          />
        </Box>
        {/* @ts-ignore */}
        <ConfirmPasswordMatch initialValue>
          {(match, doMatch, passRef, confPassRef) => (
            <>
              <Box direction="Column" gap="100">
                <Text as="label" htmlFor="register-password-input" size="L400" priority="300" style={{ color: '#00f2ff' }}>
                  Пароль
                </Text>
                <PasswordInput
                  id="register-password-input"
                  ref={passRef}
                  onChange={doMatch}
                  name="passwordInput"
                  variant="Background"
                  size="500"
                  outlined
                  required
                  autoComplete="new-password"
                />
              </Box>
              <Box direction="Column" gap="100">
                <Text as="label" htmlFor="register-confirm-password-input" size="L400" priority="300" style={{ color: '#00f2ff' }}>
                  Подтвердите пароль
                </Text>
                <PasswordInput
                  id="register-confirm-password-input"
                  ref={confPassRef}
                  onChange={doMatch}
                  name="confirmPasswordInput"
                  variant="Background"
                  size="500"
                  style={{ color: match ? undefined : color.Critical.Main }}
                  outlined
                  required
                  autoComplete="new-password"
                />
              </Box>
            </>
          )}
        </ConfirmPasswordMatch>

        {errorMsg && (
          <FieldError message={errorMsg} />
        )}
        <span data-spacing-node />
        <Button variant="Primary" size="500" type="submit" style={{ background: 'linear-gradient(45deg, #a200ff, #00f2ff)', border: 'none' }}>
          <Text as="span" size="B500" style={{ color: '#fff', fontWeight: 'bold' }}>
            Зарегистрироваться
          </Text>
        </Button>
      </Box>
      {loading && (
        <Overlay open backdrop={<OverlayBackdrop />}>
          <OverlayCenter>
            <Spinner variant="Secondary" size="600" />
          </OverlayCenter>
        </Overlay>
      )}
    </>
  );
}

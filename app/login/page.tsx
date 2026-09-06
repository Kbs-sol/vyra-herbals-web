'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useAuth } from '@/Components/Contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useResendTimer } from '@/Components/Auth/useResendTimer';
import {
  Container,
  AuthCard,
  Title,
  Subtitle,
  Form,
  FormGroup,
  Label,
  Input,
  SubmitButton,
  SecondaryButton,
  SwitchText,
  InlineLink,
  ErrorMessage,
  InfoMessage,
  SuccessMessage,
  HelperText,
  LoadingWrapper,
} from '@/Components/Auth/authStyles';

const RESEND_COOLDOWN = 30; // seconds

const sanitizePhone = (value: string) => value.replace(/\D/g, '').slice(0, 10);
const isValidPhone = (value: string) => /^[6-9]\d{9}$/.test(value);

const LoginContent = () => {
  const [step, setStep] = useState<'phone' | 'password' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationId, setVerificationId] = useState('');

  const [noAccount, setNoAccount] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState('');

  const { checkUserExists, loginWithPassword, sendOtp, verifyOtp, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams?.get('next') || '/';
  const { seconds: resendIn, start: startResendTimer } = useResendTimer();

  // Preserve the destination + any prefilled phone when linking to /signup.
  const signupHref = `/signup?${new URLSearchParams({
    ...(redirectUrl && redirectUrl !== '/' ? { next: redirectUrl } : {}),
    ...(isValidPhone(phone) ? { phone } : {}),
  }).toString()}`;

  // Prefill phone from query (e.g. when bounced back from /signup).
  useEffect(() => {
    const qp = sanitizePhone(searchParams?.get('phone') || '');
    if (qp) setPhone(qp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Already authenticated → leave the auth pages.
  useEffect(() => {
    if (!authLoading && user) {
      router.refresh();
      router.push(redirectUrl || '/');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading, redirectUrl]);

  const friendlyLoginError = (msg: string) => {
    if (/invalid login credentials|invalid/i.test(msg)) {
      return 'Incorrect password. Try again or reset it with an OTP.';
    }
    if (/email not confirmed/i.test(msg)) {
      return 'Your account needs verification. Please reset your password with an OTP.';
    }
    return msg || 'Login failed. Please try again.';
  };

  // Step 1: check whether the phone has an account.
  const handleCheckPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNoAccount(false);

    if (!isValidPhone(phone)) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }

    setLocalLoading(true);
    try {
      const { exists, error } = await checkUserExists(phone);
      if (error) throw new Error(error);

      if (exists) {
        setStep('password');
      } else {
        // Existing customers land here only if they truly have no account.
        setNoAccount(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to check this number. Please try again.');
    } finally {
      setLocalLoading(false);
    }
  };

  // Step 2: password login for existing users.
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLocalLoading(true);
    try {
      const { error } = await loginWithPassword(phone, password);
      if (error) throw new Error(error);

      router.refresh();
      router.push(redirectUrl || '/');
      // Keep the button in its loading state through the transition.
      return;
    } catch (err: any) {
      setError(friendlyLoginError(err.message));
      setLocalLoading(false);
    }
  };

  // Forgot password: send an OTP to reset it.
  const initiateReset = async () => {
    setError('');
    setLocalLoading(true);
    try {
      const { verificationId, error } = await sendOtp(phone);
      if (error) throw new Error(error);
      if (!verificationId) throw new Error('Failed to send OTP. Please try again.');
      setVerificationId(verificationId);
      setOtp('');
      setPassword('');
      setStep('otp');
      startResendTimer(RESEND_COOLDOWN);
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendIn > 0 || localLoading) return;
    setError('');
    try {
      const { verificationId, error } = await sendOtp(phone);
      if (error) throw new Error(error);
      if (verificationId) setVerificationId(verificationId);
      startResendTimer(RESEND_COOLDOWN);
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP');
    }
  };

  // Step 3: verify OTP + set the new password, then sign in.
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLocalLoading(true);
    try {
      const { error } = await verifyOtp(phone, verificationId, otp, password);
      if (error) throw new Error(error);

      router.refresh();
      router.push(redirectUrl || '/');
      return;
    } catch (err: any) {
      setError(err.message || 'Verification failed');
      setLocalLoading(false);
    }
  };

  if (user && !authLoading) {
    return <LoadingWrapper>Redirecting...</LoadingWrapper>;
  }

  return (
    <Container>
      <AuthCard>
        <Title>Welcome back</Title>

        {searchParams?.get('toast') === 'order_success' && (
          <SuccessMessage>
            Payment successful! Your order has been placed. Please login to view your account.
          </SuccessMessage>
        )}

        {error && <ErrorMessage>{error}</ErrorMessage>}

        {step === 'phone' && (
          <Form onSubmit={handleCheckPhone}>
            <Subtitle>Login with your mobile number</Subtitle>
            <FormGroup>
              <Label>Mobile Number</Label>
              <Input
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="Enter 10-digit mobile number"
                value={phone}
                onChange={(e) => {
                  setPhone(sanitizePhone(e.target.value));
                  setNoAccount(false);
                  setError('');
                }}
                required
              />
            </FormGroup>

            {noAccount ? (
              <>
                <InfoMessage>
                  No account found for <strong>{phone}</strong>. Create one to continue.
                </InfoMessage>
                <SubmitButton
                  type="button"
                  onClick={() => router.push(signupHref)}
                >
                  Create a new account
                </SubmitButton>
                <SecondaryButton
                  type="button"
                  disabled={localLoading}
                  onClick={() => {
                    setPhone('');
                    setNoAccount(false);
                    setError('');
                  }}
                >
                  Try a different number
                </SecondaryButton>
              </>
            ) : (
              <SubmitButton type="submit" disabled={localLoading || !isValidPhone(phone)}>
                {localLoading ? 'Checking...' : 'Continue'}
              </SubmitButton>
            )}

            <SwitchText>
              New to Vyra?{' '}
              <Link href={signupHref} style={{ display: 'contents' }}>
                <InlineLink>Create an account</InlineLink>
              </Link>
            </SwitchText>
          </Form>
        )}

        {step === 'password' && (
          <Form onSubmit={handlePasswordLogin}>
            <Subtitle>
              Enter your password to login as <strong>{phone}</strong>
            </Subtitle>
            <FormGroup>
              <Label>Password</Label>
              <Input
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
              />
            </FormGroup>

            <SubmitButton type="submit" disabled={localLoading || password.length === 0}>
              {localLoading ? 'Logging in...' : 'Login'}
            </SubmitButton>

            <SwitchText>
              <span onClick={() => !localLoading && initiateReset()}>
                Forgot password? Reset via OTP
              </span>
            </SwitchText>

            <SwitchText style={{ marginTop: '0.5rem' }}>
              <span
                onClick={() => {
                  setStep('phone');
                  setError('');
                  setPassword('');
                }}
              >
                Change number
              </span>
            </SwitchText>
          </Form>
        )}

        {step === 'otp' && (
          <Form onSubmit={handleResetPassword}>
            <Subtitle>
              Enter the code sent to <strong>{phone}</strong> and set a new password.
            </Subtitle>

            <FormGroup>
              <Label>Enter OTP</Label>
              <Input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="4-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                required
                autoFocus
              />
            </FormGroup>

            <FormGroup>
              <Label>New Password</Label>
              <Input
                type="password"
                autoComplete="new-password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <HelperText>Use at least 6 characters.</HelperText>
            </FormGroup>

            <SubmitButton type="submit" disabled={localLoading || otp.length < 4 || password.length < 6}>
              {localLoading ? 'Verifying...' : 'Reset & Login'}
            </SubmitButton>

            <SwitchText>
              {resendIn > 0 ? (
                <span style={{ color: '#999', cursor: 'default' }}>Resend OTP in {resendIn}s</span>
              ) : (
                <span onClick={handleResend}>Didn&apos;t get the code? Resend OTP</span>
              )}
            </SwitchText>

            <SwitchText style={{ marginTop: '0.5rem' }}>
              <span
                onClick={() => {
                  setStep('password');
                  setOtp('');
                  setError('');
                }}
              >
                Back to password login
              </span>
            </SwitchText>
          </Form>
        )}
      </AuthCard>
    </Container>
  );
};

const LoginPage = () => {
  return (
    <Suspense fallback={<LoadingWrapper>Loading...</LoadingWrapper>}>
      <LoginContent />
    </Suspense>
  );
};

export default LoginPage;

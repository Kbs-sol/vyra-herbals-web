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

const SignupContent = () => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationId, setVerificationId] = useState('');

  const [alreadyExists, setAlreadyExists] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState('');

  const { checkUserExists, sendOtp, verifyOtp, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams?.get('next') || '/';
  const { seconds: resendIn, start: startResendTimer } = useResendTimer();

  // Preserve destination + prefilled phone when linking back to /login.
  const loginHref = `/login?${new URLSearchParams({
    ...(redirectUrl && redirectUrl !== '/' ? { next: redirectUrl } : {}),
    ...(isValidPhone(phone) ? { phone } : {}),
  }).toString()}`;

  useEffect(() => {
    const qp = sanitizePhone(searchParams?.get('phone') || '');
    if (qp) setPhone(qp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      router.refresh();
      router.push(redirectUrl || '/');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading, redirectUrl]);

  const sendOtpFor = async () => {
    const { verificationId, error } = await sendOtp(phone);
    if (error) throw new Error(error);
    if (!verificationId) throw new Error('Failed to send OTP. Please try again.');
    return verificationId;
  };

  // Step 1: ensure the number is not already registered, then send OTP.
  const handleCheckPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAlreadyExists(false);

    if (!isValidPhone(phone)) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }

    setLocalLoading(true);
    try {
      const { exists, error } = await checkUserExists(phone);
      if (error) throw new Error(error);

      if (exists) {
        setAlreadyExists(true);
        return;
      }

      const vId = await sendOtpFor();
      setVerificationId(vId);
      setOtp('');
      setStep('otp');
      startResendTimer(RESEND_COOLDOWN);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendIn > 0 || localLoading) return;
    setError('');
    try {
      const vId = await sendOtpFor();
      setVerificationId(vId);
      startResendTimer(RESEND_COOLDOWN);
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP');
    }
  };

  // Step 2: create the account (verify OTP + name + password), then sign in.
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLocalLoading(true);
    try {
      const { error } = await verifyOtp(phone, verificationId, otp, password, name.trim());
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
        <Title>Create your account</Title>

        {searchParams?.get('toast') === 'order_success' && (
          <SuccessMessage>
            Payment successful! Create an account to track your order and save your details.
          </SuccessMessage>
        )}

        {error && <ErrorMessage>{error}</ErrorMessage>}

        {step === 'phone' && (
          <Form onSubmit={handleCheckPhone}>
            <Subtitle>Sign up with your mobile number</Subtitle>
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
                  setAlreadyExists(false);
                  setError('');
                }}
                required
              />
            </FormGroup>

            {alreadyExists ? (
              <>
                <InfoMessage>
                  <strong>{phone}</strong> is already registered. Please login instead.
                </InfoMessage>
                <SubmitButton type="button" onClick={() => router.push(loginHref)}>
                  Login instead
                </SubmitButton>
                <SecondaryButton
                  type="button"
                  disabled={localLoading}
                  onClick={() => {
                    setPhone('');
                    setAlreadyExists(false);
                    setError('');
                  }}
                >
                  Use a different number
                </SecondaryButton>
              </>
            ) : (
              <SubmitButton type="submit" disabled={localLoading || !isValidPhone(phone)}>
                {localLoading ? 'Sending OTP...' : 'Continue'}
              </SubmitButton>
            )}

            <SwitchText>
              Already have an account?{' '}
              <Link href={loginHref} style={{ display: 'contents' }}>
                <InlineLink>Login</InlineLink>
              </Link>
            </SwitchText>
          </Form>
        )}

        {step === 'otp' && (
          <Form onSubmit={handleRegister}>
            <Subtitle>
              Enter the code sent to <strong>{phone}</strong> to finish creating your account.
            </Subtitle>

            <FormGroup>
              <Label>Full Name</Label>
              <Input
                type="text"
                autoComplete="name"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </FormGroup>

            <FormGroup>
              <Label>Create a Password</Label>
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
              />
            </FormGroup>

            <SubmitButton
              type="submit"
              disabled={localLoading || otp.length < 4 || password.length < 6 || !name.trim()}
            >
              {localLoading ? 'Creating account...' : 'Verify & Create Account'}
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
                  setStep('phone');
                  setOtp('');
                  setError('');
                }}
              >
                Change number
              </span>
            </SwitchText>
          </Form>
        )}
      </AuthCard>
    </Container>
  );
};

const SignupPage = () => {
  return (
    <Suspense fallback={<LoadingWrapper>Loading...</LoadingWrapper>}>
      <SignupContent />
    </Suspense>
  );
};

export default SignupPage;

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import styled from 'styled-components';
import { useAuth } from '@/Components/Contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';

const LoginContent = () => {
  const [step, setStep] = useState<'phone' | 'password' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [verificationId, setVerificationId] = useState('');

  // UI states
  const [userExists, setUserExists] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState('');

  const { checkUserExists, loginWithPassword, sendOtp, verifyOtp, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams?.get('next') || '/';

  useEffect(() => {
    if (!authLoading && user) {
      router.refresh();
      router.push(redirectUrl || '/');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading, redirectUrl]);

  // Step 1: Check if phone number exists
  const handleCheckPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalLoading(true);
    setError('');

    try {
      if (phone.length !== 10) throw new Error('Enter a valid 10-digit mobile number');
      const { exists, error } = await checkUserExists(phone);
      if (error) throw new Error(error);

      setUserExists(exists);
      if (exists) {
        setStep('password');
      } else {
        // Automatically send OTP for new users
        await initiateOtp();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to check user');
    } finally {
      setLocalLoading(false);
    }
  };

  // Step 2: Login with Password for existing users
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalLoading(true);
    setError('');

    try {
      const { error } = await loginWithPassword(phone, password);
      if (error) throw new Error(error);

      // Navigate efficiently without full page reload
      router.refresh();
      router.push(redirectUrl || '/');

      // We purposefully don't setLocalLoading(false) immediately
      // to avoid visual flicker while page transitions.
      return;
    } catch (err: any) {
      setError(err.message || 'Login failed');
      setLocalLoading(false);
    }
  };

  // Start OTP Flow (used for Signup or Forgot Password)
  const initiateOtp = async () => {
    setLocalLoading(true);
    setError('');
    try {
      const { verificationId, error } = await sendOtp(phone);
      if (error) throw new Error(error);
      if (verificationId) {
        setVerificationId(verificationId);
        setStep('otp');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLocalLoading(false);
    }
  };

  // Step 3: Verify OTP and set new password
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalLoading(true);
    setError('');

    try {
      if (password.length < 6) throw new Error("Password must be at least 6 characters.");

      const { error } = await verifyOtp(phone, verificationId, otp, password, name);
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
        <Title>Welcome to Vyra</Title>

        {searchParams?.get('toast') === 'order_success' && (
          <SuccessMessage>
            Payment successful! Your order has been placed securely. Please login below to view your account.
          </SuccessMessage>
        )}

        {error && <ErrorMessage>{error}</ErrorMessage>}

        {step === 'phone' && (
          <Form onSubmit={handleCheckPhone}>
            <Subtitle>Login or Sign Up with your mobile number</Subtitle>
            <FormGroup>
              <Label>Mobile Number</Label>
              <Input
                type="tel"
                placeholder="Enter 10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                required
              />
            </FormGroup>

            <SubmitButton type="submit" disabled={localLoading || phone.length !== 10}>
              {localLoading ? 'Checking...' : 'Continue'}
            </SubmitButton>
          </Form>
        )}

        {step === 'password' && (
          <Form onSubmit={handlePasswordLogin}>
            <Subtitle>Welcome back! Enter your password to login</Subtitle>
            <FormGroup>
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </FormGroup>

            <SubmitButton type="submit" disabled={localLoading || password.length === 0}>
              {localLoading ? 'Logging in...' : 'Login'}
            </SubmitButton>

            <SwitchText>
              <span onClick={() => {
                setPassword('');
                initiateOtp();
              }}>
                Forgot Password? Login with OTP
              </span>
            </SwitchText>

            <SwitchText style={{ marginTop: '0.5rem' }}>
              <span onClick={() => { setStep('phone'); setError(''); setPassword(''); }}>
                Change Phone Number
              </span>
            </SwitchText>
          </Form>
        )}

        {step === 'otp' && (
          <Form onSubmit={handleVerifyOtp}>
            <Subtitle>
              {userExists
                ? 'Enter the 4-digit code to reset your password'
                : 'Enter the 4-digit code sent to your phone to create an account'}
            </Subtitle>

            {!userExists && (
              <FormGroup>
                <Label>Full Name (Required)</Label>
                <Input
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </FormGroup>
            )}

            <FormGroup>
              <Label>Create a Password</Label>
              <Input
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </FormGroup>

            <FormGroup>
              <Label>Enter OTP</Label>
              <Input
                type="text"
                placeholder="4-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                required
              />
            </FormGroup>

            <SubmitButton type="submit" disabled={localLoading || otp.length < 4 || password.length < 6}>
              {localLoading ? 'Verifying...' : (userExists ? 'Reset & Login' : 'Verify & Register')}
            </SubmitButton>

            <SwitchText>
              <span onClick={() => {
                if (userExists) setStep('password');
                else setStep('phone');
                setOtp('');
                setError('');
              }}>
                Go Back
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

const Container = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 80vh;
    background-color: #f8f9fa;
    padding: 20px;
`;

const AuthCard = styled.div`
    background: white;
    padding: 2.5rem;
    border-radius: 12px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.05);
    width: 100%;
    max-width: 450px;
`;

const Title = styled.h2`
    text-align: center;
    color: #333;
    margin-bottom: 0.5rem;
    font-size: 1.8rem;
    font-weight: 700;
`;

const Subtitle = styled.p`
    text-align: center;
    color: #666;
    font-size: 0.95rem;
    margin-bottom: 2rem;
`;

const Form = styled.form`
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
`;

const FormGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
`;

const Label = styled.label`
    font-size: 0.9rem;
    color: #444;
    font-weight: 500;
`;

const Input = styled.input`
    padding: 0.8rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 1rem;
    width: 100%;
    transition: border-color 0.2s;
    &:focus {
        outline: none;
        border-color: var(--primary);
    }
`;

const SubmitButton = styled.button`
    background-color: var(--primary);
    color: white;
    padding: 0.9rem;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    margin-top: 1rem;
    transition: background-color 0.2s;

    &:hover:not(:disabled) {
        background-color: var(--primary-dark, #2b4b3b);
    }

    &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }
`;

const SwitchText = styled.p`
    text-align: center;
    margin-top: 1.5rem;
    font-size: 0.95rem;
    color: #666;

    span {
        color: var(--primary);
        cursor: pointer;
        font-weight: 600;
        &:hover {
            text-decoration: underline;
        }
    }
`;

const ErrorMessage = styled.div`
    background-color: #ffebee;
    color: #c62828;
    padding: 0.8rem;
    border-radius: 6px;
    margin-bottom: 1.5rem;
    font-size: 0.9rem;
    text-align: center;
    border: 1px solid #ef9a9a;
`;

const SuccessMessage = styled.div`
    background-color: #e8f5e9;
    color: #2e7d32;
    padding: 1rem;
    border-radius: 6px;
    margin-bottom: 1.5rem;
    font-size: 0.95rem;
    text-align: center;
    border: 1px solid #a5d6a7;
    font-weight: 500;
`;

const LoadingWrapper = styled.div`
    min-height: 80vh;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    color: var(--primary);
`;

'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAuth } from '@/Components/Contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import Link from 'next/link';
import { Modal, Button } from 'react-bootstrap';

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [error, setError] = useState('');

  const { login, signUp, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('next') || '/';

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(redirectUrl);
    }
  }, [user, authLoading, router, redirectUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalLoading(true);
    setError('');

    try {
      if (isLogin) {
        const { error } = await login(email, password);
        if (error) throw error;
        // Redirect handled by useEffect
      } else {
        const { error } = await signUp(email, password, name);
        if (error) throw error;
        setShowSuccessModal(true);
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred');
    } finally {
      setLocalLoading(false);
    }
  };

  // If user is already logged in and we know it, redirect will happen via useEffect
  // Don't block rendering - show the form immediately
  if (user && !authLoading) {
    return <LoadingWrapper>Redirecting...</LoadingWrapper>;
  }

  return (
    <Container>
      <AuthCard>
        <Title>{isLogin ? 'Welcome Back' : 'Create Account'}</Title>
        <Subtitle>
          {isLogin
            ? 'Login to access your personalized shopping experience'
            : 'Join Vyra Herbals for a better shopping experience'}
        </Subtitle>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <Form onSubmit={handleSubmit}>
          {!isLogin && (
            <FormGroup>
              <Label>Full Name</Label>
              <Input
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={!isLogin}
              />
            </FormGroup>
          )}

          <FormGroup>
            <Label>Email Address</Label>
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </FormGroup>

          <FormGroup>
            <Label>Password</Label>
            <PasswordWrapper>
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <ToggleIcon onClick={() => setShowPassword(!showPassword)} type="button">
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </ToggleIcon>
            </PasswordWrapper>
          </FormGroup>

          <SubmitButton type="submit" disabled={localLoading}>
            {localLoading ? 'Processing...' : isLogin ? 'Login' : 'Sign Up'}
          </SubmitButton>
        </Form>

        <SwitchText>
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <span onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Sign Up' : 'Login'}
          </span>
        </SwitchText>
      </AuthCard>

      <StyledModal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} centered backdrop="static" keyboard={false}>
        <Modal.Header closeButton>
          <Modal.Title>Check Your Email</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>We've sent a confirmation link to <strong>{email}</strong>.</p>
          <p>Please check your inbox and confirm your email to complete the registration.</p>
          <div className="alert alert-warning mb-0">
            <strong>Important:</strong> If you don't see the email, please check your <strong>Spam</strong> or <strong>Junk</strong> folder.
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => { setShowSuccessModal(false); setIsLogin(true); }}>
            OK, I'll Check
          </Button>
        </Modal.Footer>
      </StyledModal>
    </Container>
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

const PasswordWrapper = styled.div`
    position: relative;
`;

const ToggleIcon = styled.button`
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #999;
    cursor: pointer;
    display: flex;
    align-items: center;
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

const LoadingWrapper = styled.div`
    min-height: 80vh;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    color: var(--primary);
`;

const StyledModal = styled(Modal)`
    .modal-content {
        border: none;
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.15);
        background-color: #ffffff !important; /* Force solid white */
        overflow: hidden;
    }
    .modal-header {
        border-bottom: 1px solid #f0f0f0;
        padding: 1.5rem 2rem;
        background-color: #ffffff;
        
        .modal-title {
            font-weight: 700;
            color: #333;
            font-size: 1.25rem;
        }
        .btn-close {
            /* Fix invisible close button if needed */
            opacity: 0.5;
            &:hover { opacity: 1; }
        }
    }
    .modal-body {
        padding: 2rem;
        font-size: 1rem;
        color: #555;
        line-height: 1.6;
        background-color: #ffffff;
        
        p {
            margin-bottom: 1rem;
        }
        
        .alert-warning {
             background-color: #fff8e1;
             border-color: #ffe082;
             color: #d84315;
             border-radius: 8px;
             font-size: 0.9rem;
             padding: 1rem;
             margin-top: 1.5rem;
        }
    }
    .modal-footer {
        border-top: none;
        background-color: #f9fafb;
        padding: 1rem 2rem 1.5rem;
        justify-content: center;
        
        button {
             background-color: var(--primary);
             border: none;
             border-radius: 50px; /* Pillow shape for aesthetic */
             padding: 0.75rem 2.5rem;
             font-weight: 600;
             letter-spacing: 0.5px;
             box-shadow: 0 4px 12px rgba(var(--primary-rgb, 112, 74, 13), 0.3);
             transition: all 0.2s ease;
             
             &:hover {
                background-color: var(--primary-dark, #5a3b0a);
                transform: translateY(-1px);
                box-shadow: 0 6px 16px rgba(var(--primary-rgb, 112, 74, 13), 0.4);
             }
             &:active {
                 transform: translateY(0);
             }
        }
    }
`;

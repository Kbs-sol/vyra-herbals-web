'use client';

import styled from 'styled-components';

/**
 * Shared styled components for the /login and /signup pages so both flows stay
 * visually identical without duplicating CSS.
 */

export const Container = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 80vh;
    background-color: #f8f9fa;
    padding: 20px;
`;

export const AuthCard = styled.div`
    background: white;
    padding: 2.5rem;
    border-radius: 12px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.05);
    width: 100%;
    max-width: 450px;
`;

export const Title = styled.h2`
    text-align: center;
    color: #333;
    margin-bottom: 0.5rem;
    font-size: 1.8rem;
    font-weight: 700;
`;

export const Subtitle = styled.p`
    text-align: center;
    color: #666;
    font-size: 0.95rem;
    margin-bottom: 2rem;
`;

export const Form = styled.form`
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
`;

export const FormGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
`;

export const Label = styled.label`
    font-size: 0.9rem;
    color: #444;
    font-weight: 500;
`;

export const Input = styled.input`
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
    &:disabled {
        background-color: #f5f5f5;
        color: #888;
        cursor: not-allowed;
    }
`;

export const SubmitButton = styled.button`
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

export const SecondaryButton = styled.button`
    background-color: transparent;
    color: var(--primary);
    padding: 0.9rem;
    border: 1px solid var(--primary);
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s, color 0.2s;

    &:hover:not(:disabled) {
        background-color: var(--primary);
        color: white;
    }

    &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }
`;

export const SwitchText = styled.p`
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

export const InlineLink = styled.span`
    color: var(--primary);
    cursor: pointer;
    font-weight: 600;
    &:hover {
        text-decoration: underline;
    }
`;

export const ErrorMessage = styled.div`
    background-color: #ffebee;
    color: #c62828;
    padding: 0.8rem;
    border-radius: 6px;
    margin-bottom: 1.5rem;
    font-size: 0.9rem;
    text-align: center;
    border: 1px solid #ef9a9a;
`;

export const InfoMessage = styled.div`
    background-color: #e3f2fd;
    color: #1565c0;
    padding: 0.9rem;
    border-radius: 6px;
    margin-bottom: 1.5rem;
    font-size: 0.9rem;
    text-align: center;
    border: 1px solid #90caf9;
`;

export const SuccessMessage = styled.div`
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

export const HelperText = styled.p`
    font-size: 0.8rem;
    color: #888;
    margin-top: -0.25rem;
`;

export const LoadingWrapper = styled.div`
    min-height: 80vh;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    color: var(--primary);
`;

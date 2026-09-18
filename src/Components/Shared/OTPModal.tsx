import React, { useState } from 'react';
import { Modal, Button, Form, Spinner } from 'react-bootstrap';
import styled from 'styled-components';
import { useAuth } from '../Contexts/AuthContext';

interface OTPModalProps {
  show: boolean;
  onHide: () => void;
  onSuccess: () => void;
  onGuest: () => void;
}

const OTPModal: React.FC<OTPModalProps> = ({ show, onHide, onSuccess, onGuest }) => {
  const { sendOtp, verifyOtp } = useAuth();
  
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationId, setVerificationId] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Basic validation
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      const { verificationId: newId, error: sendErr } = await sendOtp(cleanPhone);
      
      if (sendErr) {
        throw new Error(sendErr);
      }
      
      setVerificationId(newId || '');
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (otp.length < 4) {
      setError('Please enter a valid OTP.');
      return;
    }

    setLoading(true);
    try {
      // Auto-generate a secure password for this passwordless flow
      const autoGenPassword = 'Vyra@' + Math.random().toString(36).slice(-8);

      const { error: verifyErr } = await verifyOtp(
        phone.replace(/\D/g, ''),
        verificationId,
        otp,
        autoGenPassword
      );
      
      if (verifyErr) {
        throw new Error(verifyErr);
      }

      // Success! Cart merge is handled automatically by AuthContext on SIGNED_IN
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setPhone('');
    setOtp('');
    setStep('phone');
    setError('');
    setVerificationId('');
  };

  const handleClose = () => {
    resetState();
    onHide();
  };

  return (
    <StyledModal show={show} onHide={handleClose} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Sign in to proceed</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <div className="alert alert-danger p-2">{error}</div>}
        
        {step === 'phone' ? (
          <Form onSubmit={handleSendOtp}>
            <Form.Group className="mb-3">
              <Form.Label>Mobile Number</Form.Label>
              <Form.Control
                type="tel"
                placeholder="Enter 10-digit number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={10}
                required
                autoFocus
              />
            </Form.Group>
            <Button
              variant="primary"
              type="submit"
              className="w-100 mt-2"
              disabled={loading || phone.replace(/\D/g, '').length !== 10}
              style={{ backgroundColor: '#704a0d', borderColor: '#704a0d' }}
            >
              {loading ? <Spinner size="sm" /> : 'Send OTP'}
            </Button>
            <div className="text-center mt-3 text-muted small">
              By proceeding, you agree to our Terms & Conditions.
            </div>
            <div className="text-center mt-3">
              <a href="#!" onClick={(e) => { e.preventDefault(); onGuest(); }} style={{ fontSize: '0.9em', color: '#666', textDecoration: 'underline' }}>
                Continue as Guest
              </a>
            </div>
          </Form>
        ) : (
          <Form onSubmit={handleVerifyOtp}>
            <p className="mb-3">
              Enter the OTP sent to <strong>{phone}</strong>{' '}
              <span 
                className="text-primary ms-2" 
                style={{ cursor: 'pointer', fontSize: '0.9em' }}
                onClick={() => {
                  setStep('phone');
                  setOtp('');
                  setError('');
                }}
              >
                (Change)
              </span>
            </p>
            <Form.Group className="mb-3">
              <Form.Control
                type="text"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                maxLength={6}
                required
                autoFocus
                className="text-center"
                style={{ letterSpacing: '0.5em', fontSize: '1.2rem' }}
              />
            </Form.Group>
            <Button
              variant="primary"
              type="submit"
              className="w-100 mt-2"
              disabled={loading || otp.length < 4}
              style={{ backgroundColor: '#704a0d', borderColor: '#704a0d' }}
            >
              {loading ? <Spinner size="sm" /> : 'Verify & Proceed'}
            </Button>
          </Form>
        )}
      </Modal.Body>
    </StyledModal>
  );
};

export default OTPModal;

const StyledModal = styled(Modal)`
  .modal-content {
    border-radius: 12px;
    border: none;
    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  }
  .modal-header {
    border-bottom: 1px solid #f0f0f0;
    .modal-title {
      font-size: 1.2rem;
      font-weight: 600;
      color: #333;
    }
  }
`;

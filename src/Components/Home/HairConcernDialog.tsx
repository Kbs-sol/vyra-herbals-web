'use client';

import React from 'react';
import styled from 'styled-components';
import Link from 'next/link';

interface HairConcernDialogProps {
    isOpen: boolean;
    onClose: () => void;
    concern: {
        title: string;
        icon: string;
        description: string;
        recommendedProductsLink: string;
    } | null;
}

const HairConcernDialog: React.FC<HairConcernDialogProps> = ({ isOpen, onClose, concern }) => {
    if (!isOpen || !concern) return null;

    return (
        <DialogOverlay onClick={onClose}>
            <DialogContent onClick={(e) => e.stopPropagation()}>
                <CloseButton onClick={onClose}>&times;</CloseButton>
                <Header>
                    <IconWrapper>{concern.icon}</IconWrapper>
                    <Title>{concern.title}</Title>
                </Header>
                <Body>
                    <Description>{concern.description}</Description>
                    <ActionLink href={concern.recommendedProductsLink} onClick={onClose}>
                        Shop Recommended Products
                    </ActionLink>
                </Body>
            </DialogContent>
        </DialogOverlay>
    );
};

export default HairConcernDialog;

const DialogOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  padding: 20px;
`;

const DialogContent = styled.div`
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s ease-out;

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  line-height: 1;
  padding: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  transition: background 0.2s;

  &:hover {
    background: #f0f0f0;
    color: #333;
  }
`;

const Header = styled.div`
  background: #faf3e8;
  padding: 30px 20px 20px;
  text-align: center;
  border-bottom: 1px solid #efe4d3;
`;

const IconWrapper = styled.div`
  font-size: 40px;
  margin-bottom: 15px;
  display: inline-block;
  background: #fff;
  width: 80px;
  height: 80px;
  line-height: 80px;
  border-radius: 50%;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
`;

const Title = styled.h3`
  margin: 0;
  font-size: 1.5rem;
  color: #3f2a1d;
  font-weight: 700;
`;

const Body = styled.div`
  padding: 30px 20px;
  text-align: center;
`;

const Description = styled.p`
  color: #555;
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 25px;
`;

const ActionLink = styled(Link)`
  display: inline-block;
  background: #3f2a1d;
  color: #fff;
  padding: 12px 24px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s ease;

  &:hover {
    background: #5a3c2a;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(63, 42, 29, 0.2);
    color: #fff;
  }
`;

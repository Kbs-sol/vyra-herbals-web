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

    // Type casting to handle the expanded data structure
    const data = concern as any;

    return (
        <DialogOverlay onClick={onClose}>
            <DialogContent onClick={(e) => e.stopPropagation()}>
                <CloseButton onClick={onClose}>&times;</CloseButton>
                
                <ContentInner>
                    <HeaderSection>
                        <IconBox>{data.icon}</IconBox>
                        <TitleGroup>
                            <MainTitle>{data.title}</MainTitle>
                            <SubTitle>{data.subtitle}</SubTitle>
                        </TitleGroup>
                    </HeaderSection>

                    <DescriptionText>{data.description}</DescriptionText>

                    <SectionTitle>COMMON CAUSES</SectionTitle>
                    <CausesWrapper>
                        {data.commonCauses?.map((cause: string, index: number) => (
                            <CauseTag key={index}>{cause}</CauseTag>
                        ))}
                    </CausesWrapper>

                    <SectionTitle>TIPS TO HELP</SectionTitle>
                    <TipsList>
                        {data.tips?.map((tip: string, index: number) => (
                            <TipItem key={index}>
                                <TipNumber>{index + 1}</TipNumber>
                                <TipText>{tip}</TipText>
                            </TipItem>
                        ))}
                    </TipsList>

                    <SectionTitle>RECOMMENDED PRODUCT</SectionTitle>
                    <ProductCard>
                        <ProductIconBox>{data.recommendedProduct?.icon}</ProductIconBox>
                        <ProductInfo>
                            <ProductTag>BEST FOR THIS PROBLEM</ProductTag>
                            <ProductName>{data.recommendedProduct?.name}</ProductName>
                            <ProductDetails>{data.recommendedProduct?.info}</ProductDetails>
                        </ProductInfo>
                        <ShopNowButton href={data.recommendedProduct?.link || '#'} onClick={onClose}>
                            Shop Now
                        </ShopNowButton>
                    </ProductCard>
                </ContentInner>
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
  background: rgba(0, 0, 0, 0.4);
  z-index: 1000;
  display: flex;
  align-items: flex-start; /* Ensure top content is accessible */
  justify-content: center;
  backdrop-filter: blur(2px);
  padding: 40px 20px; /* Vertical padding for scroll room */
  overflow-y: auto; /* Enable vertical scrolling */
  -webkit-overflow-scrolling: touch;
`;

const DialogContent = styled.div`
  background: #fdf8f1; /* Cream background from screenshot */
  border-radius: 24px;
  width: 100%;
  max-width: 750px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
  animation: slideUp 0.3s ease-out;
  margin: auto; /* Keep centered when shorter than viewport */
  flex-shrink: 0; /* Prevent flexbox from shrinking the modal */

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const ContentInner = styled.div`
  padding: 30px 40px;
  
  @media (max-width: 600px) {
    padding: 24px;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  background: #f0e6d6;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #5d4037;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  transition: all 0.2s;
  z-index: 10;

  &:hover {
    background: #e5d8c5;
    transform: rotate(90deg);
  }
`;

const HeaderSection = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 16px;
`;

const IconBox = styled.div`
  background: #f8f0e3;
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  box-shadow: inset 0 0 10px rgba(0,0,0,0.02);
`;

const TitleGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const MainTitle = styled.h3`
  margin: 0;
  font-size: 1.75rem;
  color: #3f2a1d;
  font-weight: 500;
  font-family: 'Playfair Display', serif; /* Or similar serif font */
`;

const SubTitle = styled.span`
  color: #c69c6d;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
`;

const DescriptionText = styled.p`
  color: #6b5142;
  font-size: 1rem;
  line-height: 1.5;
  margin-bottom: 20px;
  font-weight: 400;
`;

const SectionTitle = styled.h4`
  color: #c69c6d;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 1px;
  margin: 16px 0 12px;
  text-transform: uppercase;
`;

const CausesWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
`;

const CauseTag = styled.span`
  background: #f0e6d6;
  color: #3f2a1d;
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 500;
`;

const TipsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const TipItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 14px;
`;

const TipNumber = styled.span`
  background: #4a6a51; /* Muted green from screenshot */
  color: #fff;
  width: 24px;
  height: 24px;
  min-width: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  margin-top: 2px;
`;

const TipText = styled.p`
  margin: 0;
  color: #5d4037;
  font-size: 1.05rem;
  line-height: 1.5;
`;

const ProductCard = styled.div`
  background: #3f2a1d; /* Dark brown background */
  border-radius: 20px;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  margin-top: 8px;
  color: #fff;
  position: relative;

  @media (max-width: 600px) {
    flex-direction: column;
    text-align: center;
    padding-bottom: 32px;
  }
`;

const ProductIconBox = styled.div`
  background: rgba(255, 255, 255, 0.08);
  width: 80px;
  height: 80px;
  min-width: 80px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
`;

const ProductInfo = styled.div`
  flex: 1;
`;

const ProductTag = styled.span`
  color: #c69c6d;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 1px;
  display: block;
  margin-bottom: 4px;
  text-transform: uppercase;
`;

const ProductName = styled.h5`
  margin: 0;
  font-size: 1.15rem;
  font-weight: 500;
  color: #fdf8f1;
`;

const ProductDetails = styled.p`
  margin: 4px 0 0;
  font-size: 0.95rem;
  color: #d7ccc8;
  opacity: 0.9;
`;

const ShopNowButton = styled(Link)`
  background: #c69c6d;
  color: #3f2a1d;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 700;
  text-decoration: none;
  font-size: 1rem;
  transition: all 0.3s ease;
  white-space: nowrap;

  &:hover {
    background: #b58b5c;
    transform: scale(1.05);
    color: #3f2a1d;
  }

  @media (max-width: 600px) {
    width: 100%;
    margin-top: 10px;
    text-align: center;
  }
`;

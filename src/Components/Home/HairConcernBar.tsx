'use client';

import React, { useState } from 'react';
import styled from 'styled-components';
import HairConcernDialog from './HairConcernDialog';

const CONCERNS = [
    {
        id: 'hair-loss',
        title: 'Hair Loss',
        icon: '🌿',
        description: 'Experiencing abnormal hair fall? Vyra Herbals offers natural solutions packed with potent herbs to strengthen your roots, reduce shedding, and promote denser, healthier hair growth.',
        recommendedProductsLink: '/search?searchtext=hair fall'
    },
    {
        id: 'hair-growth',
        title: 'Hair Growth',
        icon: '✨',
        description: 'Looking to accelerate your hair growth naturally? Our specialized blends stimulate follicles, enhance blood circulation to the scalp, and provide the essential nutrients needed for longer, stronger hair.',
        recommendedProductsLink: '/search?searchtext=growth'
    },
    {
        id: 'diet-for-hair',
        title: 'Diet for Hair',
        icon: '🥗',
        description: 'Healthy hair starts from within. Discover our range of natural supplements and expert advice to ensure you\'re getting the right vitamins and minerals for optimal hair health.',
        recommendedProductsLink: '/search?searchtext=all'
    },
    {
        id: 'dandruff',
        title: 'Dandruff',
        icon: '❄️',
        description: 'Say goodbye to flaky, itchy scalp. Our anti-dandruff formulations use natural antifungal herbs to balance your scalp\'s microbiome, providing lasting relief from dandruff.',
        recommendedProductsLink: '/search?searchtext=dandruff'
    },
    {
        id: 'dry-damage',
        title: 'Dry & Damage',
        icon: '💧',
        description: 'Restore life to dry, brittle, and heat-damaged hair. Our deep-conditioning natural oils and masks penetrate the hair shaft to repair structures and lock in essential moisture.',
        recommendedProductsLink: '/search?searchtext=dry'
    },
    {
        id: 'oily-scalp',
        title: 'Oily Scalp',
        icon: '🫧',
        description: 'Struggling with excessive sebum? Vyra Herbals balancing treatments cleanse deeply without stripping natural oils, regulating sebum production for a fresh, clean scalp all day.',
        recommendedProductsLink: '/search?searchtext=cleanse'
    }
];

const HairConcernBar = () => {
    const [selectedConcern, setSelectedConcern] = useState<typeof CONCERNS[0] | null>(null);

    const handleConcernClick = (concern: typeof CONCERNS[0]) => {
        setSelectedConcern(concern);
    };

    const closeDialog = () => {
        setSelectedConcern(null);
    };

    return (
        <>
            <SectionWrapper>
                <Container>
                    <Title>WHAT'S YOUR HAIR CONCERN?</Title>
                    <ScrollContainer>
                        <ChipsWrapper>
                            {CONCERNS.map((concern) => (
                                <ChipButton key={concern.id} onClick={() => handleConcernClick(concern)}>
                                    <Icon>{concern.icon}</Icon>
                                    <ChipText>{concern.title}</ChipText>
                                </ChipButton>
                            ))}
                        </ChipsWrapper>
                    </ScrollContainer>
                </Container>
            </SectionWrapper>

            <HairConcernDialog
                isOpen={!!selectedConcern}
                onClose={closeDialog}
                concern={selectedConcern}
            />
        </>
    );
};

export default HairConcernBar;

const SectionWrapper = styled.section`
  background: #3f2a1d; /* Dark brown from screenshot */
  padding: 24px 0 32px;
  width: 100%;
  border-top: 4px solid #2a1b12;
`;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
`;

const Title = styled.h2`
  text-align: center;
  color: #c69c6d; /* Golden color from screenshot */
  font-size: 1rem;
  letter-spacing: 1.5px;
  margin-bottom: 20px;
  font-weight: 600;
  text-transform: uppercase;
`;

const ScrollContainer = styled.div`
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none; /* Firefox */
  &::-webkit-scrollbar {
    display: none; /* Chrome/Safari/Edge */
  }
`;

const ChipsWrapper = styled.div`
  display: flex;
  gap: 16px;
  justify-content: center;
  align-items: center;
  min-width: max-content;
  padding: 4px;

  @media (max-width: 900px) {
    justify-content: flex-start;
  }
`;

const ChipButton = styled.button`
  background: transparent;
  border: 1px solid #6b5142;
  border-radius: 40px;
  padding: 10px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 130px;
  outline: none;

  &:hover {
    background: rgba(198, 156, 109, 0.1);
    border-color: #c69c6d;
    transform: translateY(-2px);
  }
`;

const Icon = styled.span`
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
`;

const ChipText = styled.span`
  color: #f2e8d9;
  font-size: 0.95rem;
  font-weight: 500;
  white-space: nowrap;
`;

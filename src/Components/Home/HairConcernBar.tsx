'use client';

import React, { useState } from 'react';
import styled from 'styled-components';
import HairConcernDialog from './HairConcernDialog';

const CONCERNS = [
    {
        id: 'hair-loss',
        title: 'Hair Loss',
        subtitle: 'THINNING & SHEDDING',
        icon: '🌿',
        description: 'Hair loss affects millions and can be triggered by stress, nutrition, hormones, or genetics. Understanding the root cause helps you treat it effectively before it worsens.',
        commonCauses: ['Stress', 'Hormonal Changes', 'Iron Deficiency', 'Genetics', 'Scalp Issues', 'Post-Pregnancy'],
        tips: [
            'Massage scalp daily with warm oil to improve blood circulation',
            'Avoid tight hairstyles that pull on hair follicles',
            'Use a gentle, sulfate-free shampoo 2–3 times a week',
            'Eat protein-rich foods like eggs, lentils, and nuts'
        ],
        recommendedProduct: {
            name: 'Root Revive Hair Oil',
            info: 'With Bhringraj & Castor — reduces shedding in 4 weeks',
            icon: '🌿',
            link: '/search?searchtext=hair fall'
        },
        recommendedProductsLink: '/search?searchtext=hair fall'
    },
    {
        id: 'hair-growth',
        title: 'Hair Growth',
        subtitle: 'STIMULATE & LENGTHEN',
        icon: '✨',
        description: 'Looking to accelerate your hair growth naturally? Our specialized blends stimulate follicles, enhance blood circulation to the scalp, and provide the essential nutrients needed for longer, stronger hair.',
        commonCauses: ['Slow Growth', 'Sparse Patches', 'Inadequate Nutrition', 'Styling Damage', 'Seasonal Change'],
        tips: [
            'Regularly trim split ends to prevent breakage',
            'Apply nutrient-rich hair masks once a week',
            'Maintain a balanced diet rich in Biotin and Vitamin E',
            'Avoid excessive heat styling'
        ],
        recommendedProduct: {
            name: 'Growth Accelerate Mask',
            info: 'With Biotin & Peppermint — stimulates follicles for faster growth',
            icon: '✨',
            link: '/search?searchtext=growth'
        },
        recommendedProductsLink: '/search?searchtext=growth'
    },
    {
        id: 'diet-for-hair',
        title: 'Diet for Hair',
        subtitle: 'NURTURE FROM WITHIN',
        icon: '🥗',
        description: 'Healthy hair starts from within. Discover our range of natural supplements and expert advice to ensure you\'re getting the right vitamins and minerals for optimal hair health.',
        commonCauses: ['Vitamin Deficiencies', 'Poor Hydration', 'Stressful Lifestyle', 'Lack of Protein'],
        tips: [
            'Drink at least 8 glasses of water daily',
            'Incorporate nuts and seeds into your daily diet',
            'Monitor your iron and zinc levels',
            'Take herbal supplements if prescribed'
        ],
        recommendedProduct: {
            name: 'Hair Vitality Supplements',
            info: 'Pure herbal extracts for stronger hair from the roots',
            icon: '🥗',
            link: '/search?searchtext=all'
        },
        recommendedProductsLink: '/search?searchtext=all'
    },
    {
        id: 'dandruff',
        title: 'Dandruff',
        subtitle: 'FLAKE-FREE SCALP',
        icon: '❄️',
        description: 'Say goodbye to flaky, itchy scalp. Our anti-dandruff formulations use natural antifungal herbs to balance your scalp\'s microbiome, providing lasting relief from dandruff.',
        commonCauses: ['Malassezia Fungus', 'Dry Scalp', 'Excessive Oil', 'Build-up of Products'],
        tips: [
            'Use a specialized anti-dandruff shampoo regularly',
            'Avoid sharing combs and hairbrushes',
            'Exfoliate your scalp gently once a week',
            'Reduce use of heavy hair styling products'
        ],
        recommendedProduct: {
            name: 'Anti-Dandruff Herbal Cleanser',
            info: 'Neem & Tea Tree — clears flakes and soothes itchiness',
            icon: '❄️',
            link: '/search?searchtext=dandruff'
        },
        recommendedProductsLink: '/search?searchtext=dandruff'
    },
    {
        id: 'dry-damage',
        title: 'Dry & Damage',
        subtitle: 'REPAIR & RESTORE',
        icon: '💧',
        description: 'Restore life to dry, brittle, and heat-damaged hair. Our deep-conditioning natural oils and masks penetrate the hair shaft to repair structures and lock in essential moisture.',
        commonCauses: ['Heat Styling', 'Chemical Treatments', 'Environmental Stress', 'Over-washing'],
        tips: [
            'Deep condition your hair once a week',
            'Use a microfiber towel to gently dry hair',
            'Apply heat protectant before styling',
            'Minimize use of chemical dyes and treatments'
        ],
        recommendedProduct: {
            name: 'Deep Repair Serum',
            info: 'Argan & Coconut — restores moisture and shine',
            icon: '💧',
            link: '/search?searchtext=dry'
        },
        recommendedProductsLink: '/search?searchtext=dry'
    },
    {
        id: 'oily-scalp',
        title: 'Oily Scalp',
        subtitle: 'BALANCE & FRESHEN',
        icon: '🫧',
        description: 'Struggling with excessive sebum? Vyra Herbals balancing treatments cleanse deeply without stripping natural oils, regulating sebum production for a fresh, clean scalp all day.',
        commonCauses: ['Overactive Sebum Glands', 'Humid Condition', 'Frequent Touching', 'Wrong Hair Products'],
        tips: [
            'Wash hair with lukewarm water, not hot',
            'Avoid applying conditioner to the scalp',
            'Use a clarifying shampoo once a week',
            'Avoid over-brushing your hair'
        ],
        recommendedProduct: {
            name: 'Sebum Balance Clay Mask',
            info: 'Charcoal & Lemon — absorbs excess oil and refreshes',
            icon: '🫧',
            link: '/search?searchtext=cleanse'
        },
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

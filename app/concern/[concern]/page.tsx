import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerSupabase } from '@/utils/supabaseClient';
import {
  SITE_URL,
  breadcrumbJsonLd,
  faqJsonLd,
  itemListJsonLd,
  howToJsonLd,
  speakableJsonLd,
} from '@/utils/seo';
import JsonLd from '@/Components/Shared/JsonLd';

/**
 * Concern-based landing pages: /concern/hair-fall, /concern/hair-growth,
 * /concern/dandruff, /concern/scalp-care.
 *
 * The SEO audit's GSC data shows queries like "hair oil for hair fall",
 * "rosemary leaves for hair growth", "how many times a week should I oil my
 * hair" already generate impressions (positions 4-50) but ~0 clicks — because
 * the site had no dedicated landing page for any hair concern. This route is
 * programmatic SEO: one server component + a content bank generates a fully-
 * indexed, JSON-LD-decorated, AEO-friendly landing page per concern with a
 * matching product carousel above the fold.
 *
 * Business context (from the order-analysis PDF): AOV ₹350, ₹300/day ads,
 * combos are the profitable landing target. Every concern page therefore
 * surfaces a matching combo among the first 4 recommended products.
 */

export const revalidate = 900;

type Params = { concern: string };

interface ConcernContent {
  slug: string;
  displayName: string;
  title: string;
  description: string;
  h1: string;
  quickAnswer: string;
  guide: { heading: string; body: string }[];
  faqs: { question: string; answer: string }[];
  productHandles: string[];
  keywords: string[];
  /**
   * Optional HowTo — attaches a HowTo JSON-LD block if present. AI answer
   * engines (ChatGPT, Perplexity, Claude, Gemini) heavily quote step-by-step
   * instructions marked with this schema. Google no longer renders the rich
   * result but the schema still improves discoverability in generative
   * answers.
   */
  howTo?: {
    name: string;
    description: string;
    totalTime?: string; // e.g. "PT10M"
    supply?: string[];
    tool?: string[];
    steps: Array<{ name: string; text: string }>;
  };
}

const CONCERNS: Record<string, ConcernContent> = {
  'hair-fall': {
    slug: 'hair-fall',
    displayName: 'Hair Fall',
    title: '100% Natural Hair Oil for Hair Fall — Handmade Herbal Solution | Vyra Herbals',
    description: 'Stop hair fall the natural way. Vyra\'s 100% natural handmade 9-herb hair oil with rosemary, neem, curry leaves and hibiscus reduces breakage, strengthens roots and promotes regrowth. Chemical-free, sulphate-free, paraben-free. ISO & GMP certified. Free shipping across India.',
    h1: 'Natural Herbal Hair Oil for Hair Fall — What Actually Works',
    quickAnswer:
      'Hair fall between 50-100 strands a day is normal; more usually signals scalp weakness, nutritional gaps, or hormonal changes. Vyra Herbals\' 100% natural handmade hair oil combines rosemary (a 2015 clinical trial found it rivals 2% minoxidil), neem (anti-inflammatory), curry leaves (protein), and 6 other traditional herbs to strengthen roots and reduce breakage without sulphates, parabens or synthetic chemicals.',
    guide: [
      {
        heading: 'Why does hair fall happen?',
        body: 'Four main causes: scalp inflammation (dandruff, product build-up), nutritional gaps (iron, protein, vitamin D, B12), hormonal shifts (postpartum, PCOS, thyroid), and chemical damage from heat + harsh shampoos. Herbal hair oil addresses the first cause directly — the second and third need dietary support alongside oiling.',
      },
      {
        heading: 'How to use herbal hair oil for hair fall',
        body: 'Warm 2-3 tablespoons of oil to skin-safe temperature. Section your hair and apply oil directly to the scalp, not the strands. Massage in small circles for 5-10 minutes to improve blood flow to the follicles. Leave for at least 2 hours, ideally overnight. Wash with a sulphate-free shampoo. Frequency: 2-3 times a week for visible reduction in fall within 6-8 weeks.',
      },
      {
        heading: 'Ingredients that actually reduce hair fall',
        body: 'Rosemary essential oil (peer-reviewed comparable to 2% minoxidil), neem (kills bacteria that inflame follicles), curry leaves (protein and amino acids), bhringraj (the Ayurvedic "king of herbs" for hair), hibiscus (natural conditioner, slows DHT-driven loss), amla (vitamin C for collagen), brahmi, methi (fenugreek), and virgin coconut oil as the carrier.',
      },
    ],
    faqs: [
      { question: 'How many times a week should I oil my hair for hair fall?', answer: '2-3 times a week is ideal. Daily oiling can clog scalp pores. Leave the oil in for at least 2 hours before washing — overnight if your hair tolerates it.' },
      { question: 'Does rosemary oil really reduce hair fall?', answer: 'A 2015 clinical trial (Panahi et al., Skinmed) compared 2% minoxidil to rosemary essential oil and found comparable regrowth after 6 months, with less scalp itching in the rosemary group.' },
      { question: 'How long before I see less hair fall with Vyra herbal oil?', answer: 'Most customers see visible reduction in daily fall within 6-8 weeks of consistent use (2-3 oiling sessions per week + sulphate-free shampoo). Full regrowth of thinning areas takes 3-6 months.' },
      { question: 'Can I use Vyra hair oil for postpartum hair fall?', answer: 'Yes. Postpartum shedding is caused by dropping estrogen — an external oil cannot change that, but it prevents secondary breakage and supports new regrowth. Use for 4-6 months.' },
      { question: 'Is Vyra herbal oil safe for oily scalp?', answer: 'Yes — the oil is applied to the scalp then washed off within 2-8 hours. Oily scalps often benefit MORE because herbal oiling rebalances sebum production over time.' },
      { question: 'What shampoo should I pair with the hair oil?', answer: 'A sulphate-free shampoo. Vyra\'s Herbal Shampoo pairs specifically with the oil (same herb base). The oil + shampoo combo is ₹529 vs ₹350 for oil alone.' },
    ],
    productHandles: ['hair-oil-100ml', 'hair-oil-200ml', 'herbal-hair-oil', 'oil-shampoo-combo', 'hair-care-kit'],
    keywords: [
      'hair oil for hair fall',
      'natural hair oil for hair fall',
      'handmade hair oil for hair fall',
      'herbal hair oil',
      'home-made hair oil for hair fall',
      'chemical-free hair oil',
      'rosemary hair oil',
      'stop hair fall naturally',
      'postpartum hair fall',
      'ayurvedic hair oil', // retained low priority for long-tail traffic
    ],
    howTo: {
      name: 'How to apply herbal hair oil to reduce hair fall',
      description:
        'A step-by-step routine for using Vyra Herbals\' 9-herb hair oil to reduce hair fall, strengthen roots, and support regrowth. Recommended 2-3 times a week.',
      totalTime: 'PT2H15M',
      supply: ['Vyra Herbal Hair Oil (2-3 tablespoons)', 'Soft cotton towel', 'Sulphate-free shampoo'],
      tool: ['Silicone scalp massager (optional)', 'Wide-toothed neem comb'],
      steps: [
        {
          name: 'Warm the oil',
          text: 'Pour 2-3 tablespoons of Vyra Herbal Hair Oil into a small bowl and warm it to skin-safe temperature — a bain-marie or 15 seconds of gentle warming is enough. Never microwave; overheating destroys the volatile rosemary compounds.',
        },
        {
          name: 'Section your hair',
          text: 'Divide your hair into 4-6 sections with clips. Wet or dry hair both work; slightly damp scalp absorbs oil faster.',
        },
        {
          name: 'Apply oil to the scalp (not the strands)',
          text: 'Dip your fingertips into the oil and apply directly to the scalp, section by section. The strands only need whatever oil naturally travels down during massage. Cover thinning areas and hairline with extra care.',
        },
        {
          name: 'Massage in circular motions for 5-10 minutes',
          text: 'Use the pads of your fingers (or a silicone scalp massager) to massage in slow, small circles. This improves blood flow to the follicles — the mechanism rosemary was clinically shown to enhance in the Panahi 2015 trial.',
        },
        {
          name: 'Rest for at least 2 hours (ideally overnight)',
          text: 'Wrap your head in a soft cotton towel to keep hair off the pillow. Longer contact gives the herbal actives more time to penetrate the follicle. Do not sleep on satin without a towel — oil will stain.',
        },
        {
          name: 'Wash with a sulphate-free shampoo',
          text: 'Apply shampoo directly to a wet scalp, lather with cool-to-lukewarm water, and rinse twice. Vyra Herbal Shampoo pairs specifically with the oil (shared herb base). Skip conditioner on the scalp; apply to mid-lengths only.',
        },
        {
          name: 'Repeat 2-3 times a week for 6-8 weeks',
          text: 'Consistency matters more than session length. Visible reduction in daily fall typically appears within 6-8 weeks; regrowth of thinning areas takes 3-6 months (one full follicle cycle).',
        },
      ],
    },
  },

  'hair-growth': {
    slug: 'hair-growth',
    displayName: 'Hair Growth',
    title: 'Rosemary Leaves & 100% Natural Hair Growth Oil — Vyra Herbals',
    description: 'Grow thicker, longer hair with Vyra\'s rosemary-based handmade herbal treatment. 9 natural herbs, proven ingredients, chemical-free, sulphate-free. ISO 9001:2015 & GMP certified. Free shipping across India.',
    h1: 'Natural Herbal Hair Growth — A Handmade, Chemical-Free Approach',
    quickAnswer:
      'Healthy hair grows about 1.25 cm (0.5 inch) per month. Speed depends on scalp circulation, nutrition, and reducing breakage — not on any single product. Vyra\'s rosemary-based herbal system supports faster visible growth by improving scalp blood flow, preventing breakage, and nourishing follicles. Expect visible thickness in 3-4 months.',
    guide: [
      {
        heading: 'What actually accelerates hair growth?',
        body: 'Genetics set your ceiling — everything else is about not blocking your baseline. Three levers matter: (1) scalp circulation, which oil massage improves dramatically; (2) protein + iron + vitamin D in diet; (3) reducing daily breakage, since a hair that snaps at 15 cm looks like it never grew past 15 cm. Rosemary is the one ingredient with real clinical support for accelerating growth.',
      },
      {
        heading: 'How to use rosemary leaves for hair growth',
        body: 'Two proven methods. (A) Rosemary-infused oil: soak 2 tablespoons of dried rosemary leaves in 100ml of Vyra herbal oil for 2 weeks in a dark bottle, then apply 2-3× a week. (B) Rosemary rinse: boil 1 cup of leaves in 500ml water for 15 minutes, cool, strain, and pour over hair as the final rinse after shampoo. Both work — the oil is more convenient, the rinse is stronger short-term.',
      },
      {
        heading: 'Regrowing thinning areas',
        body: 'Thinning areas take 3-6 months to visibly regrow because a hair follicle\'s growth cycle is that long. Massage those specific areas for an extra 2-3 minutes per session. Take a "before" photo on day one — it\'s the only honest way to measure progress in month 4.',
      },
    ],
    faqs: [
      { question: 'How to use rosemary leaves for hair growth?', answer: 'Two methods: (1) infuse dried rosemary leaves in herbal oil for 2 weeks, then massage into scalp 2-3× weekly; (2) boil the leaves in water for 15 min, cool, and use as a final hair rinse after shampoo. Both improve scalp circulation.' },
      { question: 'Does rosemary really help hair grow faster?', answer: 'Rosemary essential oil has one peer-reviewed 6-month trial (Panahi et al., 2015) showing regrowth comparable to 2% minoxidil. Rosemary leaves have less direct evidence but the same active compound family and no side effects.' },
      { question: 'How long does hair take to grow using herbal treatments?', answer: 'Baseline hair growth is 1.25 cm per month (about half an inch). With consistent oiling + rosemary + sulphate-free wash, you can expect that ceiling PLUS reduced breakage — meaning noticeable length gain in 3-4 months.' },
      { question: 'Which is better for growth — hair oil or hair mask?', answer: 'Different jobs. Oil (2-3× weekly, scalp) targets the follicle and blood flow. Mask (once weekly, hair strands) targets protein and moisture. Use both. A full herbal hair-care kit is the fastest path.' },
      { question: 'Can herbal hair growth oil regrow bald patches?', answer: 'It can help regrow thinning areas where follicles are still alive but dormant. It cannot regrow follicles that have been dead for years. If your bald patch has been the same size for 2+ years, consult a dermatologist alongside herbal use.' },
      { question: 'Do I need to eat differently for faster hair growth?', answer: 'Yes. Aim for 1g protein per kg body weight, 18mg iron for women / 8mg for men, vitamin D 600-2000 IU, and biotin from eggs/nuts. Deficiencies in any of these will flatline growth regardless of what oil you use.' },
    ],
    productHandles: ['rosemary-leaves', 'hair-oil-100ml', 'hair-oil-200ml', 'herbal-hair-mask-powder', 'hair-care-kit'],
    keywords: [
      'rosemary leaves for hair growth',
      'natural hair growth oil',
      'hair growth oil',
      'handmade hair growth oil',
      'grow hair faster naturally',
      'herbal hair regrowth',
      'chemical-free hair growth',
      'ayurvedic hair growth', // retained low priority for long-tail traffic
    ],
    howTo: {
      name: 'How to use rosemary leaves for hair growth',
      description:
        'Two traditional preparations — a rosemary-infused herbal oil and a post-shampoo rosemary rinse — that improve scalp circulation and support faster visible hair growth.',
      totalTime: 'PT30M',
      supply: ['2 tablespoons dried Vyra rosemary leaves', '100ml Vyra Herbal Hair Oil (for infusion) OR 500ml water (for rinse)'],
      tool: ['Dark glass bottle (for oil infusion)', 'Small saucepan and strainer (for rinse)'],
      steps: [
        {
          name: 'Method A · Prepare a rosemary-infused hair oil',
          text: 'Add 2 tablespoons of dried rosemary leaves to a dark glass bottle. Pour in 100ml of Vyra Herbal Hair Oil. Seal and store in a cool, dark cupboard for 2 weeks, shaking daily.',
        },
        {
          name: 'Strain and use the infused oil',
          text: 'After 2 weeks, strain out the leaves through a fine sieve or muslin cloth. Apply 1-2 tablespoons to the scalp 2-3 times a week, massage for 5-10 minutes, leave for 2 hours or overnight, then wash with sulphate-free shampoo.',
        },
        {
          name: 'Method B · Boil a rosemary rinse',
          text: 'Bring 500ml of filtered water to a boil. Add 1 cup (roughly 20g) of dried Vyra rosemary leaves. Simmer covered for 15 minutes. Turn off heat and let the leaves steep as the water cools.',
        },
        {
          name: 'Strain and cool the rinse',
          text: 'Strain the leaves out. Let the liquid cool to room or lukewarm temperature — never pour warm liquid on the scalp.',
        },
        {
          name: 'Use as a final rinse after shampoo',
          text: 'After shampooing and rinsing your hair, pour the rosemary infusion slowly over your scalp and hair, letting it collect in a bowl below. Pour that bowl through again 2-3 times. Do not rinse it out. Squeeze gently and let hair air-dry.',
        },
        {
          name: 'Track progress with a photo diary',
          text: 'Hair grows about 1.25 cm (0.5 inch) per month — visible new growth takes 3-4 months of consistent use. Take a "day 1" photo of your hairline and crown. It is the only reliable way to measure results in month 4.',
        },
      ],
    },
  },

  'dandruff': {
    slug: 'dandruff',
    displayName: 'Dandruff',
    title: 'Herbal Dandruff Treatment — Anti-Dandruff Shampoo & Oil | Vyra Herbals',
    description: 'End dandruff and itchy scalp with Vyra\'s neem-based herbal shampoo + oil. Sulphate-free, paraben-free, fungus-fighting formulation. Chemical-free relief that doesn\'t strip natural oils. Free shipping across India.',
    h1: 'Herbal Dandruff Treatment That Actually Works',
    quickAnswer:
      'Dandruff is not dry scalp — it\'s an overgrowth of a scalp yeast (Malassezia) that feeds on oil. Harsh anti-dandruff shampoos strip the scalp, causing the fungus to rebound harder. Vyra\'s neem-based herbal shampoo kills the fungus gently, and the herbal oil restores scalp balance without feeding regrowth. Visible improvement in 2-3 washes.',
    guide: [
      {
        heading: 'Why anti-dandruff shampoo keeps failing',
        body: 'Most anti-dandruff shampoos contain sodium lauryl sulphate — it strips every drop of scalp oil. The Malassezia yeast (which causes dandruff) then rebounds because your scalp overproduces oil to compensate. Sulphate-free herbal shampoos break this cycle: they clean without triggering rebound sebum. Neem provides the antifungal effect directly.',
      },
      {
        heading: 'The correct herbal routine for dandruff',
        body: 'Twice a week: warm herbal oil, massage into scalp for 5 minutes, leave 30-60 min, wash with herbal shampoo. Once a week: add a hair mask if the scalp is very dry. Between washes, avoid touching or scratching the scalp — nails carry more Malassezia.',
      },
      {
        heading: 'Dandruff vs dry scalp vs seborrheic dermatitis',
        body: 'Dandruff: white/yellow flakes, oily scalp, no redness. Dry scalp: tiny dry flakes, tight feeling, comes and goes. Seborrheic dermatitis: yellow flakes with redness and burning — needs medical attention. Herbal remedies work for the first two. For the third, herbal maintenance helps but a prescription antifungal shampoo is needed alongside.',
      },
    ],
    faqs: [
      { question: 'How does herbal shampoo help with dandruff?', answer: 'Neem and rosemary are natural antifungals — they target Malassezia (the yeast that causes dandruff) directly. Sulphate-free cleansers don\'t strip the scalp, so your body doesn\'t overproduce oil in rebound. The dandruff cycle breaks in 2-3 washes.' },
      { question: 'How often should I use anti-dandruff herbal shampoo?', answer: 'Every wash while you have active dandruff — 2-3 times a week. Once the flakes stop (usually within 2-3 weeks), switch to alternating with a gentler herbal shampoo to keep the scalp microbiome balanced.' },
      { question: 'Can I use hair oil if I have dandruff?', answer: 'Yes, but only herbal oil with antifungal ingredients (neem, rosemary). Regular coconut oil actually feeds Malassezia and worsens dandruff. Massage the oil in, leave 30-60 min max (not overnight), then wash out with anti-dandruff shampoo.' },
      { question: 'Will dandruff come back after I stop the herbal treatment?', answer: 'It can — Malassezia lives on every scalp, dandruff is about balance. Once controlled, most customers wash with the herbal shampoo 1× a week as maintenance. If dandruff returns, restart the twice-weekly routine.' },
      { question: 'What causes stubborn dandruff that won\'t go away?', answer: 'Common culprits: not massaging the shampoo into the scalp (it needs 2-3 min contact time), stress/hormones (increases sebum which feeds yeast), a very oily diet, or actually seborrheic dermatitis (needs a doctor). If herbal treatment fails after 4 weeks, get a scalp exam.' },
    ],
    productHandles: ['herbal-shampoo-200ml', 'shampoo-scalp-massager-combo', 'hair-oil-100ml', 'scalp-massager'],
    keywords: ['herbal dandruff treatment', 'anti dandruff shampoo natural', 'sulphate free anti dandruff', 'neem shampoo dandruff', 'stop dandruff naturally'],
    howTo: {
      name: 'How to treat dandruff naturally with herbal shampoo',
      description:
        'A 4-week routine using Vyra Herbal Shampoo and neem-based hair oil to reduce dandruff, flakes, and scalp itching without harsh anti-fungals.',
      totalTime: 'PT1H',
      supply: ['Vyra Herbal Shampoo (sulphate-free)', 'Vyra Herbal Hair Oil with neem'],
      tool: ['Silicone scalp massager', 'Wide-toothed comb'],
      steps: [
        {
          name: 'Pre-wash oiling (twice a week)',
          text: 'Warm 2 tablespoons of Vyra Herbal Hair Oil. Section your hair and apply directly to the scalp. Massage in circles for 8-10 minutes to lift dead skin and reduce Malassezia fungal load. Rest for at least 1 hour before washing.',
        },
        {
          name: 'Wet your hair with cool water',
          text: 'Hot water strips the scalp barrier and worsens dandruff. Use cool-to-lukewarm water only. Wet hair thoroughly for 30 seconds before shampooing.',
        },
        {
          name: 'First shampoo pass — 2 minutes',
          text: 'Apply Vyra Herbal Shampoo directly to the scalp (not the strands). Massage in circles for a full 2 minutes so the herbal actives (neem, tulsi, hibiscus) contact the skin. Rinse.',
        },
        {
          name: 'Second shampoo pass — cleanse the strands',
          text: 'Apply a small amount again, this time letting the lather run down the strands. Rinse thoroughly.',
        },
        {
          name: 'Skip conditioner on the scalp',
          text: 'Apply conditioner only from mid-lengths to tips. Product build-up at the roots is a leading cause of persistent dandruff.',
        },
        {
          name: 'Air-dry and repeat 3 times a week for 4 weeks',
          text: 'Visible flake reduction usually appears within 2 weeks; the underlying Malassezia rebalance takes ~4 weeks. If the itching does not improve after 6 weeks, consult a trichologist — chronic seborrhoeic dermatitis needs medical attention.',
        },
      ],
    },
  },

  'scalp-care': {
    slug: 'scalp-care',
    displayName: 'Scalp Care',
    title: 'Scalp Care — Herbal Massage, Cleansing & Nourishment | Vyra Herbals',
    description: 'A healthy scalp is where every hair problem starts (or stops). Vyra\'s scalp care system — herbal oil + massager + gentle shampoo — improves blood flow, balances oil, and clears build-up. ISO & GMP certified. Free shipping across India.',
    h1: 'Scalp Care: The Foundation of Healthy Hair',
    quickAnswer:
      'The scalp is skin, and needs the same care as your face. A healthy scalp has balanced oil, active blood flow, no build-up, and a stable microbiome. Vyra\'s scalp care combo (herbal oil + silicone massager + sulphate-free shampoo) covers all four levers in a 15-minute routine 2-3 times a week. Most hair problems improve within a month of consistent scalp care.',
    guide: [
      {
        heading: 'Why scalp health is the root cause of most hair problems',
        body: 'You cannot grow healthy hair from an unhealthy scalp — the follicle sits inside the scalp skin. If the skin is inflamed (dandruff), circulation is poor, pores are blocked (product build-up), or oil is imbalanced, the follicle produces weaker hair. Treating the scalp treats the root cause of hair fall, dandruff, slow growth, and dullness in one move.',
      },
      {
        heading: 'The 15-minute scalp care routine',
        body: 'Warm herbal oil (2-3 tbsp). Apply to scalp only, not strands. Use a silicone scalp massager in small circles for 5-7 minutes, medium pressure. Leave the oil for 30 minutes to overnight. Wash with sulphate-free herbal shampoo, massaging into the scalp for 60 seconds before rinsing. Do this 2-3× a week. That\'s the whole system.',
      },
      {
        heading: 'The role of a scalp massager',
        body: 'A silicone scalp massager does two things fingers can\'t match: (1) even pressure across the whole scalp, and (2) mechanical exfoliation that lifts dead skin and product build-up. Studies (Koyama et al., 2016) show 4 minutes of daily scalp massage measurably increased hair thickness over 24 weeks.',
      },
    ],
    faqs: [
      { question: 'How often should I use a scalp massager?', answer: '2-3 times a week during oiling sessions, 5-7 minutes each. Daily short sessions (4 min in the shower) also work per the 2016 clinical trial. More is not better — over-massage can inflame the scalp.' },
      { question: 'Does scalp massage really increase hair growth?', answer: 'The Koyama 2016 trial found that 4 minutes of daily standardised scalp massage increased hair thickness measurably over 24 weeks in healthy adults. Mechanism: improved blood flow + gene expression changes in scalp fibroblasts.' },
      { question: 'What is scalp exfoliation and do I need it?', answer: 'Scalp exfoliation removes dead skin and product build-up (dry shampoo, gels, serums). Do it 1× a week if you use styling products, once every 2 weeks otherwise. Vyra\'s massager + herbal shampoo is enough — no separate scrub needed.' },
      { question: 'How do I know if my scalp is unhealthy?', answer: 'Signs: persistent itching, flakes, tight/tender feeling, oiliness returning within a day of washing, visible thinning, or hair that comes out easily when combed. Any one of these is worth addressing with a scalp routine before it triggers hair fall.' },
      { question: 'Can I use a scalp massager on wet hair?', answer: 'Yes — silicone massagers are safe on wet or dry hair. Use them during shampooing (in-shower) or on dry hair with oil for a longer session.' },
    ],
    productHandles: ['scalp-massager', 'shampoo-scalp-massager-combo', 'hair-oil-100ml', 'herbal-shampoo-200ml', 'neem-combs-combo-2'],
    keywords: [
      'scalp care',
      'natural scalp care routine',
      'chemical-free scalp treatment',
      'scalp massager for hair growth',
      'scalp exfoliation',
      'healthy scalp routine',
      'herbal scalp treatment',
      'ayurvedic scalp treatment', // retained low priority for long-tail traffic
    ],
    howTo: {
      name: 'How to build a weekly natural herbal scalp care routine',
      description:
        'A weekly scalp routine using Vyra Herbals oil, shampoo, scalp massager, and neem comb — designed to keep the scalp healthy, exfoliated, and free of product build-up.',
      totalTime: 'PT2H30M',
      supply: ['Vyra Herbal Hair Oil', 'Vyra Herbal Shampoo', 'Filtered water'],
      tool: ['Silicone scalp massager', 'Neem wood comb'],
      steps: [
        {
          name: 'Day 1 — Oil + massage',
          text: 'Warm 2 tablespoons of Vyra Herbal Hair Oil. Apply to the scalp in sections and use the silicone scalp massager in slow circles for 8-10 minutes. The massager both spreads oil evenly and mechanically lifts flakes and dead skin.',
        },
        {
          name: 'Day 1 — Wash and comb',
          text: 'After 2 hours (or overnight) wash with Vyra Herbal Shampoo, cool-water rinse, air dry, then detangle with the neem wood comb from the tips upward.',
        },
        {
          name: 'Day 4 — Water-only rinse',
          text: 'Wet the scalp and gently massage with fingertips for 3-4 minutes without shampoo. This lifts sebum build-up without stripping the barrier.',
        },
        {
          name: 'Day 7 — Second oil + shampoo cycle',
          text: 'Repeat Day 1 with slightly less oil (1.5 tablespoons). Focus the massage on any tender or itchy spots.',
        },
        {
          name: 'Daily — Neem-comb detangle',
          text: 'Neem wood is naturally anti-static; it distributes scalp oil down the strands and stops frizz-from-friction. Comb from tips upward to avoid breakage.',
        },
        {
          name: 'Monthly — Hair mask deep clean',
          text: 'Once a month, replace Day 1 with a Vyra herbal hair mask powder (mixed with warm water into a paste, applied to scalp and lengths for 30 minutes, then rinsed). This deep-cleans product residue and restores shine.',
        },
      ],
    },
  },
};

const ALIASES: Record<string, string> = {
  hairfall: 'hair-fall',
  hair_fall: 'hair-fall',
  hairgrowth: 'hair-growth',
  hair_growth: 'hair-growth',
  'anti-dandruff': 'dandruff',
  scalp: 'scalp-care',
};

function resolveConcern(raw: string): ConcernContent | null {
  const key = decodeURIComponent(raw).toLowerCase().replace(/\s+/g, '-');
  return CONCERNS[key] || CONCERNS[ALIASES[key] || ''] || null;
}

export function generateStaticParams(): Params[] {
  return Object.keys(CONCERNS).map((concern) => ({ concern }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { concern } = await params;
  const c = resolveConcern(concern);
  if (!c) {
    return {
      title: 'Hair Concern — Vyra Herbals',
      description: 'Explore herbal hair care solutions by concern at Vyra Herbals.',
      robots: { index: false, follow: true },
    };
  }
  return {
    title: c.title,
    description: c.description,
    keywords: c.keywords,
    alternates: { canonical: `${SITE_URL}/concern/${c.slug}` },
    openGraph: {
      type: 'article',
      url: `${SITE_URL}/concern/${c.slug}`,
      siteName: 'Vyra Herbals',
      title: c.title,
      description: c.description,
    },
    twitter: { card: 'summary_large_image', title: c.title, description: c.description },
  };
}

async function fetchProducts(handles: string[]) {
  if (!handles.length) return [];
  try {
    const supabase = createServerSupabase();
    const { data } = await supabase
      .from('products')
      .select('id, handle, title, price, image_url, category')
      .in('handle', handles)
      .limit(handles.length);
    if (!data) return [];
    const byHandle = new Map(data.map((p: any) => [p.handle, p]));
    return handles.map((h) => byHandle.get(h)).filter(Boolean);
  } catch {
    return [];
  }
}

export default async function ConcernPage({ params }: { params: Promise<Params> }) {
  const { concern } = await params;
  const c = resolveConcern(concern);
  if (!c) notFound();

  const products = (await fetchProducts(c.productHandles)) as any[];

  const jsonLd = [
    breadcrumbJsonLd([
      { name: 'Home', url: '/' },
      { name: 'Hair concerns', url: '/concern' },
      { name: c.displayName, url: `/concern/${c.slug}` },
    ]),
    faqJsonLd(c.faqs),
    products.length
      ? itemListJsonLd(products.map((p) => ({ handle: p.handle, title: p.title, image_url: p.image_url, price: p.price })))
      : null,
    // HowTo — read heavily by ChatGPT / Perplexity / Claude / Gemini when
    // answering "how to ..." queries. This is the highest-ROI GEO signal.
    c.howTo
      ? howToJsonLd({
          name: c.howTo.name,
          description: c.howTo.description,
          totalTime: c.howTo.totalTime,
          supply: c.howTo.supply,
          tool: c.howTo.tool,
          steps: c.howTo.steps,
        })
      : null,
    // Speakable — marks the quick-answer block and h1 as readable by voice
    // assistants (Google Assistant, Alexa, Siri "hey Google, how do I ...").
    speakableJsonLd(['[data-speakable="quick-answer"]', 'h1[data-speakable="h1"]']),
  ].filter(Boolean);

  return (
    <>
      <JsonLd data={jsonLd} />

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px', lineHeight: 1.7, color: '#222' }}>
        <nav aria-label="Breadcrumb" style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
          <Link href="/">Home</Link> › <span>Hair concerns</span> ›{' '}
          <span style={{ color: '#222', fontWeight: 500 }}>{c.displayName}</span>
        </nav>

        <h1 data-speakable="h1" style={{ fontSize: 32, fontWeight: 700, margin: '0 0 12px' }}>{c.h1}</h1>

        <div
          className="quick-answer"
          data-speakable="quick-answer"
          style={{
            padding: 20,
            background: '#fbfaf5',
            borderLeft: '4px solid #d4a373',
            borderRadius: 8,
            margin: '20px 0 32px',
            fontSize: 17,
          }}
        >
          <strong style={{ display: 'block', marginBottom: 8, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, color: '#7d5b26' }}>
            Quick answer
          </strong>
          {c.quickAnswer}
        </div>

        {products.length > 0 && (
          <section style={{ margin: '32px 0' }}>
            <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 16 }}>Recommended for {c.displayName.toLowerCase()}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              {products.slice(0, 4).map((p: any) => (
                <Link
                  key={p.id}
                  href={`/product/${encodeURIComponent(p.handle)}`}
                  style={{
                    display: 'block',
                    border: '1px solid #ececec',
                    borderRadius: 12,
                    padding: 12,
                    textDecoration: 'none',
                    color: '#222',
                    background: '#fff',
                  }}
                >
                  {p.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image_url}
                      alt={`${p.title} — Vyra herbal ${c.displayName.toLowerCase()} solution`}
                      loading="lazy"
                      decoding="async"
                      style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8 }}
                    />
                  )}
                  <div style={{ marginTop: 10, fontWeight: 600, fontSize: 15 }}>{p.title}</div>
                  {p.price != null && <div style={{ marginTop: 4, color: '#7d5b26', fontWeight: 600 }}>₹{p.price}</div>}
                </Link>
              ))}
            </div>
          </section>
        )}

        {c.guide.map((g, i) => (
          <section key={i} style={{ margin: '32px 0' }}>
            <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>{g.heading}</h2>
            <p style={{ fontSize: 16 }}>{g.body}</p>
          </section>
        ))}

        {c.howTo && (
          <section style={{ margin: '40px 0', padding: '24px 20px', background: '#f5f8f3', borderRadius: 12 }}>
            <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>{c.howTo.name}</h2>
            <p style={{ fontSize: 15, color: '#456', marginBottom: 20 }}>{c.howTo.description}</p>

            {(c.howTo.supply?.length || c.howTo.tool?.length) && (
              <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 24, fontSize: 14 }}>
                {c.howTo.supply?.length ? (
                  <div>
                    <strong style={{ display: 'block', marginBottom: 6, color: '#2d7a3a' }}>You&apos;ll need</strong>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {c.howTo.supply.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {c.howTo.tool?.length ? (
                  <div>
                    <strong style={{ display: 'block', marginBottom: 6, color: '#2d7a3a' }}>Tools</strong>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {c.howTo.tool.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}

            <ol style={{ paddingLeft: 22, margin: 0 }}>
              {c.howTo.steps.map((step, i) => (
                <li key={i} style={{ marginBottom: 14 }}>
                  <strong style={{ display: 'block', marginBottom: 4 }}>{step.name}</strong>
                  <span style={{ color: '#333', fontSize: 15 }}>{step.text}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section style={{ margin: '48px 0 32px' }}>
          <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 16 }}>
            Frequently asked questions about {c.displayName.toLowerCase()}
          </h2>
          {c.faqs.map((f, i) => (
            <details key={i} style={{ marginBottom: 12, padding: '12px 16px', border: '1px solid #ececec', borderRadius: 8 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 16 }}>{f.question}</summary>
              <p style={{ marginTop: 10, fontSize: 15, color: '#333' }}>{f.answer}</p>
            </details>
          ))}
        </section>

        <div style={{ marginTop: 48, padding: 20, background: '#f7f7f5', borderRadius: 12, fontSize: 14, color: '#555' }}>
          Every Vyra Herbals product is formulated in an ISO 9001:2015 &amp; GMP certified facility, using plant-based ingredients only. Free shipping and Cash on Delivery available across India. Read the founder&apos;s story on the <Link href="/about">About page</Link> or contact us on WhatsApp.
        </div>
      </main>
    </>
  );
}

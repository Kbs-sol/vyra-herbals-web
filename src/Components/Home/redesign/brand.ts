/**
 * Shared design tokens + copy for the redesigned homepage.
 * Brand rules: 100% natural herbal, Hand-made in India, no emojis (SVG icons only).
 */
export const BRAND = {
  forest: "#1B3B2B",
  forestDeep: "#142B20",
  sage: "#7A9A83",
  sageSoft: "#E6EEE8",
  linen: "#FAF7F2",
  white: "#FFFFFF",
  charcoal: "#1F2421",
  muted: "#5B655F",
  line: "rgba(27, 59, 43, 0.14)",
  radius: "14px",
  heading: "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif",
  body: "var(--font-opensans), 'Open Sans', system-ui, sans-serif",
} as const;

export const BREAKPOINTS = {
  tablet: "992px",
  mobile: "768px",
} as const;

export const formatINR = (n: number): string =>
  "\u20B9" + Math.round(Number(n) || 0).toLocaleString("en-IN");

export type ConcernKey = "hair-fall" | "thinning" | "dandruff" | "dry-frizzy";

export interface RoutineStepCopy {
  title: string;
  when: string;
  detail: string;
}

export interface ConcernDef {
  key: ConcernKey;
  tab: string;
  icon: "TrendingDown" | "Zap" | "Shield" | "Droplet";
  rootCause: string;
  howHerbsWork: string;
  expectation: string;
  /** Catalogue product ids, in display order. All pre-checked. */
  productIds: number[];
  /** Short reason each product is in the routine, keyed by product id. */
  why: Record<number, string>;
}

export const CONCERNS: ConcernDef[] = [
  {
    key: "hair-fall",
    tab: "Severe Hair Fall & Breakage",
    icon: "TrendingDown",
    rootCause:
      "Hair fall and breakage usually start at the root: a tired scalp, weak anchoring and strands that snap from dryness and rough handling.",
    howHerbsWork:
      "Cold-infused whole herbs in virgin botanical oils nourish the scalp and strengthen strands from the roots, while a gentle sulfate-free wash cleans without stripping. A neem wood comb detangles from the ends upward to cut mechanical breakage.",
    expectation:
      "Hair care is a habit, not a quick fix. With consistent use, most people notice stronger roots and a calmer scalp in about 2 to 3 months.",
    productIds: [2, 4, 7],
    why: {
      2: "Weekly warm-oil root massage",
      4: "Gentle sulfate-free cleanse",
      7: "Low-snag detangling",
    },
  },
  {
    key: "thinning",
    tab: "Thinning & Slow Hair Growth",
    icon: "Zap",
    rootCause:
      "Thinning and slow growth are often linked to an under-stimulated scalp, build-up around the roots and hair that never gets a consistent nourishing routine.",
    howHerbsWork:
      "Warm herbal oil massage encourages circulation to the scalp and feeds the roots, a clean scalp lets that nourishment work, and a scalp massager makes the ritual deeper and easier to stick with.",
    expectation:
      "Growth is slow by nature. Stay consistent for 2 to 3 months and look for visible root strength and a healthier-feeling scalp.",
    productIds: [2, 4, 8],
    why: {
      2: "Root-nourishing herbal oil",
      4: "Clears build-up, keeps scalp clean",
      8: "Deeper, more even massage",
    },
  },
  {
    key: "dandruff",
    tab: "Dandruff & Flaky Scalp",
    icon: "Shield",
    rootCause:
      "Flakes tend to come from an unbalanced scalp: too much oil and residue in some places, dryness and irritation in others.",
    howHerbsWork:
      "A sulfate-free herbal shampoo cleanses build-up without harsh stripping, and a light herbal oil massage before wash keeps the scalp comfortable. A neem wood comb helps distribute natural oils evenly.",
    expectation:
      "Scalp comfort builds with regular use. Most people feel a calmer, cleaner scalp within 2 to 3 months of a consistent routine.",
    productIds: [4, 1, 7],
    why: {
      4: "Sulfate-free scalp cleanse",
      1: "Light pre-wash herbal oil",
      7: "Spreads natural oils evenly",
    },
  },
  {
    key: "dry-frizzy",
    tab: "Dry, Rough & Frizzy Hair",
    icon: "Droplet",
    rootCause:
      "Dry, frizzy hair has lost moisture along the length: harsh cleansers, heat and friction lift the outer layer and leave strands rough.",
    howHerbsWork:
      "Virgin botanical oils seal in moisture before wash, a sulfate-free shampoo cleans without over-stripping, and a herbal hair mask powder blend adds a conditioning treatment you mix fresh.",
    expectation:
      "Softness shows up early, lasting smoothness takes longer. Stay consistent for 2 to 3 months for hair that feels stronger and easier to manage.",
    productIds: [2, 4, 9],
    why: {
      2: "Seals in moisture before wash",
      4: "Cleanses without over-stripping",
      9: "Fresh-mixed conditioning mask",
    },
  },
];

export const ROUTINE_STEPS: RoutineStepCopy[] = [
  {
    title: "Night Before Wash",
    when: "2x weekly",
    detail:
      "Warm the oil slightly and massage into the scalp for 5 to 7 minutes. Leave it on overnight.",
  },
  {
    title: "Morning of Wash",
    when: "Wash day",
    detail:
      "Wet hair thoroughly and massage a lukewarm-water lather of herbal shampoo into the scalp. Rinse well.",
  },
  {
    title: "Daily",
    when: "Every day",
    detail:
      "Detangle gently with the neem wood comb, starting from the ends and working upward to the roots.",
  },
];

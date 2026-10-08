import type { Messages } from "@/lib/i18n";

/** A task scores while it has a completion time: undoing takes the points back, deleting a done task keeps them. */
export const POINTS_PER_TASK = 10;
export const POINTS_PER_STAR = 50;

type Tier = { divisions: number; stars: number; color: string };

/** Lowest first, in the order of `rank.tiers` in the messages. Each division needs `stars` stars; reaching the last star moves up to the next division with zero. */
const TIERS: Tier[] = [
  { divisions: 3, stars: 3, color: "#b45309" },
  { divisions: 3, stars: 3, color: "#64748b" },
  { divisions: 4, stars: 4, color: "#d97706" },
  { divisions: 4, stars: 4, color: "#0d9488" },
  { divisions: 5, stars: 5, color: "#4f46e5" },
  { divisions: 5, stars: 5, color: "#9333ea" },
];

/** Stars inside King where each title in `rank.kings` starts; the last one is open-ended. */
const KING_FROM = [0, 10, 20, 30, 40, 50, 100];
const KING_COLOR = "#dc2626";
const ROMAN = ["I", "II", "III", "IV", "V"];

export type Rank = {
  name: string;
  color: string;
  isKing: boolean;
  /** Stars inside the current division, or King stars. */
  stars: number;
  /** Stars needed to clear the division; null in King. */
  maxStars: number | null;
  /** 0–1 through the current division, or towards the next King title. */
  progress: number;
  points: number;
  totalStars: number;
  pointsToNextStar: number;
  /** Next division or King title, null at the top. */
  next: string | null;
};

export function getRank(points: number, names: Messages["rank"]): Rank {
  const totalStars = Math.floor(points / POINTS_PER_STAR);
  const leftover = points % POINTS_PER_STAR;
  const starFraction = leftover / POINTS_PER_STAR;
  const base = { points, totalStars, pointsToNextStar: POINTS_PER_STAR - leftover };

  const ladder = TIERS.flatMap((tier, tierIndex) =>
    Array.from({ length: tier.divisions }, (_, i) => ({
      name: `${names.tiers[tierIndex]} ${ROMAN[tier.divisions - 1 - i]}`,
      color: tier.color,
      stars: tier.stars,
    })),
  );

  let remaining = totalStars;
  for (const [index, division] of ladder.entries()) {
    if (remaining < division.stars) {
      return {
        ...base,
        name: division.name,
        color: division.color,
        isKing: false,
        stars: remaining,
        maxStars: division.stars,
        progress: (remaining + starFraction) / division.stars,
        next: ladder[index + 1]?.name ?? names.kings[0],
      };
    }
    remaining -= division.stars;
  }

  const titleIndex = KING_FROM.findLastIndex((from) => remaining >= from);
  const from = KING_FROM[titleIndex];
  const nextFrom = KING_FROM[titleIndex + 1];
  return {
    ...base,
    name: names.kings[titleIndex],
    color: KING_COLOR,
    isKing: true,
    stars: remaining,
    maxStars: null,
    progress: nextFrom === undefined ? starFraction : (remaining - from + starFraction) / (nextFrom - from),
    next: names.kings[titleIndex + 1] ?? null,
  };
}

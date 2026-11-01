export interface LanguageStat {
  /** Programming language name as reported by GitHub Linguist */
  name: string;
  /** Hex color code associated with the language on GitHub (e.g. #3178c6) */
  color: string;
  /** Total byte size aggregated across owned non-fork repositories */
  size: number;
  /** Normalized percentage among the Top 8 languages (0 - 100, 1 decimal place) */
  percentage: number;
}

export interface YearlyContribution {
  year: number;
  publicCommits: number;
  privateCommits: number;
  totalCommits: number;
  prs: number;
  reviews: number;
  issues: number;
}

export interface GitHubStats {
  username: string;
  displayName: string;
  allTimePublicCommits: number;
  allTimePrivateCommits: number;
  totalCommits: number;
  currentYearCommits: number;
  currentYear: number;
  activeYears: number[];
  yearlyBreakdown: YearlyContribution[];
  totalPRs: number;
  totalReviews: number;
  totalIssues: number;
  totalRepos: number;
  publicRepos: number;
  privateRepos: number;
  totalStars: number;
  followers: number;
  topLanguages: LanguageStat[];
  updatedAt: string;
  isMock: boolean;
}

export type RankLevel = "S" | "A+" | "A" | "A-" | "B+" | "B" | "C+" | "C";

export interface MetricScoreDetail {
  raw: number;
  median: number;
  weight: number;
  unitScore: number;
  weightedScore: number;
}

export interface RankBreakdown {
  commits: MetricScoreDetail;
  prs: MetricScoreDetail;
  reviews: MetricScoreDetail;
  issues: MetricScoreDetail;
  stars: MetricScoreDetail;
  followers: MetricScoreDetail;
}

export interface RankResult {
  /** Computed tier rank: S, A+, A, A-, B+, B, C+, or C */
  level: RankLevel;
  /** Top X% percentile: Number(((1 - normalizedScore) * 100).toFixed(1)) */
  percentile: number;
  /** Normalized weighted score in [0, 1] */
  normalizedScore: number;
  /** Sum of weighted scores out of totalWeight (12) */
  weightedSum: number;
  /** Total weight denominator (12) */
  totalWeight: number;
  /** Primary accent hex color corresponding to the rank tier */
  color: string;
  /** Descriptive tier badge label */
  tierName: string;
  /** Per-metric score contribution details */
  breakdown: RankBreakdown;
}

/**
 * Escapes special XML/SVG characters to guarantee 100% valid XML output.
 */
export function escapeXml(value: string | number): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Formats integer numbers with thousand separators (e.g. 1842 -> "1,842").
 */
export function formatNumber(num: number): string {
  return Math.round(num).toLocaleString("en-US");
}

/**
 * Clamps a numeric value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

import {
  clamp,
  type GitHubStats,
  type MetricScoreDetail,
  type RankLevel,
  type RankResult,
} from "./types.js";

/**
 * Exponential cumulative distribution function:
 * Rapidly rewards consistent commit, PR, review, and issue volume.
 */
export function expCDF(x: number): number {
  if (x <= 0) return 0;
  return 1 - Math.pow(2, -x);
}

/**
 * Heavy-tailed log-normal approximation CDF:
 * Prevents stars/followers outliers from dominating engineering activity.
 */
export function logNormalCDF(x: number): number {
  if (x <= 0) return 0;
  return x / (1 + x);
}

const RANK_CONFIG = {
  COMMITS: { WEIGHT: 6, MEDIAN: 300 },
  PRS: { WEIGHT: 2, MEDIAN: 25 },
  REVIEWS: { WEIGHT: 1, MEDIAN: 5 },
  ISSUES: { WEIGHT: 1, MEDIAN: 10 },
  STARS: { WEIGHT: 1, MEDIAN: 15 },
  FOLLOWERS: { WEIGHT: 1, MEDIAN: 10 },
} as const;

const TOTAL_WEIGHT =
  RANK_CONFIG.COMMITS.WEIGHT +
  RANK_CONFIG.PRS.WEIGHT +
  RANK_CONFIG.REVIEWS.WEIGHT +
  RANK_CONFIG.ISSUES.WEIGHT +
  RANK_CONFIG.STARS.WEIGHT +
  RANK_CONFIG.FOLLOWERS.WEIGHT; // 12

interface RankTierRule {
  maxPercentile: number;
  level: RankLevel;
  color: string;
  tierName: string;
}

const RANK_TIERS: readonly RankTierRule[] = [
  { maxPercentile: 5, level: "S", color: "#ff75a0", tierName: "Apex Commit Master" },
  { maxPercentile: 15, level: "A+", color: "#e0af68", tierName: "Elite Engineer" },
  { maxPercentile: 30, level: "A", color: "#38bdae", tierName: "Core Architect" },
  { maxPercentile: 45, level: "A-", color: "#7aa2f7", tierName: "High-Output Builder" },
  { maxPercentile: 60, level: "B+", color: "#bb9af7", tierName: "Active Contributor" },
  { maxPercentile: 75, level: "B", color: "#9ece6a", tierName: "Solid Developer" },
  { maxPercentile: 88, level: "C+", color: "#ff9e64", tierName: "Rising Coder" },
  { maxPercentile: Infinity, level: "C", color: "#a9b1d6", tierName: "Starter" },
];

function buildMetricDetail(
  raw: number,
  median: number,
  weight: number,
  cdfFn: (x: number) => number,
): MetricScoreDetail {
  const safeRaw = Math.max(0, raw);
  const unitScore = clamp(cdfFn(safeRaw / median), 0, 1);
  return {
    raw: safeRaw,
    median,
    weight,
    unitScore,
    weightedScore: unitScore * weight,
  };
}

/**
 * Calculates Commit-Prioritized Developer Rank (50% total weight dedicated to Public + Private Commits).
 */
export function calculateRank(
  stats: Pick<
    GitHubStats,
    | "totalCommits"
    | "totalPRs"
    | "totalReviews"
    | "totalIssues"
    | "totalStars"
    | "followers"
  >,
): RankResult {
  const commits = buildMetricDetail(
    stats.totalCommits,
    RANK_CONFIG.COMMITS.MEDIAN,
    RANK_CONFIG.COMMITS.WEIGHT,
    expCDF,
  );
  const prs = buildMetricDetail(
    stats.totalPRs,
    RANK_CONFIG.PRS.MEDIAN,
    RANK_CONFIG.PRS.WEIGHT,
    expCDF,
  );
  const reviews = buildMetricDetail(
    stats.totalReviews,
    RANK_CONFIG.REVIEWS.MEDIAN,
    RANK_CONFIG.REVIEWS.WEIGHT,
    expCDF,
  );
  const issues = buildMetricDetail(
    stats.totalIssues,
    RANK_CONFIG.ISSUES.MEDIAN,
    RANK_CONFIG.ISSUES.WEIGHT,
    expCDF,
  );
  const stars = buildMetricDetail(
    stats.totalStars,
    RANK_CONFIG.STARS.MEDIAN,
    RANK_CONFIG.STARS.WEIGHT,
    logNormalCDF,
  );
  const followers = buildMetricDetail(
    stats.followers,
    RANK_CONFIG.FOLLOWERS.MEDIAN,
    RANK_CONFIG.FOLLOWERS.WEIGHT,
    logNormalCDF,
  );

  const weightedSum =
    commits.weightedScore +
    prs.weightedScore +
    reviews.weightedScore +
    issues.weightedScore +
    stars.weightedScore +
    followers.weightedScore;

  const normalizedScore = clamp(weightedSum / TOTAL_WEIGHT, 0, 1);
  const percentile = Number(((1 - normalizedScore) * 100).toFixed(1));

  const matchedTier =
    RANK_TIERS.find((tier) => percentile <= tier.maxPercentile) ??
    RANK_TIERS[RANK_TIERS.length - 1];

  return {
    level: matchedTier.level,
    percentile,
    normalizedScore,
    weightedSum,
    totalWeight: TOTAL_WEIGHT,
    color: matchedTier.color,
    tierName: matchedTier.tierName,
    breakdown: {
      commits,
      prs,
      reviews,
      issues,
      stars,
      followers,
    },
  };
}

import {
  clamp,
  escapeXml,
  formatNumber,
  type GitHubStats,
  type RankResult,
} from "./types.js";

function renderIcon(kind: string, color: string): string {
  const c = escapeXml(color);
  switch (kind) {
    case "commits":
      return `<circle cx="8" cy="8" r="3.5" stroke="${c}" stroke-width="1.7" fill="none" /><line x1="0.5" y1="8" x2="4.5" y2="8" stroke="${c}" stroke-width="1.7" stroke-linecap="round" /><line x1="11.5" y1="8" x2="15.5" y2="8" stroke="${c}" stroke-width="1.7" stroke-linecap="round" />`;
    case "year":
      return `<rect x="1.5" y="2.5" width="13" height="12" rx="2.2" stroke="${c}" stroke-width="1.5" fill="none" /><line x1="1.5" y1="6.2" x2="14.5" y2="6.2" stroke="${c}" stroke-width="1.4" /><line x1="5" y1="1" x2="5" y2="3.8" stroke="${c}" stroke-width="1.5" stroke-linecap="round" /><line x1="11" y1="1" x2="11" y2="3.8" stroke="${c}" stroke-width="1.5" stroke-linecap="round" />`;
    case "prs":
      return `<circle cx="4" cy="3.8" r="2" stroke="${c}" stroke-width="1.5" fill="none" /><circle cx="4" cy="12.2" r="2" stroke="${c}" stroke-width="1.5" fill="none" /><circle cx="12" cy="12.2" r="2" stroke="${c}" stroke-width="1.5" fill="none" /><line x1="4" y1="5.8" x2="4" y2="10.2" stroke="${c}" stroke-width="1.5" /><path d="M12 10.2V6.5C12 5 11 4 9.5 4H7.5" stroke="${c}" stroke-width="1.5" fill="none" stroke-linecap="round" />`;
    case "reviews":
      return `<path d="M2 3.2C2 2.5 2.5 2 3.2 2H12.8C13.5 2 14 2.5 14 3.2V10.2C14 10.9 13.5 11.4 12.8 11.4H6.2L3 14V11.4H3.2C2.5 11.4 2 10.9 2 10.2V3.2Z" stroke="${c}" stroke-width="1.5" fill="none" stroke-linejoin="round" /><path d="M5.6 6.8L7.3 8.5L10.6 5.2" stroke="${c}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" />`;
    case "stars":
      return `<path d="M8 1.5L9.95 5.45L14.3 6.08L11.15 9.15L11.89 13.48L8 11.43L4.11 13.48L4.85 9.15L1.7 6.08L6.05 5.45L8 1.5Z" stroke="${c}" stroke-width="1.45" fill="none" stroke-linejoin="round" />`;
    case "repos":
    default:
      return `<rect x="2.2" y="1.8" width="11.6" height="12.4" rx="2" stroke="${c}" stroke-width="1.5" fill="none" /><line x1="5.2" y1="1.8" x2="5.2" y2="14.2" stroke="${c}" stroke-width="1.3" /><line x1="7.5" y1="5.2" x2="11.5" y2="5.2" stroke="${c}" stroke-width="1.4" stroke-linecap="round" />`;
  }
}

/**
 * Renders the standalone GitHub Stats & Dynamic Rank SVG card (generated/stats.svg).
 */
export function renderStatsCard(stats: GitHubStats, rank: RankResult): string {
  const ringRadius = 52;
  const circumference = 2 * Math.PI * ringRadius;
  const dashOffset = circumference * (1 - clamp(rank.normalizedScore, 0, 1));

  const totalCommitsSafe = Math.max(stats.totalCommits, 1);
  const privatePct =
    stats.totalCommits > 0
      ? Number(((stats.allTimePrivateCommits / totalCommitsSafe) * 100).toFixed(1))
      : 0;
  const publicPct =
    stats.totalCommits > 0 ? Number((100 - privatePct).toFixed(1)) : 0;

  const barWidth = 427;
  const privateW =
    stats.totalCommits > 0
      ? (stats.allTimePrivateCommits / totalCommitsSafe) * barWidth
      : 0;
  const publicW = Math.max(0, barWidth - privateW);

  const items = [
    {
      icon: "commits",
      color: "#ff75a0",
      label: "Total Commits",
      sub: "(Pub + Priv)",
      value: formatNumber(stats.totalCommits),
    },
    {
      icon: "year",
      color: "#7dcfff",
      label: "Commits This Year",
      sub: `(${stats.currentYear})`,
      value: formatNumber(stats.currentYearCommits),
    },
    {
      icon: "prs",
      color: "#bb9af7",
      label: "Pull Requests",
      sub: "",
      value: formatNumber(stats.totalPRs),
    },
    {
      icon: "reviews",
      color: "#38bdae",
      label: "Reviews & Issues",
      sub: "",
      value: `${formatNumber(stats.totalReviews)} / ${formatNumber(stats.totalIssues)}`,
    },
    {
      icon: "stars",
      color: "#e0af68",
      label: "Stars Earned",
      sub: "",
      value: formatNumber(stats.totalStars),
    },
    {
      icon: "repos",
      color: "#9ece6a",
      label: "Total Repositories",
      sub: "(All)",
      value: formatNumber(stats.totalRepos),
    },
  ];

  const rowsMarkup = items
    .map((item, idx) => {
      const y = 84 + idx * 31;
      const delay = (0.08 + idx * 0.07).toFixed(2);
      const subSpan = item.sub
        ? `<tspan dx="5" fill="#6b749e" font-size="10">${escapeXml(item.sub)}</tspan>`
        : "";
      return `
    <g class="fade-row" style="animation-delay: ${delay}s">
      <g transform="translate(24, ${y - 12})">${renderIcon(item.icon, item.color)}</g>
      <text x="47" y="${y}" fill="#c8d3f5" font-size="12.2" font-weight="600">${escapeXml(item.label)}${subSpan}</text>
      <text x="312" y="${y}" text-anchor="end" fill="#ffffff" font-size="13.2" font-weight="700" class="mono">${escapeXml(item.value)}</text>
    </g>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="495" height="340" viewBox="0 0 495 340" fill="none" role="img" aria-labelledby="statsCardTitle statsCardDesc">
  <title id="statsCardTitle">${escapeXml(stats.displayName)} (@${escapeXml(stats.username)}) — GitHub Stats &amp; Rank</title>
  <desc id="statsCardDesc">Total Commits: ${escapeXml(formatNumber(stats.totalCommits))} (Public + Private), Rank: ${escapeXml(rank.level)} (Top ${rank.percentile.toFixed(1)}%).</desc>

  <defs>
    <clipPath id="statsOuterClip">
      <rect x="0" y="0" width="495" height="340" rx="16" />
    </clipPath>
    <clipPath id="statsCommitBarClip">
      <rect x="34" y="299" width="${barWidth}" height="9" rx="4.5" />
    </clipPath>
    <linearGradient id="statsBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090a10" />
      <stop offset="55%" stop-color="#121526" />
      <stop offset="100%" stop-color="#1a1b2f" />
    </linearGradient>
    <linearGradient id="privGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#bb9af7" />
      <stop offset="100%" stop-color="#7aa2f7" />
    </linearGradient>
    <linearGradient id="pubGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38bdae" />
      <stop offset="100%" stop-color="#7dcfff" />
    </linearGradient>
    <pattern id="statsGrid" width="32" height="32" patternUnits="userSpaceOnUse">
      <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(122, 162, 247, 0.06)" stroke-width="1" />
    </pattern>
    <filter id="statsBlur" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="45" />
    </filter>
  </defs>

  <style>
    .sans {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    .mono {
      font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    @keyframes fadeInRow {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes ringSweep {
      from { stroke-dashoffset: ${circumference.toFixed(2)}; }
      to { stroke-dashoffset: ${dashOffset.toFixed(2)}; }
    }
    .fade-row {
      animation: fadeInRow 0.5s ease-out backwards;
    }
    .ring-arc {
      stroke-dasharray: ${circumference.toFixed(2)};
      stroke-dashoffset: ${dashOffset.toFixed(2)};
      animation: ringSweep 1.25s cubic-bezier(0.22, 1, 0.36, 1) backwards;
      filter: drop-shadow(0 0 6px ${escapeXml(rank.color)});
    }
    @media (prefers-reduced-motion: reduce) {
      .fade-row, .ring-arc { animation: none !important; }
    }
  </style>

  <g clip-path="url(#statsOuterClip)">
    <rect width="495" height="340" rx="16" fill="url(#statsBg)" />
    <rect width="495" height="340" rx="16" fill="url(#statsGrid)" />
    <circle cx="80" cy="45" r="95" fill="#7aa2f7" opacity="0.20" filter="url(#statsBlur)" />
    <circle cx="430" cy="295" r="105" fill="#bb9af7" opacity="0.18" filter="url(#statsBlur)" />
  </g>
  <rect x="0.75" y="0.75" width="493.5" height="338.5" rx="15.25" fill="none" stroke="rgba(122, 162, 247, 0.25)" stroke-width="1.5" />

  <g class="sans">
    <text x="24" y="34" fill="#7aa2f7" font-size="13" font-weight="800" letter-spacing="0.8">⚡ ${escapeXml(stats.displayName.toUpperCase())} • GITHUB STATS</text>
    <text x="471" y="34" text-anchor="end" fill="#6b749e" font-size="10.5" class="mono">@${escapeXml(stats.username)}</text>
    <line x1="24" y1="48" x2="471" y2="48" stroke="rgba(122, 162, 247, 0.15)" stroke-width="1" />

    ${rowsMarkup}

    <line x1="328" y1="64" x2="328" y2="252" stroke="rgba(122, 162, 247, 0.12)" stroke-width="1" stroke-dasharray="3 4" />

    <!-- Rank Ring -->
    <g>
      <circle cx="408" cy="142" r="${ringRadius}" stroke="rgba(169, 177, 214, 0.11)" stroke-width="8" fill="none" />
      <circle
        class="ring-arc"
        cx="408"
        cy="142"
        r="${ringRadius}"
        stroke="${escapeXml(rank.color)}"
        stroke-width="8"
        stroke-linecap="round"
        fill="none"
        transform="rotate(-90 408 142)"
      />
      <text x="408" y="153" text-anchor="middle" fill="${escapeXml(rank.color)}" font-size="34" font-weight="800">${escapeXml(rank.level)}</text>
      <text x="408" y="172" text-anchor="middle" fill="#dbe2ff" font-size="11" font-weight="700" class="mono">Top ${rank.percentile.toFixed(1)}%</text>

      <rect x="342" y="210" width="132" height="22" rx="11" fill="rgba(122, 162, 247, 0.09)" stroke="rgba(122, 162, 247, 0.22)" stroke-width="1" />
      <text x="408" y="224.5" text-anchor="middle" fill="#c8d3f5" font-size="9.5" font-weight="600" class="mono">Score: ${rank.weightedSum.toFixed(1)} / 12.0</text>
      <text x="408" y="247" text-anchor="middle" fill="${escapeXml(rank.color)}" font-size="10" font-weight="600">${escapeXml(rank.tierName)}</text>
    </g>

    <!-- Private vs Public Commit Bar -->
    <rect x="22" y="266" width="451" height="54" rx="10" fill="rgba(14, 16, 28, 0.65)" stroke="rgba(122, 162, 247, 0.16)" stroke-width="1" />
    <text x="34" y="287" fill="#bb9af7" font-size="10.8" font-weight="700">🔒 Private: ${escapeXml(formatNumber(stats.allTimePrivateCommits))} (${privatePct.toFixed(1)}%)</text>
    <text x="461" y="287" text-anchor="end" fill="#38bdae" font-size="10.8" font-weight="700">🌐 Public: ${escapeXml(formatNumber(stats.allTimePublicCommits))} (${publicPct.toFixed(1)}%)</text>
    <g clip-path="url(#statsCommitBarClip)">
      <rect x="34" y="299" width="${barWidth}" height="9" fill="rgba(255, 255, 255, 0.06)" />
      <rect x="34" y="299" width="${privateW.toFixed(2)}" height="9" fill="url(#privGrad)" />
      <rect x="${(34 + privateW).toFixed(2)}" y="299" width="${publicW.toFixed(2)}" height="9" fill="url(#pubGrad)" />
    </g>
  </g>
</svg>
`;
}

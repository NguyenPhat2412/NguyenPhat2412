import {
  clamp,
  escapeXml,
  type GitHubStats,
  type LanguageStat,
} from "./types.js";

function truncateLang(name: string, maxLen = 16): string {
  if (name.length <= maxLen) return name;
  return `${name.slice(0, maxLen - 1)}…`;
}

function renderStackedBar(
  languages: LanguageStat[],
  x: number,
  y: number,
  width: number,
  height: number,
): string {
  if (languages.length === 0) {
    return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${height / 2}" fill="rgba(169, 177, 214, 0.14)" />`;
  }

  let cursorX = x;
  const rects = languages.map((lang, idx) => {
    const isLast = idx === languages.length - 1;
    const rawW = (lang.percentage / 100) * width;
    const w = isLast ? Math.max(0, x + width - cursorX) : Math.max(0, rawW);
    const startX = cursorX;
    cursorX += w;
    return `<rect x="${startX.toFixed(2)}" y="${y}" width="${w.toFixed(2)}" height="${height}" fill="${escapeXml(lang.color)}" />`;
  });

  return `
    <g clip-path="url(#langsCardStackClip)">
      <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="rgba(255, 255, 255, 0.06)" />
      ${rects.join("\n      ")}
    </g>`;
}

/**
 * Renders the standalone Top 8 Languages SVG card (generated/top-langs.svg).
 */
export function renderLangsCard(stats: GitHubStats): string {
  const topLangs = stats.topLanguages.slice(0, 8);
  const barX = 24;
  const barW = 372;

  const listMarkup =
    topLangs.length === 0
      ? `<text x="210" y="190" text-anchor="middle" fill="#787c99" font-size="12.5">No language data available</text>`
      : topLangs
          .map((lang, idx) => {
            const rowY = 104 + idx * 26.5;
            const miniX = 172;
            const miniMaxW = 162;
            const miniW = clamp(
              (lang.percentage / 100) * miniMaxW,
              3.5,
              miniMaxW,
            );
            const delay = (0.04 + idx * 0.035).toFixed(2);

            return `
    <g class="fade-row" style="animation-delay: ${delay}s">
      <circle cx="30" cy="${(rowY - 4).toFixed(1)}" r="4.4" fill="${escapeXml(lang.color)}" stroke="rgba(255, 255, 255, 0.18)" stroke-width="0.6" />
      <text x="43" y="${rowY.toFixed(1)}" fill="#e2e8ff" font-size="12" font-weight="600">${escapeXml(truncateLang(lang.name, 16))}</text>
      <rect x="${miniX}" y="${(rowY - 8).toFixed(1)}" width="${miniMaxW}" height="6.8" rx="3.4" fill="rgba(169, 177, 214, 0.10)" />
      <rect x="${miniX}" y="${(rowY - 8).toFixed(1)}" width="${miniW.toFixed(2)}" height="6.8" rx="3.4" fill="${escapeXml(lang.color)}" />
      <text x="396" y="${rowY.toFixed(1)}" text-anchor="end" fill="#c0caf5" font-size="11.5" font-weight="700" class="mono">${lang.percentage.toFixed(1)}%</text>
    </g>`;
          })
          .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="340" viewBox="0 0 420 340" fill="none" role="img" aria-labelledby="langsCardTitle langsCardDesc">
  <title id="langsCardTitle">${escapeXml(stats.displayName)} (@${escapeXml(stats.username)}) — Top Languages</title>
  <desc id="langsCardDesc">Top ${topLangs.length} most used programming languages across Public and Private repositories.</desc>

  <defs>
    <clipPath id="langsOuterClip">
      <rect x="0" y="0" width="420" height="340" rx="16" />
    </clipPath>
    <clipPath id="langsCardStackClip">
      <rect x="${barX}" y="62" width="${barW}" height="12" rx="6" />
    </clipPath>
    <linearGradient id="langsBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090a10" />
      <stop offset="55%" stop-color="#121526" />
      <stop offset="100%" stop-color="#1a1b2f" />
    </linearGradient>
    <pattern id="langsGrid" width="32" height="32" patternUnits="userSpaceOnUse">
      <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(122, 162, 247, 0.06)" stroke-width="1" />
    </pattern>
    <filter id="langsBlur" x="-50%" y="-50%" width="200%" height="200%">
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
    .fade-row {
      animation: fadeInRow 0.5s ease-out backwards;
    }
    @media (prefers-reduced-motion: reduce) {
      .fade-row { animation: none !important; }
    }
  </style>

  <g clip-path="url(#langsOuterClip)">
    <rect width="420" height="340" rx="16" fill="url(#langsBg)" />
    <rect width="420" height="340" rx="16" fill="url(#langsGrid)" />
    <circle cx="350" cy="55" r="95" fill="#bb9af7" opacity="0.20" filter="url(#langsBlur)" />
    <circle cx="70" cy="295" r="95" fill="#7aa2f7" opacity="0.18" filter="url(#langsBlur)" />
  </g>
  <rect x="0.75" y="0.75" width="418.5" height="338.5" rx="15.25" fill="none" stroke="rgba(187, 154, 247, 0.25)" stroke-width="1.5" />

  <g class="sans">
    <text x="24" y="34" fill="#bb9af7" font-size="13" font-weight="800" letter-spacing="0.8">💻 MOST USED LANGUAGES (ALL REPOS)</text>
    <line x1="24" y1="48" x2="396" y2="48" stroke="rgba(187, 154, 247, 0.16)" stroke-width="1" />

    ${renderStackedBar(topLangs, barX, 62, barW, 12)}

    ${listMarkup}

    <line x1="24" y1="305" x2="396" y2="305" stroke="rgba(122, 162, 247, 0.12)" stroke-width="1" />
    <text x="24" y="323" fill="#6b749e" font-size="10">Public + Private Owned Non-Fork Repos</text>
    <text x="396" y="323" text-anchor="end" fill="#8590b8" font-size="10" class="mono">@${escapeXml(stats.username)}</text>
  </g>
</svg>
`;
}

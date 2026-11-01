import {
  clamp,
  escapeXml,
  formatNumber,
  type GitHubStats,
  type LanguageStat,
  type RankResult,
} from "./types.js";

interface StarParticle {
  cx: number;
  cy: number;
  r: number;
  color: string;
  delay: string;
  duration: string;
}

const STAR_PARTICLES: readonly StarParticle[] = [
  { cx: 52, cy: 18, r: 1.3, color: "#ffffff", delay: "0.0s", duration: "2.8s" },
  { cx: 168, cy: 14, r: 1.6, color: "#7aa2f7", delay: "0.6s", duration: "3.2s" },
  { cx: 312, cy: 19, r: 1.1, color: "#bb9af7", delay: "1.3s", duration: "2.9s" },
  { cx: 486, cy: 12, r: 1.5, color: "#ffffff", delay: "2.1s", duration: "3.4s" },
  { cx: 642, cy: 17, r: 1.2, color: "#7dcfff", delay: "0.4s", duration: "3.0s" },
  { cx: 794, cy: 15, r: 1.7, color: "#bb9af7", delay: "1.7s", duration: "3.1s" },
  { cx: 928, cy: 20, r: 1.3, color: "#ffffff", delay: "0.9s", duration: "2.7s" },
  { cx: 14, cy: 88, r: 1.4, color: "#7aa2f7", delay: "1.5s", duration: "3.3s" },
  { cx: 946, cy: 96, r: 1.5, color: "#7dcfff", delay: "0.2s", duration: "3.0s" },
  { cx: 18, cy: 198, r: 1.2, color: "#ffffff", delay: "2.4s", duration: "2.9s" },
  { cx: 527, cy: 137, r: 1.5, color: "#7aa2f7", delay: "1.1s", duration: "3.2s" },
  { cx: 944, cy: 218, r: 1.3, color: "#bb9af7", delay: "1.9s", duration: "2.8s" },
  { cx: 15, cy: 316, r: 1.6, color: "#bb9af7", delay: "0.7s", duration: "3.4s" },
  { cx: 527, cy: 294, r: 1.2, color: "#ffffff", delay: "2.2s", duration: "3.0s" },
  { cx: 947, cy: 342, r: 1.4, color: "#7aa2f7", delay: "0.5s", duration: "3.1s" },
  { cx: 19, cy: 438, r: 1.3, color: "#7dcfff", delay: "1.6s", duration: "2.9s" },
  { cx: 527, cy: 446, r: 1.4, color: "#bb9af7", delay: "0.3s", duration: "3.3s" },
  { cx: 943, cy: 468, r: 1.6, color: "#ffffff", delay: "2.5s", duration: "3.0s" },
  { cx: 96, cy: 527, r: 1.3, color: "#7aa2f7", delay: "1.2s", duration: "2.8s" },
  { cx: 284, cy: 529, r: 1.5, color: "#ffffff", delay: "0.8s", duration: "3.2s" },
  { cx: 478, cy: 526, r: 1.2, color: "#7dcfff", delay: "2.0s", duration: "3.1s" },
  { cx: 692, cy: 528, r: 1.6, color: "#bb9af7", delay: "1.4s", duration: "2.9s" },
  { cx: 876, cy: 525, r: 1.3, color: "#ffffff", delay: "0.1s", duration: "3.3s" },
];

interface TechBadge {
  label: string;
  dotColor: string;
  width: number;
}

const TECH_STACK_BADGES: readonly TechBadge[] = [
  { label: "TypeScript", dotColor: "#3178c6", width: 88 },
  { label: "Next.js", dotColor: "#ffffff", width: 68 },
  { label: "React Native", dotColor: "#61dafb", width: 98 },
  { label: "Node.js", dotColor: "#68a063", width: 70 },
  { label: "Python", dotColor: "#ffd43b", width: 66 },
  { label: "Rust", dotColor: "#dea584", width: 54 },
  { label: "Docker", dotColor: "#2496ed", width: 66 },
  { label: "AWS", dotColor: "#ff9900", width: 54 },
];

function renderTechPills(startX: number, y: number): string {
  let cursorX = startX;
  const gap = 8;

  return TECH_STACK_BADGES.map((badge) => {
    const x = cursorX;
    cursorX += badge.width + gap;
    return `
      <g transform="translate(${x}, ${y})">
        <rect width="${badge.width}" height="22" rx="6" fill="rgba(122, 162, 247, 0.09)" stroke="rgba(122, 162, 247, 0.24)" stroke-width="1" />
        <circle cx="11" cy="11" r="3.2" fill="${escapeXml(badge.dotColor)}" />
        <text x="20" y="14.8" fill="#dbe2ff" font-size="10.8" font-weight="600">${escapeXml(badge.label)}</text>
      </g>`;
  }).join("");
}

function renderStatIcon(kind: string, color: string): string {
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

function truncateLabel(name: string, maxLen = 15): string {
  if (name.length <= maxLen) return name;
  return `${name.slice(0, maxLen - 1)}…`;
}

function renderStackedLanguageBar(
  languages: LanguageStat[],
  x: number,
  y: number,
  width: number,
  height: number,
): string {
  if (languages.length === 0) {
    return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${height / 2}" fill="rgba(169, 177, 214, 0.14)" />`;
  }

  let offsetX = x;
  const segments = languages.map((lang, idx) => {
    const isLast = idx === languages.length - 1;
    const rawSegWidth = (lang.percentage / 100) * width;
    const segWidth = isLast
      ? Math.max(0, x + width - offsetX)
      : Math.max(0, rawSegWidth);
    const segX = offsetX;
    offsetX += segWidth;

    return `<rect x="${segX.toFixed(2)}" y="${y}" width="${segWidth.toFixed(2)}" height="${height}" fill="${escapeXml(lang.color)}" />`;
  });

  return `
    <g clip-path="url(#langStackClip)">
      <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="rgba(255, 255, 255, 0.06)" />
      ${segments.join("\n      ")}
    </g>`;
}

function renderLanguageRows(languages: LanguageStat[]): string {
  if (languages.length === 0) {
    return `<text x="734" y="340" text-anchor="middle" fill="#787c99" font-size="12.5">No repository language data available</text>`;
  }

  const startY = 240;
  const rowStep = 31.5;
  const miniBarX = 698;
  const miniBarMaxW = 148;

  return languages
    .slice(0, 8)
    .map((lang, idx) => {
      const rowY = startY + idx * rowStep;
      const barWidth = clamp((lang.percentage / 100) * miniBarMaxW, 3.5, miniBarMaxW);
      const delay = (0.04 + idx * 0.04).toFixed(2);

      return `
      <g class="fade-row" style="animation-delay: ${delay}s">
        <circle cx="566" cy="${(rowY - 4).toFixed(1)}" r="4.5" fill="${escapeXml(lang.color)}" stroke="rgba(255, 255, 255, 0.18)" stroke-width="0.6" />
        <text x="579" y="${rowY.toFixed(1)}" fill="#e2e8ff" font-size="12.2" font-weight="600">${escapeXml(truncateLabel(lang.name, 15))}</text>
        <rect x="${miniBarX}" y="${(rowY - 8.2).toFixed(1)}" width="${miniBarMaxW}" height="7" rx="3.5" fill="rgba(169, 177, 214, 0.10)" />
        <rect x="${miniBarX}" y="${(rowY - 8.2).toFixed(1)}" width="${barWidth.toFixed(2)}" height="7" rx="3.5" fill="${escapeXml(lang.color)}" />
        <text x="908" y="${rowY.toFixed(1)}" text-anchor="end" fill="#c0caf5" font-size="11.8" font-weight="700" class="mono">${lang.percentage.toFixed(1)}%</text>
      </g>`;
    })
    .join("");
}

/**
 * Renders the 960x540 Bento Grid Glassmorphism Master Profile SVG with animated Cyberpunk / Tokyo Night background.
 */
export function renderMasterProfile(
  stats: GitHubStats,
  rank: RankResult,
): string {
  const ringRadius = 58;
  const circumference = 2 * Math.PI * ringRadius; // ~364.4247
  const dashOffset = circumference * (1 - clamp(rank.normalizedScore, 0, 1));

  const totalCommitsSafe = Math.max(stats.totalCommits, 1);
  const privatePctNum =
    stats.totalCommits > 0
      ? Number(((stats.allTimePrivateCommits / totalCommitsSafe) * 100).toFixed(1))
      : 0;
  const publicPctNum =
    stats.totalCommits > 0 ? Number((100 - privatePctNum).toFixed(1)) : 0;

  const commitBarWidth = 422;
  const privateBarW =
    stats.totalCommits > 0
      ? (stats.allTimePrivateCommits / totalCommitsSafe) * commitBarWidth
      : 0;
  const publicBarW = Math.max(0, commitBarWidth - privateBarW);

  const statRows = [
    {
      icon: "commits",
      iconColor: "#ff75a0",
      label: "Total Commits",
      sub: "(Public + Private)",
      value: formatNumber(stats.totalCommits),
    },
    {
      icon: "year",
      iconColor: "#7dcfff",
      label: "Commits This Year",
      sub: `(${stats.currentYear})`,
      value: formatNumber(stats.currentYearCommits),
    },
    {
      icon: "prs",
      iconColor: "#bb9af7",
      label: "Pull Requests",
      sub: "",
      value: formatNumber(stats.totalPRs),
    },
    {
      icon: "reviews",
      iconColor: "#38bdae",
      label: "Code Reviews & Issues",
      sub: "",
      value: `${formatNumber(stats.totalReviews)} / ${formatNumber(stats.totalIssues)}`,
    },
    {
      icon: "stars",
      iconColor: "#e0af68",
      label: "Stars Earned",
      sub: "",
      value: formatNumber(stats.totalStars),
    },
    {
      icon: "repos",
      iconColor: "#9ece6a",
      label: "Total Repositories",
      sub: "(Pub + Priv)",
      value: formatNumber(stats.totalRepos),
    },
  ];

  const renderedStatsList = statRows
    .map((item, idx) => {
      const y = 213 + idx * 35;
      const delay = (0.04 + idx * 0.04).toFixed(2);
      const subSpan = item.sub
        ? `<tspan dx="5" fill="#6b749e" font-size="10.2" font-weight="500">${escapeXml(item.sub)}</tspan>`
        : "";

      return `
      <g class="fade-row" style="animation-delay: ${delay}s">
        <g transform="translate(46, ${y - 12})">
          ${renderStatIcon(item.icon, item.iconColor)}
        </g>
        <text x="68" y="${y}" fill="#c8d3f5" font-size="12.2" font-weight="600">${escapeXml(item.label)}${subSpan}</text>
        <text x="330" y="${y}" text-anchor="end" fill="#ffffff" font-size="13.2" font-weight="700" class="mono">${escapeXml(item.value)}</text>
      </g>`;
    })
    .join("");

  const renderedParticles = STAR_PARTICLES.map(
    (p) =>
      `<circle class="twinkle-star" cx="${p.cx}" cy="${p.cy}" r="${p.r}" fill="${escapeXml(p.color)}" style="animation-delay: ${p.delay}; animation-duration: ${p.duration}" />`,
  ).join("\n      ");

  const updatedDateShort = stats.updatedAt.slice(0, 10);
  const syncModeNote = stats.isMock
    ? "Preview Mode • Ready for GH_TOKEN"
    : `Synced ${updatedDateShort} • GraphQL v4`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" fill="none" role="img" aria-labelledby="masterTitle masterDesc">
  <title id="masterTitle">${escapeXml(stats.displayName)} (@${escapeXml(stats.username)}) — GitHub Master Profile Dashboard</title>
  <desc id="masterDesc">Bento Grid Glassmorphism GitHub Profile Dashboard showing ${escapeXml(formatNumber(stats.totalCommits))} total Public and Private commits, Rank ${escapeXml(rank.level)} (Top ${rank.percentile.toFixed(1)}%), and Top 8 programming languages.</desc>

  <defs>
    <clipPath id="canvasClip">
      <rect x="0" y="0" width="960" height="540" rx="18" />
    </clipPath>

    <clipPath id="langStackClip">
      <rect x="560" y="200" width="348" height="12" rx="6" />
    </clipPath>

    <clipPath id="commitSplitClip">
      <rect x="62" y="454" width="${commitBarWidth}" height="10" rx="5" />
    </clipPath>

    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090a10" />
      <stop offset="52%" stop-color="#121526" />
      <stop offset="100%" stop-color="#1a1b2f" />
    </linearGradient>

    <linearGradient id="privateCommitGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#bb9af7" />
      <stop offset="100%" stop-color="#7aa2f7" />
    </linearGradient>

    <linearGradient id="publicCommitGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38bdae" />
      <stop offset="100%" stop-color="#7dcfff" />
    </linearGradient>

    <linearGradient id="cardSheen" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="rgba(122, 162, 247, 0.0)" />
      <stop offset="50%" stop-color="rgba(122, 162, 247, 0.45)" />
      <stop offset="100%" stop-color="rgba(187, 154, 247, 0.0)" />
    </linearGradient>

    <pattern id="techGrid" width="32" height="32" patternUnits="userSpaceOnUse">
      <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(122, 162, 247, 0.06)" stroke-width="1" />
      <circle cx="0" cy="0" r="0.9" fill="rgba(122, 162, 247, 0.12)" />
    </pattern>

    <filter id="glowBlur" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="55" />
    </filter>
  </defs>

  <style>
    .root-text {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    .mono {
      font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    @keyframes pulseGlow {
      0%, 100% {
        opacity: 0.20;
        transform: scale(1) translate(0px, 0px);
      }
      50% {
        opacity: 0.32;
        transform: scale(1.08) translate(10px, -8px);
      }
    }
    @keyframes pulseGlowAlt {
      0%, 100% {
        opacity: 0.18;
        transform: scale(1) translate(0px, 0px);
      }
      50% {
        opacity: 0.30;
        transform: scale(1.10) translate(-12px, 8px);
      }
    }
    @keyframes twinkle {
      0%, 100% {
        opacity: 0.18;
      }
      50% {
        opacity: 0.92;
      }
    }
    @keyframes statusBlink {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.35;
      }
    }
    @keyframes statusHalo {
      0%, 100% {
        transform: scale(1);
        opacity: 0.35;
      }
      50% {
        transform: scale(1.65);
        opacity: 0.08;
      }
    }
    @keyframes fadeInRow {
      from {
        opacity: 0;
        transform: translateY(5px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes ringSweep {
      from {
        stroke-dashoffset: ${circumference.toFixed(2)};
      }
      to {
        stroke-dashoffset: ${dashOffset.toFixed(2)};
      }
    }
    .orb-primary {
      transform-origin: 150px 95px;
      animation: pulseGlow 8s infinite ease-in-out;
    }
    .orb-secondary {
      transform-origin: 825px 450px;
      animation: pulseGlowAlt 9.5s infinite ease-in-out;
    }
    .orb-tertiary {
      transform-origin: 515px 275px;
      animation: pulseGlow 11s infinite ease-in-out;
    }
    .twinkle-star {
      animation: twinkle 3s infinite ease-in-out;
    }
    .status-dot {
      animation: statusBlink 2.2s infinite ease-in-out;
    }
    .status-halo {
      transform-origin: 746px 49px;
      animation: statusHalo 2.2s infinite ease-in-out;
    }
    .fade-row {
      animation: fadeInRow 0.42s ease-out backwards;
    }
    .rank-ring-progress {
      stroke-dasharray: ${circumference.toFixed(2)};
      stroke-dashoffset: ${dashOffset.toFixed(2)};
      animation: ringSweep 1.35s cubic-bezier(0.22, 1, 0.36, 1) backwards;
      filter: drop-shadow(0 0 7px ${escapeXml(rank.color)});
    }
    @media (prefers-reduced-motion: reduce) {
      .orb-primary,
      .orb-secondary,
      .orb-tertiary,
      .twinkle-star,
      .status-dot,
      .status-halo,
      .fade-row,
      .rank-ring-progress {
        animation: none !important;
      }
    }
  </style>

  <!-- 4.1 Custom Dynamic Background Layer -->
  <g clip-path="url(#canvasClip)">
    <rect x="0" y="0" width="960" height="540" rx="18" fill="url(#bgGrad)" />
    <rect x="0" y="0" width="960" height="540" rx="18" fill="url(#techGrid)" />

    <!-- Ambient Glow Orbs -->
    <circle class="orb-primary" cx="150" cy="95" r="140" fill="#7aa2f7" opacity="0.24" filter="url(#glowBlur)" />
    <circle class="orb-secondary" cx="825" cy="450" r="150" fill="#bb9af7" opacity="0.22" filter="url(#glowBlur)" />
    <circle class="orb-tertiary" cx="515" cy="275" r="105" fill="#38bdae" opacity="0.11" filter="url(#glowBlur)" />

    <!-- Twinkling Stars / Particles -->
    <g>
      ${renderedParticles}
    </g>
  </g>

  <!-- Outer Frame Border -->
  <rect x="0.75" y="0.75" width="958.5" height="538.5" rx="17.25" fill="none" stroke="rgba(122, 162, 247, 0.26)" stroke-width="1.5" />

  <!-- 4.2 Bento Grid Glassmorphism Cards -->
  <g class="root-text">

    <!-- BENTO BLOCK 1: Top Header Banner -->
    <g>
      <rect x="28" y="24" width="904" height="105" rx="14" fill="rgba(22, 24, 38, 0.78)" stroke="rgba(122, 162, 247, 0.22)" stroke-width="1.2" />
      <line x1="80" y1="24.6" x2="880" y2="24.6" stroke="url(#cardSheen)" stroke-width="1.2" />

      <!-- Name + Handle -->
      <text x="50" y="54" fill="#ffffff" font-size="24" font-weight="800" letter-spacing="-0.3">${escapeXml(stats.displayName)}<tspan dx="12" fill="#7aa2f7" font-size="14" font-weight="600" class="mono">@${escapeXml(stats.username)}</tspan></text>

      <!-- Subtitle -->
      <text x="50" y="76" fill="#a9b1d6" font-size="12.8" font-weight="500">Computer Science &amp; Engineering • Full-Stack, Cloud &amp; AI Developer</text>

      <!-- Active Developer Badge (Top Right) -->
      <rect x="730" y="36" width="182" height="26" rx="13" fill="rgba(158, 206, 106, 0.10)" stroke="rgba(158, 206, 106, 0.34)" stroke-width="1" />
      <circle class="status-halo" cx="746" cy="49" r="5.2" fill="#9ece6a" opacity="0.32" />
      <circle class="status-dot" cx="746" cy="49" r="3.5" fill="#9ece6a" />
      <text x="758" y="53" fill="#9ece6a" font-size="11.2" font-weight="700">Active Developer • ${stats.currentYear}</text>

      <!-- Tech Stack Pills -->
      ${renderTechPills(50, 91)}

      <!-- Sync Metadata Note -->
      <text x="912" y="106" text-anchor="end" fill="#6b749e" font-size="10" class="mono">${escapeXml(syncModeNote)}</text>
    </g>

    <!-- BENTO BLOCK 2: GitHub Contribution Stats and Dynamic Rank -->
    <g>
      <rect x="28" y="145" width="490" height="367" rx="14" fill="rgba(22, 24, 38, 0.78)" stroke="rgba(122, 162, 247, 0.22)" stroke-width="1.2" />
      <line x1="60" y1="145.6" x2="486" y2="145.6" stroke="url(#cardSheen)" stroke-width="1.2" />

      <text x="48" y="173" fill="#7aa2f7" font-size="12.4" font-weight="700" letter-spacing="1">⚡ GITHUB CONTRIBUTION STATS</text>
      <text x="498" y="173" text-anchor="end" fill="#565f89" font-size="10.2" font-weight="600" class="mono">${stats.activeYears[0] ?? stats.currentYear} – ${stats.currentYear}</text>
      <line x1="48" y1="185" x2="498" y2="185" stroke="rgba(122, 162, 247, 0.14)" stroke-width="1" />

      <!-- 6 Metric Rows (Left Column) -->
      ${renderedStatsList}

      <!-- Subtle Divider Between Stats and Rank Ring -->
      <line x1="342" y1="198" x2="342" y2="408" stroke="rgba(122, 162, 247, 0.12)" stroke-width="1" stroke-dasharray="3 4" />

      <!-- Dynamic Rank Ring (Right Column: cx=430, cy=278, r=58) -->
      <g>
        <circle cx="430" cy="278" r="${ringRadius}" stroke="rgba(169, 177, 214, 0.11)" stroke-width="8.5" fill="none" />
        <circle cx="430" cy="278" r="46" stroke="rgba(122, 162, 247, 0.14)" stroke-width="1" stroke-dasharray="3 4" fill="none" />
        <circle
          class="rank-ring-progress"
          cx="430"
          cy="278"
          r="${ringRadius}"
          stroke="${escapeXml(rank.color)}"
          stroke-width="8.5"
          stroke-linecap="round"
          fill="none"
          transform="rotate(-90 430 278)"
        />

        <text x="430" y="253" text-anchor="middle" fill="#787c99" font-size="9.2" font-weight="700" letter-spacing="1.4">RANK TIER</text>
        <text x="430" y="290" text-anchor="middle" fill="${escapeXml(rank.color)}" font-size="38" font-weight="800">${escapeXml(rank.level)}</text>
        <text x="430" y="311" text-anchor="middle" fill="#dbe2ff" font-size="11.5" font-weight="700" class="mono">Top ${rank.percentile.toFixed(1)}%</text>

        <!-- Weighted Score Pill Below Ring -->
        <rect x="348" y="352" width="164" height="24" rx="12" fill="rgba(122, 162, 247, 0.09)" stroke="rgba(122, 162, 247, 0.22)" stroke-width="1" />
        <text x="430" y="367.5" text-anchor="middle" fill="#c8d3f5" font-size="8.9" font-weight="600" class="mono">Weighted Score: ${rank.weightedSum.toFixed(1)} / 12.0</text>
        <text x="430" y="394" text-anchor="middle" fill="${escapeXml(rank.color)}" font-size="10.4" font-weight="600" opacity="0.92">${escapeXml(rank.tierName)}</text>
      </g>

      <!-- Bottom Ratio Bar: Public vs Private Commits -->
      <g>
        <rect x="48" y="420" width="450" height="74" rx="10" fill="rgba(11, 13, 23, 0.58)" stroke="rgba(122, 162, 247, 0.15)" stroke-width="1" />
        <text x="62" y="442" fill="#bb9af7" font-size="11.2" font-weight="700">🔒 Private Commits: ${escapeXml(formatNumber(stats.allTimePrivateCommits))} (${privatePctNum.toFixed(1)}%)</text>
        <text x="484" y="442" text-anchor="end" fill="#38bdae" font-size="11.2" font-weight="700">🌐 Public: ${escapeXml(formatNumber(stats.allTimePublicCommits))} (${publicPctNum.toFixed(1)}%)</text>

        <g clip-path="url(#commitSplitClip)">
          <rect x="62" y="454" width="${commitBarWidth}" height="10" fill="rgba(255, 255, 255, 0.06)" />
          <rect x="62" y="454" width="${privateBarW.toFixed(2)}" height="10" fill="url(#privateCommitGrad)" />
          <rect x="${(62 + privateBarW).toFixed(2)}" y="454" width="${publicBarW.toFixed(2)}" height="10" fill="url(#publicCommitGrad)" />
        </g>

        <text x="62" y="482" fill="#6b749e" font-size="10">Commit-First Rank (50% Weight)</text>
        <text x="484" y="482" text-anchor="end" fill="#8590b8" font-size="10" class="mono">Followers: ${escapeXml(formatNumber(stats.followers))} • Priv Repos: ${escapeXml(formatNumber(stats.privateRepos))}</text>
      </g>
    </g>

    <!-- BENTO BLOCK 3: Top Languages Distribution -->
    <g>
      <rect x="536" y="145" width="396" height="367" rx="14" fill="rgba(22, 24, 38, 0.78)" stroke="rgba(122, 162, 247, 0.22)" stroke-width="1.2" />
      <line x1="568" y1="145.6" x2="900" y2="145.6" stroke="url(#cardSheen)" stroke-width="1.2" />

      <text x="560" y="173" fill="#bb9af7" font-size="12.4" font-weight="700" letter-spacing="0.8">💻 MOST USED LANGUAGES (ALL REPOS)</text>
      <line x1="560" y1="185" x2="908" y2="185" stroke="rgba(187, 154, 247, 0.15)" stroke-width="1" />

      <!-- Multi-Color Stacked Progress Bar (348px x 12px) -->
      ${renderStackedLanguageBar(stats.topLanguages, 560, 200, 348, 12)}

      <!-- Top 8 Language Rows -->
      ${renderLanguageRows(stats.topLanguages)}

      <!-- Card Footer -->
      <line x1="560" y1="480" x2="908" y2="480" stroke="rgba(122, 162, 247, 0.12)" stroke-width="1" />
      <text x="560" y="497" fill="#6b749e" font-size="10">Public + Private Repos (Non-Fork)</text>
      <text x="908" y="497" text-anchor="end" fill="#8590b8" font-size="10" class="mono">Top ${stats.topLanguages.length} • 100.0%</text>
    </g>

  </g>
</svg>
`;
}

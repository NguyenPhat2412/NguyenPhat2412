import type {
  GitHubStats,
  LanguageStat,
  YearlyContribution,
} from "./types.js";

const GITHUB_GRAPHQL_ENDPOINT = "https://api.github.com/graphql";
export const TARGET_USERNAME = process.env.GH_USERNAME?.trim() || "NguyenPhat2412";
export const DISPLAY_NAME = "Nguyễn Xuân Phát";

/**
 * Auxiliary/generated markup or notebook formats excluded by default so core code languages shine.
 * Can be customized via env EXCLUDE_LANGS="HTML,CSS,Shell" if desired.
 */
const DEFAULT_EXCLUDED_LANGUAGES = new Set(
  [
    "html",
    "css",
    "scss",
    "sass",
    "less",
    "ejs",
    "pug",
    "handlebars",
    "mustache",
    "mdx",
    "jupyter notebook",
    "roff",
    "tex",
    "bibtex style",
    "procfile",
    "rich text format",
    "vim snippet",
    "ignore list",
    "svg",
    "batchfile",
    "powershell",
    "nsis",
  ],
);

const FALLBACK_LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Rust: "#dea584",
  Java: "#b07219",
  Go: "#00ADD8",
  HTML: "#e34c26",
  CSS: "#563d7c",
  SCSS: "#c6538c",
  Shell: "#89e051",
  Dockerfile: "#384d54",
  SQL: "#e38c00",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Vue: "#41b883",
  Kotlin: "#A97BFF",
  Swift: "#F05138",
  Astro: "#ff5a03",
  PLpgSQL: "#336790",
};

interface GraphQLErrorItem {
  message: string;
  type?: string;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLErrorItem[];
}

interface ViewerProbeData {
  viewer?: {
    login: string;
  };
}

interface UserMetadataNode {
  login: string;
  name: string | null;
  createdAt: string;
  followers: { totalCount: number };
  totalOwnedRepos: { totalCount: number };
  publicOwnedRepos: { totalCount: number };
  privateOwnedRepos: { totalCount: number };
  contributionsCollection: {
    contributionYears: number[];
  };
}

interface RawRepoCommitContribution {
  repository: {
    isPrivate: boolean;
  };
  contributions: {
    totalCount: number;
  };
}

interface RawYearContribution {
  totalCommitContributions: number;
  restrictedContributionsCount: number;
  totalPullRequestContributions: number;
  totalPullRequestReviewContributions: number;
  totalIssueContributions: number;
  commitContributionsByRepository: RawRepoCommitContribution[];
}

interface RepoLanguageEdge {
  size: number;
  node: {
    name: string;
    color: string | null;
  };
}

interface RepoNode {
  name: string;
  isFork: boolean;
  isPrivate: boolean;
  stargazerCount: number;
  languages: {
    edges: RepoLanguageEdge[];
  } | null;
}

interface RepoPageNode {
  repositories: {
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
    nodes: RepoNode[];
  };
}

export interface FetchStatsOptions {
  username?: string;
  forceMock?: boolean;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function graphqlRequest<T>(
  token: string,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(GITHUB_GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "User-Agent": "NguyenPhat2412-Master-Profile-Generator",
        },
        body: JSON.stringify({ query, variables }),
      });

      if (!response.ok) {
        const bodyText = await response.text();
        if (response.status >= 500 && attempt < 3) {
          await sleep(800 * attempt);
          continue;
        }
        throw new Error(
          `GitHub GraphQL HTTP ${response.status} ${response.statusText}: ${bodyText.slice(0, 300)}`,
        );
      }

      const payload = (await response.json()) as GraphQLResponse<T>;
      if (payload.errors && payload.errors.length > 0 && !payload.data) {
        const errMsg = payload.errors.map((e) => e.message).join("; ");
        throw new Error(`GitHub GraphQL Error: ${errMsg}`);
      }

      if (!payload.data) {
        throw new Error("GitHub GraphQL returned an empty data payload.");
      }

      return payload.data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < 3) {
        await sleep(800 * attempt);
      }
    }
  }

  throw lastError ?? new Error("Unknown GraphQL failure.");
}

/**
 * Normalizes the top N languages so their rounded 1-decimal percentages sum to exactly 100.0%.
 */
export function normalizeTopLanguages(
  rawLangMap: Map<string, { size: number; color: string }>,
  topLimit = 8,
): LanguageStat[] {
  const entries = Array.from(rawLangMap.entries())
    .filter(([, info]) => info.size > 0)
    .map(([name, info]) => ({
      name,
      color: info.color || FALLBACK_LANG_COLORS[name] || "#7aa2f7",
      size: info.size,
    }))
    .sort((a, b) => b.size - a.size)
    .slice(0, topLimit);

  if (entries.length === 0) {
    return [];
  }

  const totalTopBytes = entries.reduce((acc, item) => acc + item.size, 0);
  if (totalTopBytes <= 0) {
    return [];
  }

  // Largest-remainder (Hamilton) method at 0.1% precision (1000 tenths = 100.0%)
  const exactTenths = entries.map((item) => (item.size / totalTopBytes) * 1000);
  const flooredTenths = exactTenths.map((val) => Math.floor(val));
  let remainder = 1000 - flooredTenths.reduce((acc, val) => acc + val, 0);

  const indicesByFraction = exactTenths
    .map((val, index) => ({ index, frac: val - flooredTenths[index] }))
    .sort((a, b) => b.frac - a.frac);

  for (let i = 0; i < indicesByFraction.length && remainder > 0; i++) {
    flooredTenths[indicesByFraction[i].index] += 1;
    remainder -= 1;
  }

  return entries.map((item, idx) => ({
    name: item.name,
    color: item.color,
    size: item.size,
    percentage: Number((flooredTenths[idx] / 10).toFixed(1)),
  }));
}

/**
 * Realistic preview/fallback dataset when running locally without GH_TOKEN or with --mock.
 */
export function getMockGitHubStats(username = TARGET_USERNAME): GitHubStats {
  const currentYear = new Date().getUTCFullYear();
  const yearlyBreakdown: YearlyContribution[] = [
    {
      year: currentYear - 3,
      publicCommits: 86,
      privateCommits: 164,
      totalCommits: 250,
      prs: 9,
      reviews: 3,
      issues: 6,
    },
    {
      year: currentYear - 2,
      publicCommits: 142,
      privateCommits: 378,
      totalCommits: 520,
      prs: 21,
      reviews: 8,
      issues: 11,
    },
    {
      year: currentYear - 1,
      publicCommits: 195,
      privateCommits: 512,
      totalCommits: 707,
      prs: 34,
      reviews: 14,
      issues: 15,
    },
    {
      year: currentYear,
      publicCommits: 118,
      privateCommits: 429,
      totalCommits: 547,
      prs: 28,
      reviews: 12,
      issues: 9,
    },
  ];

  const allTimePublicCommits = yearlyBreakdown.reduce(
    (sum, y) => sum + y.publicCommits,
    0,
  );
  const allTimePrivateCommits = yearlyBreakdown.reduce(
    (sum, y) => sum + y.privateCommits,
    0,
  );
  const totalCommits = allTimePublicCommits + allTimePrivateCommits;
  const currentYearCommits =
    yearlyBreakdown[yearlyBreakdown.length - 1]?.totalCommits ?? 0;

  const rawMockLangs = new Map<string, { size: number; color: string }>([
    ["TypeScript", { size: 1_480_000, color: "#3178c6" }],
    ["Python", { size: 780_000, color: "#3572A5" }],
    ["JavaScript", { size: 540_000, color: "#f1e05a" }],
    ["Rust", { size: 310_000, color: "#dea584" }],
    ["Java", { size: 245_000, color: "#b07219" }],
    ["CSS", { size: 165_000, color: "#563d7c" }],
    ["Dockerfile", { size: 92_000, color: "#384d54" }],
    ["Shell", { size: 68_000, color: "#89e051" }],
  ]);

  return {
    username,
    displayName: DISPLAY_NAME,
    allTimePublicCommits,
    allTimePrivateCommits,
    totalCommits,
    currentYearCommits,
    currentYear,
    activeYears: yearlyBreakdown.map((y) => y.year),
    yearlyBreakdown,
    totalPRs: yearlyBreakdown.reduce((sum, y) => sum + y.prs, 0),
    totalReviews: yearlyBreakdown.reduce((sum, y) => sum + y.reviews, 0),
    totalIssues: yearlyBreakdown.reduce((sum, y) => sum + y.issues, 0),
    totalRepos: 38,
    publicRepos: 14,
    privateRepos: 24,
    totalStars: 46,
    followers: 32,
    topLanguages: normalizeTopLanguages(rawMockLangs, 8),
    updatedAt: new Date().toISOString(),
    isMock: true,
  };
}

function getExcludedLanguageSet(): Set<string> {
  const excluded = new Set(DEFAULT_EXCLUDED_LANGUAGES);
  const extra = process.env.EXCLUDE_LANGS?.trim();
  if (extra) {
    for (const item of extra.split(",")) {
      const normalized = item.trim().toLowerCase();
      if (normalized) {
        excluded.add(normalized);
      }
    }
  }
  return excluded;
}

/**
 * Fetches full Public + Private GitHub contribution & language statistics via GitHub GraphQL API v4.
 * Automatically queries `viewer` when authenticated as `NguyenPhat2412` (PAT with `repo` + `read:user`),
 * unlocking 100% of private repository commits, private repo counts, and private language bytes.
 */
export async function fetchGitHubStats(
  options: FetchStatsOptions = {},
): Promise<GitHubStats> {
  const username = options.username ?? TARGET_USERNAME;

  if (options.forceMock) {
    console.info(
      `[fetchStats] --mock flag detected. Generating preview stats for @${username}.`,
    );
    return getMockGitHubStats(username);
  }

  const token = (process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "").trim();
  if (!token) {
    console.warn(
      `[fetchStats] No GH_TOKEN or GITHUB_TOKEN found in environment. Falling back to preview mock data for @${username}.`,
    );
    return getMockGitHubStats(username);
  }

  // Step 1: Probe whether the provided token belongs directly to `username` (`viewer`).
  // Querying `viewer` is required by GitHub GraphQL v4 to expose 100% private contributions & private repos.
  let useViewerRoot = false;
  try {
    const viewerData = await graphqlRequest<ViewerProbeData>(
      token,
      `query ProbeViewer { viewer { login } }`,
    );
    if (
      viewerData.viewer?.login &&
      viewerData.viewer.login.toLowerCase() === username.toLowerCase()
    ) {
      useViewerRoot = true;
      console.info(
        `[fetchStats] Authenticated as viewer @${viewerData.viewer.login} — Private Commits & Private Repos unlocked.`,
      );
    } else {
      console.warn(
        `[fetchStats] Token authenticated as "${viewerData.viewer?.login ?? "installation-token"}", not @${username}. Querying user(login: "${username}") (provide a PAT in GH_TOKEN with 'repo' + 'read:user' for 100% private stats).`,
      );
    }
  } catch {
    console.warn(
      `[fetchStats] Viewer probe unavailable (likely GitHub Actions default GITHUB_TOKEN). Falling back to user(login: "${username}").`,
    );
  }

  // Step 2: Fetch user profile metadata & active contribution years
  const metaFields = `
    login
    name
    createdAt
    followers {
      totalCount
    }
    totalOwnedRepos: repositories(ownerAffiliations: [OWNER]) {
      totalCount
    }
    publicOwnedRepos: repositories(ownerAffiliations: [OWNER], privacy: PUBLIC) {
      totalCount
    }
    privateOwnedRepos: repositories(ownerAffiliations: [OWNER], privacy: PRIVATE) {
      totalCount
    }
    contributionsCollection {
      contributionYears
    }
  `;

  let metadata: UserMetadataNode;
  if (useViewerRoot) {
    const res = await graphqlRequest<{ viewer: UserMetadataNode }>(
      token,
      `query FetchViewerMeta { viewer { ${metaFields} } }`,
    );
    metadata = res.viewer;
  } else {
    const res = await graphqlRequest<{ user: UserMetadataNode | null }>(
      token,
      `query FetchUserMeta($username: String!) { user(login: $username) { ${metaFields} } }`,
      { username },
    );
    if (!res.user) {
      throw new Error(`GitHub user "${username}" not found.`);
    }
    metadata = res.user;
  }

  const currentYear = new Date().getUTCFullYear();
  const createdYear = new Date(metadata.createdAt).getUTCFullYear();
  const yearSet = new Set<number>(metadata.contributionsCollection.contributionYears);
  const startYear = Math.min(
    createdYear || currentYear,
    ...(yearSet.size > 0 ? Array.from(yearSet) : [currentYear]),
  );
  for (let y = startYear; y <= currentYear; y++) {
    yearSet.add(y);
  }
  const sortedYears = Array.from(yearSet).sort((a, b) => a - b);

  // Step 3: Batch-fetch contributionsCollection across ALL years from account creation to current year
  const yearlyAliases = sortedYears
    .map(
      (year) => `
      y${year}: contributionsCollection(
        from: "${year}-01-01T00:00:00Z",
        to: "${year}-12-31T23:59:59Z"
      ) {
        totalCommitContributions
        restrictedContributionsCount
        totalPullRequestContributions
        totalPullRequestReviewContributions
        totalIssueContributions
        commitContributionsByRepository(maxRepositories: 100) {
          repository {
            isPrivate
          }
          contributions {
            totalCount
          }
        }
      }`,
    )
    .join("\n");

  let rawYearsRecord: Record<string, RawYearContribution>;
  if (useViewerRoot) {
    const res = await graphqlRequest<{ viewer: Record<string, RawYearContribution> }>(
      token,
      `query FetchAllYearsViewer { viewer { ${yearlyAliases} } }`,
    );
    rawYearsRecord = res.viewer;
  } else {
    const res = await graphqlRequest<{ user: Record<string, RawYearContribution> }>(
      token,
      `query FetchAllYearsUser($username: String!) { user(login: $username) { ${yearlyAliases} } }`,
      { username },
    );
    rawYearsRecord = res.user;
  }

  const yearlyBreakdown: YearlyContribution[] = sortedYears.map((year) => {
    const bucket = rawYearsRecord[`y${year}`];
    const totalVisibleCommits = bucket?.totalCommitContributions ?? 0;
    const restrictedCount = bucket?.restrictedContributionsCount ?? 0;
    const byRepo = bucket?.commitContributionsByRepository ?? [];

    // When authenticated as viewer with `repo` scope, private repo commits are included in
    // `totalCommitContributions` and `restrictedContributionsCount` is 0; inspect `isPrivate` per repo
    // to separate exact Public vs Private commit counts accurately in both viewer and public modes.
    const repoPrivateCommits = byRepo.reduce(
      (sum, entry) =>
        entry.repository?.isPrivate ? sum + (entry.contributions?.totalCount ?? 0) : sum,
      0,
    );

    const publicCommits = Math.max(0, totalVisibleCommits - repoPrivateCommits);
    const privateCommits = repoPrivateCommits + restrictedCount;
    return {
      year,
      publicCommits,
      privateCommits,
      totalCommits: publicCommits + privateCommits,
      prs: bucket?.totalPullRequestContributions ?? 0,
      reviews: bucket?.totalPullRequestReviewContributions ?? 0,
      issues: bucket?.totalIssueContributions ?? 0,
    };
  });

  const allTimePublicCommits = yearlyBreakdown.reduce(
    (sum, item) => sum + item.publicCommits,
    0,
  );
  const allTimePrivateCommits = yearlyBreakdown.reduce(
    (sum, item) => sum + item.privateCommits,
    0,
  );
  const totalCommits = allTimePublicCommits + allTimePrivateCommits;
  const currentYearEntry = yearlyBreakdown.find((y) => y.year === currentYear);
  const currentYearCommits = currentYearEntry?.totalCommits ?? 0;

  const totalPRs = yearlyBreakdown.reduce((sum, item) => sum + item.prs, 0);
  const totalReviews = yearlyBreakdown.reduce((sum, item) => sum + item.reviews, 0);
  const totalIssues = yearlyBreakdown.reduce((sum, item) => sum + item.issues, 0);

  // Step 4: Paginate owned repositories (Public + Private) to sum Stars & non-fork Language bytes
  const repoSelection = `
    repositories(
      first: 100,
      after: $cursor,
      ownerAffiliations: [OWNER],
      orderBy: { field: UPDATED_AT, direction: DESC }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        name
        isFork
        isPrivate
        stargazerCount
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
          edges {
            size
            node {
              name
              color
            }
          }
        }
      }
    }
  `;

  let totalStars = 0;
  const excludedLangs = getExcludedLanguageSet();
  const filteredLangMap = new Map<string, { size: number; color: string }>();
  const unfilteredLangMap = new Map<string, { size: number; color: string }>();

  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    let repoPage: RepoPageNode;
    if (useViewerRoot) {
      const res = await graphqlRequest<{ viewer: RepoPageNode }>(
        token,
        `query FetchViewerRepos($cursor: String) { viewer { ${repoSelection} } }`,
        { cursor },
      );
      repoPage = res.viewer;
    } else {
      const res = await graphqlRequest<{ user: RepoPageNode }>(
        token,
        `query FetchUserRepos($username: String!, $cursor: String) { user(login: $username) { ${repoSelection} } }`,
        { username, cursor },
      );
      repoPage = res.user;
    }

    for (const repo of repoPage.repositories.nodes) {
      totalStars += repo.stargazerCount ?? 0;

      if (!repo.isFork && repo.languages?.edges) {
        for (const edge of repo.languages.edges) {
          if (!edge || edge.size <= 0 || !edge.node?.name) continue;
          const langName = edge.node.name;
          const langColor =
            edge.node.color || FALLBACK_LANG_COLORS[langName] || "#7aa2f7";

          const prevAll = unfilteredLangMap.get(langName);
          unfilteredLangMap.set(langName, {
            size: (prevAll?.size ?? 0) + edge.size,
            color: prevAll?.color || langColor,
          });

          if (!excludedLangs.has(langName.toLowerCase())) {
            const prevFiltered = filteredLangMap.get(langName);
            filteredLangMap.set(langName, {
              size: (prevFiltered?.size ?? 0) + edge.size,
              color: prevFiltered?.color || langColor,
            });
          }
        }
      }
    }

    hasNextPage = repoPage.repositories.pageInfo.hasNextPage;
    cursor = repoPage.repositories.pageInfo.endCursor;
  }

  const chosenLangMap =
    filteredLangMap.size > 0 ? filteredLangMap : unfilteredLangMap;
  const topLanguages = normalizeTopLanguages(chosenLangMap, 8);

  const totalRepos = metadata.totalOwnedRepos.totalCount;
  const publicRepos = metadata.publicOwnedRepos.totalCount;
  const privateRepos = Math.max(
    metadata.privateOwnedRepos.totalCount,
    totalRepos - publicRepos,
  );

  return {
    username: metadata.login || username,
    displayName: DISPLAY_NAME,
    allTimePublicCommits,
    allTimePrivateCommits,
    totalCommits,
    currentYearCommits,
    currentYear,
    activeYears: sortedYears,
    yearlyBreakdown,
    totalPRs,
    totalReviews,
    totalIssues,
    totalRepos,
    publicRepos,
    privateRepos,
    totalStars,
    followers: metadata.followers.totalCount,
    topLanguages,
    updatedAt: new Date().toISOString(),
    isMock: false,
  };
}

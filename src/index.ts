import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { calculateRank } from "./calculateRank.js";
import { fetchGitHubStats } from "./fetchStats.js";
import { renderLangsCard } from "./renderLangsCard.js";
import { renderMasterProfile } from "./renderMasterProfile.js";
import { renderStatsCard } from "./renderStatsCard.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const GENERATED_DIR = path.join(PROJECT_ROOT, "generated");

/**
 * Performs strict XML/SVG validation: checks root wrapper, unescaped '&' entities, and balanced XML tags.
 */
function assertValidSvgMarkup(fileName: string, svgContent: string): void {
  const trimmed = svgContent.trim();
  if (!trimmed.startsWith("<svg ") || !trimmed.endsWith("</svg>")) {
    throw new Error(
      `[${fileName}] Invalid SVG root wrapper: must start with <svg ...> and end with </svg>.`,
    );
  }

  // Detect any raw '&' that is not part of a valid XML character/named entity
  const unescapedAmpersand = /&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/;
  if (unescapedAmpersand.test(trimmed)) {
    throw new Error(`[${fileName}] Found unescaped '&' character in SVG output.`);
  }

  // Verify strict XML tag balance (excluding comments)
  const withoutComments = trimmed.replace(/<!--[\s\S]*?-->/g, "");
  const tagRegex = /<\/?([a-zA-Z][\w:-]*)(\s[^<>]*?)?(\/?)>/g;
  const stack: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(withoutComments)) !== null) {
    const fullTag = match[0];
    const tagName = match[1];
    const selfClosing = match[3] === "/";

    if (fullTag.startsWith("</")) {
      const top = stack.pop();
      if (top !== tagName) {
        throw new Error(
          `[${fileName}] XML tag mismatch: expected </${top ?? "none"}>, found </${tagName}>.`,
        );
      }
    } else if (!selfClosing) {
      stack.push(tagName);
    }
  }

  if (stack.length > 0) {
    throw new Error(
      `[${fileName}] Unclosed XML tags remaining: ${stack.join(" > ")}`,
    );
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const forceMock = args.includes("--mock");
  const usernameArg = args
    .find((arg) => arg.startsWith("--username="))
    ?.split("=")[1]
    ?.trim();

  console.info("============================================================");
  console.info("🚀 GitHub Master Profile SVG Generator — @NguyenPhat2412");
  console.info("============================================================");

  const stats = await fetchGitHubStats({
    username: usernameArg,
    forceMock,
  });

  if (process.env.CI === "true" && stats.isMock && !forceMock) {
    throw new Error(
      "Refusing to overwrite generated/*.svg with mock data in CI environment. Check GH_TOKEN secret.",
    );
  }

  const rank = calculateRank(stats);

  console.info(
    `[Summary] User: ${stats.displayName} (@${stats.username}) | Mode: ${stats.isMock ? "MOCK PREVIEW" : "LIVE GRAPHQL v4"}`,
  );
  console.info(
    `[Commits] Total: ${stats.totalCommits.toLocaleString()} (Public: ${stats.allTimePublicCommits.toLocaleString()} | Private: ${stats.allTimePrivateCommits.toLocaleString()} | ${stats.currentYear}: ${stats.currentYearCommits.toLocaleString()})`,
  );
  console.info(
    `[Metrics] PRs: ${stats.totalPRs} | Reviews: ${stats.totalReviews} | Issues: ${stats.totalIssues} | Stars: ${stats.totalStars} | Repos: ${stats.totalRepos} (${stats.publicRepos} pub / ${stats.privateRepos} priv) | Followers: ${stats.followers}`,
  );
  console.info(
    `[Rank]    Tier: ${rank.level} (Top ${rank.percentile.toFixed(1)}%) | Weighted Score: ${rank.weightedSum.toFixed(2)} / ${rank.totalWeight} | Color: ${rank.color}`,
  );
  console.info(
    `[Langs]   ${stats.topLanguages.map((l) => `${l.name} (${l.percentage.toFixed(1)}%)`).join(", ") || "None"}`,
  );

  await mkdir(GENERATED_DIR, { recursive: true });

  const outputs: Array<{ name: string; content: string }> = [
    {
      name: "master-profile.svg",
      content: renderMasterProfile(stats, rank),
    },
    {
      name: "stats.svg",
      content: renderStatsCard(stats, rank),
    },
    {
      name: "top-langs.svg",
      content: renderLangsCard(stats),
    },
  ];

  for (const output of outputs) {
    assertValidSvgMarkup(output.name, output.content);
    const fullPath = path.join(GENERATED_DIR, output.name);
    await writeFile(fullPath, output.content, "utf8");
    console.info(`✅ Wrote generated/${output.name} (${Buffer.byteLength(output.content, "utf8")} bytes)`);
  }

  console.info("============================================================");
}

main().catch((error: unknown) => {
  console.error("❌ Failed to generate GitHub profile SVGs:", error);
  process.exit(1);
});

import { getForgejoUserContribution } from "@snk/forgejo-user-contribution";
import type { AnimationOptions } from "@snk/gif-creator";
import { getGithubUserContribution } from "@snk/github-user-contribution";
import { getGitlabUserContribution } from "@snk/gitlab-user-contribution";
import { getBestRoute } from "@snk/solver/getBestRoute";
import { getPathToPose } from "@snk/solver/getPathToPose";
import type { DrawOptions } from "@snk/svg-creator";
import { snake4 } from "@snk/types/__fixtures__/snake";
import { cellsToGrid } from "./cellsToGrid";

export { basePalettes, palettes } from "./palettes";

export type Source =
  | {
      platform: "github";
      username: string;
      githubToken: string;
      baseUrl?: string;
    }
  | { platform: "gitlab"; username: string; baseUrl?: string }
  | { platform: "forgejo"; username: string; baseUrl: string };

export type Output = {
  format: "svg" | "gif";
  drawOptions: DrawOptions;
  animationOptions: AnimationOptions;
};

export const getUserContribution = async (source: Source) => {
  switch (source.platform) {
    case "github":
      return getGithubUserContribution(source.username, {
        githubToken: source.githubToken,
        baseUrl: source.baseUrl,
      });
    case "gitlab":
      return getGitlabUserContribution(source.username, {
        baseUrl: source.baseUrl,
      });
    case "forgejo":
      return getForgejoUserContribution(source.username, {
        baseUrl: source.baseUrl,
      });
  }
};

/**
 * Merge contribution cells from multiple sources into a single unified cell list.
 *
 * Counts for the same date are summed across all sources. Intensity levels (0-4)
 * are then recomputed against the new global maximum. Coordinates (x, y) are
 * regenerated from a normalized calendar window derived from the merged input dates so that
 * each provider's independent x/y offsets cannot misalign the final grid.
 */
export const mergeContributionCells = (
  cellsPerSource: { date: string; count?: number }[][],
) => {
  const countsByDate = new Map<string, number>();
  for (const cells of cellsPerSource) {
    for (const { date, count = 0 } of cells) {
      countsByDate.set(date, (countsByDate.get(date) ?? 0) + count);
    }
  }

  const max = Math.max(0, ...countsByDate.values());
  const levelForCount = (count: number): 0 | 1 | 2 | 3 | 4 =>
    count <= 0 || max === 0
      ? 0
      : count >= max
        ? 4
        : (Math.ceil((count / max) * 3) as 1 | 2 | 3);

  if (countsByDate.size === 0) return [];

  const parseIsoDate = (date: string) => new Date(`${date}T00:00:00.000Z`);
  const dates = [...countsByDate.keys()].sort();

  // Build a stable calendar window from the actual data span so tests and
  // outputs do not depend on the current day.
  const start = parseIsoDate(dates[0]!);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay()); // rewind to Sunday

  const end = parseIsoDate(dates[dates.length - 1]!);
  end.setUTCDate(end.getUTCDate() + (6 - end.getUTCDay())); // advance to Saturday

  const cells: {
    x: number;
    y: number;
    date: string;
    count: number;
    level: 0 | 1 | 2 | 3 | 4;
  }[] = [];
  const cursor = new Date(start);
  let x = 0;

  while (cursor <= end) {
    const y = cursor.getUTCDay(); // 0 = Sunday
    const date = cursor.toISOString().slice(0, 10);
    const count = countsByDate.get(date) ?? 0;
    cells.push({ x, y, date, count, level: levelForCount(count) });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (y === 6) x++;
  }

  return cells;
};

export const generateSnakeAnimation = async (
  source: Source | Source[],
  outputs: (Output | null)[],
) => {
  const sources = Array.isArray(source) ? source : [source];

  const platformNames = [...new Set(sources.map((s) => s.platform))].join(", ");
  console.log(`🎣 fetching user contribution from ${platformNames}`);

  const allCells = await Promise.all(sources.map(getUserContribution));
  const cells =
    allCells.length === 1 ? allCells[0] : mergeContributionCells(allCells);

  const grid = cellsToGrid(cells);
  const snake = snake4;

  console.log("📡 computing best route");
  const chain = getBestRoute(grid, snake)!;
  chain.push(...getPathToPose(chain.slice(-1)[0], snake)!);

  return Promise.all(
    outputs.map(async (out, i) => {
      if (!out) return;
      const { format, drawOptions, animationOptions } = out;
      switch (format) {
        case "svg": {
          console.log(`🖌 creating svg (outputs[${i}])`);
          const { createSvg } = await import("@snk/svg-creator");
          return createSvg(grid, cells, chain, drawOptions, animationOptions);
        }
        case "gif": {
          console.log(`📹 creating gif (outputs[${i}])`);
          const { createGif } = await import("@snk/gif-creator");
          return createGif(grid, cells, chain, drawOptions, animationOptions);
        }
      }
    }),
  );
};

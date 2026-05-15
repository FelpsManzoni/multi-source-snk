import { expect, it, describe } from "bun:test";
import { mergeContributionCells } from "../generateSnakeAnimation";

// Helper to build a small set of contribution cells for a single date range.
const makeCells = (entries: { date: string; count: number }[]) =>
  entries.map((e) => ({ ...e, x: 0, y: 0, level: 0 as const }));

describe("mergeContributionCells", () => {
  it("sums counts for the same date across two sources", () => {
    const source1 = makeCells([{ date: "2025-01-01", count: 3 }]);
    const source2 = makeCells([{ date: "2025-01-01", count: 7 }]);

    const merged = mergeContributionCells([source1, source2]);
    const cell = merged.find((c) => c.date === "2025-01-01");

    expect(cell?.count).toBe(10);
  });

  it("includes dates that are exclusive to one source", () => {
    const source1 = makeCells([{ date: "2025-06-01", count: 5 }]);
    const source2 = makeCells([{ date: "2025-06-02", count: 2 }]);

    const merged = mergeContributionCells([source1, source2]);

    expect(merged.find((c) => c.date === "2025-06-01")?.count).toBe(5);
    expect(merged.find((c) => c.date === "2025-06-02")?.count).toBe(2);
  });

  it("treats a missing count as 0 when one source has no contribution on a date", () => {
    // source1 has contributions on a date; source2 does not include that date at all
    const source1 = makeCells([{ date: "2025-03-15", count: 4 }]);
    const source2 = makeCells([{ date: "2025-03-20", count: 1 }]);

    const merged = mergeContributionCells([source1, source2]);

    expect(merged.find((c) => c.date === "2025-03-15")?.count).toBe(4);
    expect(merged.find((c) => c.date === "2025-03-20")?.count).toBe(1);
  });

  it("assigns level 4 to the date with the globally highest merged count", () => {
    const source1 = makeCells([
      { date: "2025-05-01", count: 10 },
      { date: "2025-05-02", count: 2 },
    ]);
    const source2 = makeCells([
      { date: "2025-05-01", count: 5 },
      { date: "2025-05-02", count: 1 },
    ]);

    const merged = mergeContributionCells([source1, source2]);

    // 2025-05-01: 10+5 = 15 (max) → level 4
    expect(merged.find((c) => c.date === "2025-05-01")?.level).toBe(4);
    // 2025-05-02: 2+1 = 3 (below max) → level < 4
    expect(merged.find((c) => c.date === "2025-05-02")?.level).toBeLessThan(4);
  });

  it("assigns level 0 to dates with zero contributions", () => {
    const source1 = makeCells([{ date: "2025-07-10", count: 5 }]);
    const source2 = makeCells([{ date: "2025-07-11", count: 0 }]);

    const merged = mergeContributionCells([source1, source2]);

    expect(merged.find((c) => c.date === "2025-07-11")?.level).toBe(0);
  });

  it("returns a grid with consistent x/y positions (no gaps in week columns)", () => {
    const source1 = makeCells([{ date: "2025-01-05", count: 1 }]);
    const source2 = makeCells([{ date: "2025-04-20", count: 3 }]);

    const merged = mergeContributionCells([source1, source2]);

    // y must always be 0-6 (Sun-Sat)
    for (const cell of merged) {
      expect(cell.y).toBeGreaterThanOrEqual(0);
      expect(cell.y).toBeLessThanOrEqual(6);
    }

    // Each week column must contain exactly 7 consecutive days (Sun-Sat)
    const maxX = Math.max(...merged.map((c) => c.x));
    for (let wx = 0; wx < maxX; wx++) {
      const week = merged.filter((c) => c.x === wx);
      expect(week.length).toBe(7);
    }
  });

  it("returns all levels in [0, 4] range", () => {
    const source1 = makeCells([
      { date: "2025-02-01", count: 1 },
      { date: "2025-02-02", count: 5 },
      { date: "2025-02-03", count: 10 },
    ]);
    const source2 = makeCells([
      { date: "2025-02-01", count: 2 },
      { date: "2025-02-04", count: 0 },
    ]);

    const merged = mergeContributionCells([source1, source2]);

    for (const cell of merged) {
      expect(cell.level).toBeGreaterThanOrEqual(0);
      expect(cell.level).toBeLessThanOrEqual(4);
    }
  });

  it("handles a single source without errors", () => {
    const source1 = makeCells([
      { date: "2025-09-01", count: 3 },
      { date: "2025-09-02", count: 0 },
    ]);

    const merged = mergeContributionCells([source1]);

    expect(merged.find((c) => c.date === "2025-09-01")?.count).toBe(3);
    expect(merged.find((c) => c.date === "2025-09-02")?.count).toBe(0);
  });
});

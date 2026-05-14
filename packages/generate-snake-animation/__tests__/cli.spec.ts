import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { it, expect, afterAll } from "bun:test";
import { $ } from "bun";

const cliPath = path.resolve(__dirname, "../cli.ts");
const tmpDir = fs.mkdtempSync(
  path.join(os.tmpdir(), "generate-snake-animation-test-"),
);
const outSvg = path.join(tmpDir, "out.svg");
const outSvgMulti = path.join(tmpDir, "out-multi.svg");

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

it(
  "should generate svg via CLI with forgejo_user",
  async () => {
    const result =
      await $`bun ${cliPath} --forgejo_user=codeberg.org/JasterV --output=${outSvg}`.quiet();

    expect(result.exitCode).toBe(0);
    expect(fs.existsSync(outSvg)).toBe(true);

    const content = fs.readFileSync(outSvg, "utf-8");
    expect(content).toMatch(/^<svg/);
    expect(content).toMatch(/<\/svg>/);
  },
  { timeout: 2 * 60 * 1000 },
);

it(
  "should generate svg via CLI combining gitlab_user and forgejo_user (multi-source)",
  async () => {
    const result =
      await $`bun ${cliPath} --gitlab_user=dzaporozhets --forgejo_user=codeberg.org/JasterV --output=${outSvgMulti}`.quiet();

    expect(result.exitCode).toBe(0);
    expect(fs.existsSync(outSvgMulti)).toBe(true);

    const content = fs.readFileSync(outSvgMulti, "utf-8");
    expect(content).toMatch(/^<svg/);
    expect(content).toMatch(/<\/svg>/);
  },
  { timeout: 2 * 60 * 1000 },
);

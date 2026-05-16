import * as fs from "node:fs";
import * as path from "node:path";
import type { Source } from "generate-snake-animation/generateSnakeAnimation";
import { generateSnakeAnimation } from "generate-snake-animation/generateSnakeAnimation";
import { parseOutputsOption } from "generate-snake-animation/outputsOptions";
import * as githubAction from "./github-action";

const parseUser = (uri: string) => {
  const i = uri.lastIndexOf("/");
  if (i === -1) return { username: uri };
  const username = uri.slice(i + 1);
  let baseUrl = uri.slice(0, i + 1);
  if (!baseUrl.startsWith("https://")) baseUrl = "https://" + baseUrl;
  return { username, baseUrl };
};

(async () => {
  try {
    const githubUserName = githubAction.getInput("github_user_name");
    const githubToken =
      process.env.GITHUB_TOKEN ?? githubAction.getInput("github_token");
    const gitlabUserName = githubAction.getInput("gitlab_user_name");
    const forgejoUserName = githubAction.getInput("forgejo_user_name");

    const sources: Source[] = [];

    if (githubUserName) {
      const { username, baseUrl } = parseUser(githubUserName);
      if (!githubToken) throw new Error("Missing github token");
      sources.push({ platform: "github", username, githubToken, baseUrl });
    }

    if (gitlabUserName) {
      const { username, baseUrl } = parseUser(gitlabUserName);
      sources.push({ platform: "gitlab", username, baseUrl });
    }

    if (forgejoUserName) {
      const { username, baseUrl } = parseUser(forgejoUserName);
      if (!baseUrl)
        throw new Error(
          "forgejo_user_name must include the host (e.g. codeberg.org/username)",
        );
      sources.push({ platform: "forgejo", username, baseUrl });
    }

    if (sources.length === 0)
      throw new Error(
        "At least one of github_user_name, gitlab_user_name, or forgejo_user_name must be provided",
      );

    const outputsRaw = [
      ...githubAction.getInput("outputs").split("\n"),
      //
      // legacy
      githubAction.getInput("gif_out_path"),
      githubAction.getInput("svg_out_path"),
    ]
      .map((x) => x.trim())
      .filter(Boolean);

    const outputs = parseOutputsOption(outputsRaw);

    const results = await generateSnakeAnimation(sources, outputs);

    outputs.forEach((out, i) => {
      const result = results[i];
      if (out?.filename && result) {
        console.log(`💾 writing to ${out?.filename}`);
        fs.mkdirSync(path.dirname(out?.filename), { recursive: true });
        fs.writeFileSync(out?.filename, result);
      }
    });
  } catch (e: any) {
    githubAction.setFailed(`Action failed with "${e.message}"`);
  }
})();

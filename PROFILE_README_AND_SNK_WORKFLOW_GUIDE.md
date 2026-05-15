# Profile README + Multi-Source SNK Action Guide

Great timing, the core implementation is already done. To use it in your profile pipeline, follow these 3 steps.

## 1) Ensure your Action uses your new implementation

Your `action.yml` must point to an image you publish from this repository.

Recommended flow (already prepared in this repo):

1. Run `.github/workflows/publish-image.yml` or `.github/workflows/release.yml`.
2. The workflow publishes your image to GHCR and updates `action.yml` with a digest-pinned reference.
3. Commit/tag from that workflow is what your profile repo should reference.

If you skip this, new inputs like `gitlab_user_name` will not be applied because the old image is still used.

## 2) Update your profile workflow to pass multiple sources

In your profile repository (`.github/workflows`), use your forked Action and pass both users.

```yaml
name: Generate snake

on:
  schedule:
    - cron: "0 0 * * *"
  workflow_dispatch:

permissions:
  contents: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Generate snake files
        uses: YOUR_GH_USERNAME/multi-source-snk@main
        with:
          github_user_name: ${{ github.repository_owner }}
          gitlab_user_name: YOUR_GITLAB_USERNAME
          outputs: |
            dist/github-snake.svg
            dist/github-snake-dark.svg?palette=github-dark

      - name: Push generated files to output branch
        uses: crazy-max/ghaction-github-pages@v4
        with:
          target_branch: output
          build_dir: dist
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Replace:

1. `YOUR_GH_USERNAME`
2. `YOUR_GITLAB_USERNAME`

Prefer using a stable release tag instead of `@main`, for example:

```yaml
uses: YOUR_GH_USERNAME/multi-source-snk@v3.6.0
```

## 3) Update profile README to render generated files

Use files from your `output` branch, with light/dark support:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/YOUR_GH_USERNAME/YOUR_GH_USERNAME/output/github-snake-dark.svg" />
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/YOUR_GH_USERNAME/YOUR_GH_USERNAME/output/github-snake.svg" />
  <img alt="github contribution grid snake animation" src="https://raw.githubusercontent.com/YOUR_GH_USERNAME/YOUR_GH_USERNAME/output/github-snake.svg" />
</picture>
```

## Important checks before first run

1. Actions permissions must allow writing repository contents.
2. The `output` branch must exist (or be creatable by the publish step).
3. If `github_user_name` is used, a GitHub token is still required (default token in Actions is usually enough).
4. Public GitLab usernames should work without a token in the current implementation.
5. In your repository Packages settings, ensure the GHCR package is public if you want usage without extra authentication from other repos.

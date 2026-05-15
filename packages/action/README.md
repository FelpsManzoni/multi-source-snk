# @snk/action

Contains the github action code.

## Implementation

### Docker

Because the gif generation requires some native libs, we cannot use a node.js action.

Use a docker action instead, the image is created from the [Dockerfile](../../Dockerfile).

The image is published via repository workflows to GHCR and then pinned by digest in [action.yml](../../action.yml).

Use one of these workflows to publish/update the image reference:

- [.github/workflows/publish-image.yml](../../.github/workflows/publish-image.yml)
- [.github/workflows/release.yml](../../.github/workflows/release.yml)

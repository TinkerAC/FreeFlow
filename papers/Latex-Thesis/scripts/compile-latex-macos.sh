
#!/usr/bin/env zsh
set -euo pipefail

SCRIPT_DIR="${0:A:h}"
REPO_DIR="${SCRIPT_DIR}/../../.."

cd "$REPO_DIR"
exec pnpm run build:thesis

#!/usr/bin/env zsh
set -euo pipefail

SCRIPT_DIR="${0:A:h}"
ROOT_DIR="${SCRIPT_DIR}/.."
REPO_ROOT="${ROOT_DIR}/../.."
OUT_DIR="${ROOT_DIR}/out/experiments"
COMPILE_LATEX="${COMPILE_LATEX:-0}"

mkdir -p "$OUT_DIR"
cd "$REPO_ROOT"

print -r -- "[1/3] Running search ranking experiment"
pnpm --filter freeflow-web25-backend run experiment:ranking | tee "$OUT_DIR/search-ranking.log"

print -r -- "[2/3] Running smart-contract tests"
pnpm --filter @freeflow/contracts run test | tee "$OUT_DIR/contract-tests.log"

if [[ "$COMPILE_LATEX" == "1" ]]; then
    print -r -- "[3/3] Compiling thesis PDF"
    cd "$ROOT_DIR"
    OPEN_PDF=0 SKIP_FIGURE_EXPORT=1 zsh scripts/compile-latex-macos.sh
else
    print -r -- "[3/3] Skipping LaTeX compile (set COMPILE_LATEX=1 to enable)"
fi


#!/usr/bin/env zsh
set -euo pipefail

SCRIPT_DIR="${0:A:h}"
ROOT_DIR="${SCRIPT_DIR}/.."
OUT_DIR="${ROOT_DIR}/out"

mkdir -p "$OUT_DIR"
cd "$ROOT_DIR"

xelatex -interaction=nonstopmode -halt-on-error -output-directory="$OUT_DIR" main.tex
biber --output-directory "$OUT_DIR" "$OUT_DIR/main"
xelatex -interaction=nonstopmode -halt-on-error -output-directory="$OUT_DIR" main.tex
xelatex -interaction=nonstopmode -halt-on-error -output-directory="$OUT_DIR" main.tex
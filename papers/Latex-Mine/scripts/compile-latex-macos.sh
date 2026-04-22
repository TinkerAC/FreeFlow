
#!/usr/bin/env zsh
set -euo pipefail

SCRIPT_DIR="${0:A:h}"
ROOT_DIR="${SCRIPT_DIR}/.."
OUT_ROOT_DIR="${ROOT_DIR}/out"
FIGURES_DIR="${ROOT_DIR}/figures"
FIGURES_OUT_DIR="${FIGURES_DIR}/out"
VERSION_FILE="${ROOT_DIR}/version.tex"
DRAWIO_SCALE="${DRAWIO_SCALE:-3}"
DRAWIO_BORDER="${DRAWIO_BORDER:-10}"
DRAWIO_EXTRA_ARGS=(${=DRAWIO_EXTRA_ARGS:-})
OPEN_PDF="${OPEN_PDF:-1}"

find_drawio_cli() {
    if [[ -n "${DRAWIO_CLI:-}" ]]; then
        if [[ -x "$DRAWIO_CLI" ]]; then
            print -r -- "$DRAWIO_CLI"
            return 0
        fi

        if command -v "$DRAWIO_CLI" >/dev/null 2>&1; then
            command -v "$DRAWIO_CLI"
            return 0
        fi

        print -u2 -- "DRAWIO_CLI is set but is not executable: ${DRAWIO_CLI}"
        return 1
    fi

    for candidate in drawio draw.io diagrams.net; do
        if command -v "$candidate" >/dev/null 2>&1; then
            command -v "$candidate"
            return 0
        fi
    done

    for candidate in \
        "/Applications/draw.io.app/Contents/MacOS/draw.io" \
        "/Applications/diagrams.net.app/Contents/MacOS/diagrams.net"; do
        if [[ -x "$candidate" ]]; then
            print -r -- "$candidate"
            return 0
        fi
    done

    return 1
}

read_thesis_version() {
    if [[ ! -f "$VERSION_FILE" ]]; then
        print -u2 -- "Version file not found: ${VERSION_FILE}"
        return 1
    fi

    local raw_version
    raw_version="$(
        sed -n 's/.*\\newcommand{\\thesisVersion}{\([^}]*\)}.*/\1/p' "$VERSION_FILE" | head -n 1
    )"

    if [[ -z "$raw_version" ]]; then
        print -u2 -- "Unable to read \\thesisVersion from ${VERSION_FILE}"
        return 1
    fi

    print -r -- "$raw_version"
}

sanitize_version_for_dir() {
    local version_name="$1"
    version_name="${version_name//\//_}"
    version_name="${version_name//\\/_}"
    version_name="${version_name//:/_}"
    version_name="${version_name//\*/_}"
    version_name="${version_name//\?/_}"
    version_name="${version_name//\"/_}"
    version_name="${version_name//</_}"
    version_name="${version_name//>/_}"
    version_name="${version_name//|/_}"
    version_name="${version_name// /_}"
    print -r -- "$version_name"
}

export_drawio_figures() {
    mkdir -p "$FIGURES_OUT_DIR"

    local drawio_files=("${FIGURES_DIR}"/*.drawio(N))
    if (( ${#drawio_files} == 0 )); then
        return 0
    fi

    if [[ "${SKIP_FIGURE_EXPORT:-0}" == "1" ]]; then
        print -u2 -- "Skipping draw.io figure export because SKIP_FIGURE_EXPORT=1."
        return 0
    fi

    local drawio_bin
    if ! drawio_bin="$(find_drawio_cli)"; then
        cat >&2 <<'EOF'
Unable to find diagrams.net/draw.io command line exporter.

Install diagrams.net Desktop, or set DRAWIO_CLI to the executable path.
macOS examples:
  brew install --cask drawio
  DRAWIO_CLI=/Applications/draw.io.app/Contents/MacOS/draw.io zsh scripts/compile-latex-macos.sh

To compile LaTeX without regenerating figures, run:
  SKIP_FIGURE_EXPORT=1 zsh scripts/compile-latex-macos.sh
EOF
        return 1
    fi

    for source_file in "${drawio_files[@]}"; do
        local output_file="${FIGURES_OUT_DIR}/${source_file:t:r}.png"
        print -r -- "Exporting ${source_file:t} -> ${output_file} (scale=${DRAWIO_SCALE}, border=${DRAWIO_BORDER})"
        "$drawio_bin" \
            "${DRAWIO_EXTRA_ARGS[@]}" \
            --export \
            --format png \
            --scale "$DRAWIO_SCALE" \
            --border "$DRAWIO_BORDER" \
            --output "$output_file" \
            "$source_file"
    done
}

THESIS_VERSION="$(read_thesis_version)"
OUT_VERSION_DIR_NAME="$(sanitize_version_for_dir "$THESIS_VERSION")"
OUT_DIR="${OUT_ROOT_DIR}/${OUT_VERSION_DIR_NAME}"

mkdir -p "$OUT_DIR"
cd "$ROOT_DIR"
print -r -- "Building thesis version ${THESIS_VERSION} -> ${OUT_DIR}"

export_drawio_figures

xelatex -interaction=nonstopmode -halt-on-error -output-directory="$OUT_DIR" main.tex
biber --input-directory "$OUT_DIR" --output-directory "$OUT_DIR" main
xelatex -interaction=nonstopmode -halt-on-error -output-directory="$OUT_DIR" main.tex
xelatex -interaction=nonstopmode -halt-on-error -output-directory="$OUT_DIR" main.tex

if [[ "$OPEN_PDF" != "0" ]]; then
    open "$OUT_DIR/main.pdf"
fi

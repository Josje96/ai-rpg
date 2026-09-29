#!/usr/bin/env bash
# Tabletop AI installer for Linux, macOS, and other POSIX systems (incl. WSL).
# Three ways to run it, all doing the same thing:
#   curl -fsSL https://raw.githubusercontent.com/Josje96/ai-rpg/main/install.sh | bash
#   bash install.sh            # from a downloaded copy
#   ./install.sh               # from inside a clone
# Installs Bun if needed, installs dependencies, and sets up .env.
set -euo pipefail

REPO_URL="https://github.com/Josje96/ai-rpg"
CLONED=""

# Find the project. Running as a file inside a checkout? Install there.
# Piped in from curl (no script file)? Clone it first.
SRC=""
if [ -n "${BASH_SOURCE:-}" ] && [ -f "${BASH_SOURCE[0]:-}" ]; then
  SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fi
if [ ! -f "$SRC/package.json" ]; then
  if [ -f "$PWD/package.json" ]; then
    SRC="$PWD"
  else
    DEST="${TABLETOP_AI_DIR:-$HOME/ai-rpg}"
    if ! command -v git >/dev/null 2>&1; then
      echo "git is required to fetch the game (https://git-scm.com)." >&2
      exit 1
    fi
    if [ -d "$DEST/.git" ]; then
      echo "Updating $DEST..."
      git -C "$DEST" pull --ff-only
    else
      echo "Cloning Tabletop AI into $DEST..."
      git clone --depth 1 "$REPO_URL" "$DEST"
    fi
    SRC="$DEST"
    CLONED=1
  fi
fi
cd "$SRC"

need_bun() {
  command -v bun >/dev/null 2>&1 || return 0
  local major minor
  IFS=. read -r major minor _ <<< "$(bun --version)"
  [ "$major" -lt 1 ] && return 0
  [ "$major" -eq 1 ] && [ "$minor" -lt 2 ] && return 0
  return 1
}

if need_bun; then
  echo "Installing Bun 1.2+..."
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL https://bun.sh/install | bash
  elif command -v wget >/dev/null 2>&1; then
    wget -qO- https://bun.sh/install | bash
  else
    echo "Need curl or wget to install Bun (https://bun.sh)." >&2
    exit 1
  fi
  export PATH="$HOME/.bun/bin:$PATH"
fi
command -v bun >/dev/null 2>&1 || { echo "Bun installed but not on PATH; open a new shell and rerun." >&2; exit 1; }
echo "Using bun $(bun --version)"

echo "Installing dependencies..."
bun install

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example."
  KEY=""
  # Read from the terminal, not stdin: when piped from curl, stdin IS this script.
  if [ -r /dev/tty ]; then
    printf "Paste your OpenRouter API key (Enter to skip and edit .env later): "
    read -r KEY < /dev/tty || KEY=""
  fi
  if [ -n "$KEY" ]; then
    sed -i.bak "s|^OPENROUTER_API_KEY=\$|OPENROUTER_API_KEY=$KEY|" .env && rm -f .env.bak
    echo "Key saved to .env."
  fi
else
  echo ".env already exists; leaving it alone."
fi

echo "Sanity check: typecheck..."
bunx tsc --noEmit

echo
echo "Done."
if [ -n "$CLONED" ]; then
  echo "The game lives in $SRC. Play with:"
  echo "  cd $SRC"
  echo "  bun run play"
else
  echo "Start playing with:"
  echo "  bun run play"
fi

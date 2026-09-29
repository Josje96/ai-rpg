#!/usr/bin/env bash
# Tabletop AI installer for Linux, macOS, and other POSIX systems (incl. WSL).
# Installs Bun if needed, installs dependencies, and sets up .env.
# Usage: ./install.sh
set -euo pipefail

cd "$(dirname "$0")"

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
  printf "Paste your OpenRouter API key (Enter to skip and edit .env later): "
  read -r key
  if [ -n "$key" ]; then
    sed -i.bak "s|^OPENROUTER_API_KEY=\$|OPENROUTER_API_KEY=$key|" .env && rm -f .env.bak
    echo "Key saved to .env."
  fi
else
  echo ".env already exists; leaving it alone."
fi

echo "Sanity check: typecheck..."
bunx tsc --noEmit

echo
echo "Done. Start playing with:"
echo "  bun run play"

#!/bin/sh
# Installs (or updates) the deepwork CLI: https://github.com/dyang438/deepwork
# Usage: curl -fsSL https://deepwork.garden/install.sh | sh
set -e
DIR="${DEEPWORK_DIR:-$HOME/deepwork}"
BIN="$HOME/.local/bin"

if [ "$(uname)" != "Darwin" ]; then echo "deepwork runs on macOS only." >&2; exit 1; fi
command -v git >/dev/null || { echo "Needs git (xcode-select --install)." >&2; exit 1; }
command -v python3 >/dev/null || { echo "Needs python3 (xcode-select --install)." >&2; exit 1; }

if [ -d "$DIR/.git" ]; then
  git -C "$DIR" pull --ff-only --quiet && echo "Updated $DIR"
else
  git clone --quiet https://github.com/dyang438/deepwork.git "$DIR" && echo "Installed to $DIR"
fi
mkdir -p "$BIN"
ln -sf "$DIR/deepwork" "$BIN/deepwork"

case ":$PATH:" in
  *":$BIN:"*) ;;
  *) echo "export PATH=\"\$HOME/.local/bin:\$PATH\"" >> "$HOME/.zshrc"
     echo "Added ~/.local/bin to your PATH in ~/.zshrc (open a new terminal, or run: export PATH=\"\$HOME/.local/bin:\$PATH\")" ;;
esac
echo "Next: deepwork login"

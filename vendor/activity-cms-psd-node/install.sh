#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v node >/dev/null 2>&1; then
  cat >&2 <<'EOF'
Node.js was not found.

Please install Node.js 20+ first, then rerun:
  ./install.sh
EOF
  exit 1
fi

node -e 'const major = Number(process.versions.node.split(".")[0]); if (major < 20) { throw new Error("Node.js 20+ is required."); }'

cd "$SCRIPT_DIR"
if command -v pnpm >/dev/null 2>&1; then
  pnpm install
else
  npm install
fi

node --check "$SCRIPT_DIR/scripts/create_package.mjs"

cat <<EOF

activity-cms-psd-node is ready.

Run:
  ./activity-cms-psd-node /path/to/activity.psd --out /path/to/output
EOF

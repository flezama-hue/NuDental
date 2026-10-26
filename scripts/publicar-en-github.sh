#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${1:-https://github.com/flezama-hue/NuDental.git}"

if [[ ! -f package.json ]]; then
  echo "Ejecuta este script desde la raíz del proyecto NuDental." >&2
  exit 1
fi

command -v git >/dev/null 2>&1 || { echo "Git no está instalado." >&2; exit 1; }

if [[ ! -d .git ]]; then
  git init -b main
fi

git add .
if ! git diff --cached --quiet; then
  git commit -m "feat: initialize standalone NuDental views 1 and 2"
fi

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REPO_URL"
else
  git remote add origin "$REPO_URL"
fi

git branch -M main
git push -u origin main
echo "NuDental publicado en $REPO_URL"

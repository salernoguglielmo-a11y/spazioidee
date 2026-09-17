#!/usr/bin/env bash
# Deploy su Vercel portandosi dietro le variabili d'ambiente di .env.local.
# Prerequisiti: account Vercel, database Turso creato, .env.local compilato.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env.local ]; then
  echo "Manca .env.local. Esegui prima:  npm run setup"
  exit 1
fi

echo "▸ Accesso a Vercel (si apre il browser se non sei già autenticato)"
npx --yes vercel login

echo "▸ Collegamento del progetto"
npx --yes vercel link

echo "▸ Invio delle variabili d'ambiente all'ambiente di produzione"
while IFS= read -r line; do
  case "$line" in
    ''|\#*) continue ;;
  esac
  key="${line%%=*}"
  value="${line#*=}"
  value="${value%\"}"
  value="${value#\"}"
  [ -z "$value" ] && continue
  # Un valore già presente viene sostituito.
  npx --yes vercel env rm "$key" production --yes >/dev/null 2>&1 || true
  printf '%s' "$value" | npx --yes vercel env add "$key" production >/dev/null
  echo "   ✓ $key"
done < .env.local

echo "▸ Pubblicazione"
npx --yes vercel --prod

echo
echo "Fatto. Ora imposta APP_URL sull'indirizzo definitivo:"
echo "  npx vercel env rm APP_URL production --yes && printf 'https://TUO-DOMINIO' | npx vercel env add APP_URL production && npx vercel --prod"

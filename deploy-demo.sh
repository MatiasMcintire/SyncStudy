#!/usr/bin/env bash
# ============================================================
# deploy-demo.sh — levanta SyncStudy para que lo pruebe el profe
# Corre ESTO en el Ubuntu Server (no en tu notebook).
#
# Qué hace:
#   1. Copia el frontend (syncstudy/) dentro de pocketbase/pb_public/
#      => PocketBase sirve la página Y la API en el mismo puerto (8090).
#   2. Arranca PocketBase escuchando en todas las interfaces (LAN + túnel).
#
# Después, en OTRA terminal, levantás el túnel (ver README-DEPLOY.md):
#   cloudflared tunnel --url http://localhost:8090
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONT="$ROOT/syncstudy"
PB_DIR="$ROOT/pocketbase"
PUBLIC="$PB_DIR/pb_public"

if [[ ! -x "$PB_DIR/pocketbase" ]]; then
  echo "ERROR: no encuentro el binario $PB_DIR/pocketbase"
  echo "       ¿Copiaste la carpeta pocketbase/ al servidor? (está en .gitignore)"
  exit 1
fi

echo "==> Publicando el frontend en pb_public/ ..."
mkdir -p "$PUBLIC"
# rsync con --delete para que pb_public sea un espejo limpio del frontend
rsync -a --delete \
  --exclude '.gitignore' \
  "$FRONT/"  "$PUBLIC/"

echo "==> Frontend publicado. Arrancando PocketBase en 0.0.0.0:8090 ..."
echo "    (Ctrl+C para detener)"
echo
exec "$PB_DIR/pocketbase" serve --http=0.0.0.0:8090

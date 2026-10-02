#!/usr/bin/env bash
# Demo del MVP en Mac/Linux: ./iniciar_demo.sh
cd "$(dirname "$0")"
[ -x .venv/bin/python ] || { python3 -m venv .venv && .venv/bin/pip install -q -r requirements-demo.txt; }
rm -f expedientes.db
echo "Abriendo http://localhost:8000  (contraseña: Demo-Judicial-2026)"
( sleep 3; (xdg-open http://localhost:8000 || open http://localhost:8000) >/dev/null 2>&1 ) &
.venv/bin/python -m uvicorn app.main:app --port 8000

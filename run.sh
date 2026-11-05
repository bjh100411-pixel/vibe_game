#!/usr/bin/env sh
cd "$(dirname "$0")"
python3 -m http.server 8000 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null' EXIT INT TERM
sleep 1
if command -v xdg-open >/dev/null 2>&1; then xdg-open http://localhost:8000; elif command -v open >/dev/null 2>&1; then open http://localhost:8000; fi
wait $SERVER_PID

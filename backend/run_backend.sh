#!/bin/bash
set -e

echo "[+] Starting Offline Multilingual Certificate Platform Backend..."
echo "[+] Binding to http://127.0.0.1:8000"
echo "[+] Enforcing 100% Offline Mode (No External AI APIs)"

python3 -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000

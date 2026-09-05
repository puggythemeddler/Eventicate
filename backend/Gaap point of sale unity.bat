@echo off
taskkill /F /IM chrome.exe /T 2>nul
start "" "chrome.exe" --kiosk --start-fullscreen "http://192.168.88.118:500/?&serial=pos6&remote=192.168.88.12"[cite: 1]
exit[cite: 1]
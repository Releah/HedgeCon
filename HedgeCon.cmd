@echo off
setlocal
set "HEDGECON_EXE=%~dp0release\HedgeCon.exe"
if not exist "%HEDGECON_EXE%" (
  echo HedgeCon.exe has not been built yet.
  echo Run: pnpm package:win
  pause
  exit /b 1
)
start "HedgeCon" "%HEDGECON_EXE%" %*

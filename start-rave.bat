@echo off
setlocal
title RAVE Developer Launcher

set "RAVE_DIR=%~dp0"
set "COREPACK=C:\Program Files\nodejs\corepack.cmd"
set "CARGO_BIN=%USERPROFILE%\.cargo\bin"
set "CARGO=%CARGO_BIN%\cargo.exe"
set "CARGO_HOME=%USERPROFILE%\.cargo"
set "RUSTUP_HOME=%USERPROFILE%\.rustup"
set "PATH=%CARGO_BIN%;%PATH%"

if not exist "%RAVE_DIR%\package.json" (
  echo [RAVE] Project was not found: %RAVE_DIR%
  pause
  exit /b 1
)

if not exist "%COREPACK%" (
  echo [RAVE] Corepack was not found. Install Node.js and try again.
  pause
  exit /b 1
)

if not exist "%CARGO_BIN%\cargo.exe" (
  echo [RAVE] Cargo was not found: %CARGO_BIN%\cargo.exe
  echo [RAVE] Install Rust with rustup and try again.
  pause
  exit /b 1
)

cd /d "%RAVE_DIR%"

where git >nul 2>&1
if errorlevel 1 (
  if exist "%ProgramFiles%\Git\cmd\git.exe" set "PATH=%ProgramFiles%\Git\cmd;%PATH%"
)
where git >nul 2>&1
if errorlevel 1 (
  if exist "%LOCALAPPDATA%\Programs\Git\cmd\git.exe" set "PATH=%LOCALAPPDATA%\Programs\Git\cmd;%PATH%"
)
where git >nul 2>&1
if errorlevel 1 (
  if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe" set "PATH=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd;%PATH%"
)
echo [RAVE] Checking Rust toolchain...
"%CARGO%" --version
if errorlevel 1 goto :error

if not exist "node_modules" (
  echo [RAVE] Installing dependencies...
  call "%COREPACK%" pnpm install --frozen-lockfile
  if errorlevel 1 goto :error
)

if not exist "packages\player\dist\index.html" (
  echo [RAVE] Building frontend assets required by Rust...
  call "%COREPACK%" pnpm --filter @nuclearplayer/player build:frontend
  if errorlevel 1 goto :error
)

echo [RAVE] Starting desktop application...
call "%COREPACK%" pnpm --filter @nuclearplayer/player dev
if errorlevel 1 goto :error

exit /b 0

:error
echo.
echo [RAVE] Startup failed. See the error above.
pause
exit /b 1

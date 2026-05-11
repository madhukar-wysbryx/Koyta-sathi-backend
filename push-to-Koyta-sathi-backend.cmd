@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

set "REMOTE=https://github.com/madhukar-wysbryx/Koyta-sathi-backend.git"
set "BRANCH=frontend/nextjs-app"
set "BRANCH_FALLBACK=frontend-nextjs-app"

where git >nul 2>&1
if errorlevel 1 (
  echo ERROR: git is not in PATH. Install Git for Windows and retry.
  exit /b 1
)

if not exist "package.json" (
  echo ERROR: package.json not found. Run this script from the koyta-sathi-nextjs folder.
  exit /b 1
)

if not exist .git (
  git init
  if errorlevel 1 exit /b 1
)

git checkout -B "%BRANCH%" 2>nul
if errorlevel 1 (
  echo Could not create branch "%BRANCH%", trying "%BRANCH_FALLBACK%"...
  git checkout -B "%BRANCH_FALLBACK%"
  if errorlevel 1 (
    echo ERROR: Could not create branch.
    exit /b 1
  )
  set "BRANCH=%BRANCH_FALLBACK%"
)

git remote remove origin 2>nul
git remote add origin "%REMOTE%"
if errorlevel 1 exit /b 1

git add -A
git status

git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Add Next.js frontend application"
  if errorlevel 1 (
    echo ERROR: commit failed.
    exit /b 1
  )
) else (
  echo No changes to commit. Pushing existing commit^(s^).
)

git push -u origin "%BRANCH%"
if errorlevel 1 (
  echo.
  echo Push failed. Use GitHub HTTPS auth ^(PAT or Git Credential Manager^).
  exit /b 1
)

echo.
echo SUCCESS: pushed branch "%BRANCH%" to Koyta-sathi-backend.
exit /b 0

@echo off
setlocal
title MistWalker 3.0 - Push to GitHub

echo =======================================================
echo          MistWalker 3.0 GitHub Push Helper
echo =======================================================
echo.

:: Add winget links to path so git and gh work immediately
set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Links;%PATH%"

:: Check if git works
git --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Git was not found in PATH.
    pause
    exit /b 1
)

:: Check GitHub CLI status
echo [1/3] Checking GitHub authentication...
gh auth status >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo You need to log into GitHub.
    echo When prompted, select 'GitHub.com', 'HTTPS', and 'Login with a web browser'.
    echo.
    gh auth login -w -p https
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] GitHub login was not completed.
        pause
        exit /b 1
    )
)

echo.
echo [OK] Authenticated with GitHub!
echo.

:: Stage any recent changes and commit if needed
echo [2/3] Checking Git repository status...
git add .
git diff-index --quiet HEAD -- 2>nul
if %ERRORLEVEL% NEQ 0 (
    git commit -m "Update MistWalker 3.0 files"
)

:: Create or push repository
echo [3/3] Creating and pushing to your private GitHub repository...
gh repo create mistwalker --private --source=. --remote=origin --push
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [NOTE] If the repository already exists, attempting direct push to main...
    git push -u origin main
)

echo.
echo =======================================================
echo [SUCCESS] Your repository is now published on GitHub!
echo.
echo Next step:
echo 1. Open Render: https://dashboard.render.com/
echo 2. Click "New +" -^> "Web Service" (or "Blueprint")
echo 3. Connect your "mistwalker" GitHub repository
echo 4. Enter your secrets from .env into the dashboard
echo =======================================================
echo.
pause

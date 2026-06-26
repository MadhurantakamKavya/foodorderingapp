@echo off
set /p commit_msg="Enter Git Commit Message: "
if "%commit_msg%"=="" (
    set commit_msg="Update FeastDash application code"
)

echo.
echo === 1. Staging Files ===
git add .

echo.
echo === 2. Committing Changes ===
git commit -m "%commit_msg%"

echo.
echo === 3. Pushing to GitHub ===
git push origin main

echo.
echo === Sync Complete! ===
echo If Jenkins Poll SCM is enabled, the pipeline build will start shortly.
echo.
pause

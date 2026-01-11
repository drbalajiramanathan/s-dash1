@echo off
echo Building S-Dash for mooflux.com/dash1...
cd dashboard
call npm run build -- --base=/dash1/
cd ..
echo.
echo Build complete. Deploying to Firebase...
firebase deploy
pause

@echo off
echo.
echo ========================================
echo   HTTPS Setup for Localhost
echo ========================================
echo.

REM Check if .cert directory exists
if exist ".cert\localhost-key.pem" (
    echo SSL certificates already exist!
    echo.
    echo Certificate files:
    echo   - .cert\localhost-key.pem
    echo   - .cert\localhost.pem
    echo.
    echo To regenerate certificates, delete the .cert folder and run this script again.
    echo.
    pause
    exit /b 0
)

echo Choose a method to generate SSL certificates:
echo.
echo 1. OpenSSL (Works everywhere, browser will show security warning)
echo 2. mkcert (Recommended, no browser warnings, requires installation)
echo.
set /p choice="Enter your choice (1 or 2): "

if "%choice%"=="1" (
    echo.
    echo Generating SSL certificate using OpenSSL...
    echo.
    call npm run generate-cert
    if errorlevel 1 (
        echo.
        echo Failed to generate certificate with OpenSSL.
        echo.
        echo Make sure OpenSSL is installed:
        echo - Install Git for Windows: https://git-scm.com/download/win
        echo - Or install OpenSSL: https://slproweb.com/products/Win32OpenSSL.html
        echo.
        pause
        exit /b 1
    )
) else if "%choice%"=="2" (
    echo.
    echo Generating SSL certificate using mkcert...
    echo.
    call npm run generate-cert:mkcert
    if errorlevel 1 (
        echo.
        echo Failed to generate certificate with mkcert.
        echo.
        echo Install mkcert first:
        echo - Using Chocolatey: choco install mkcert
        echo - Using Scoop: scoop install mkcert
        echo.
        echo Or choose option 1 to use OpenSSL instead.
        echo.
        pause
        exit /b 1
    )
) else (
    echo.
    echo Invalid choice. Please run the script again and choose 1 or 2.
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Next steps:
echo.
echo 1. Update your .env file:
echo    VITE_EMAIL_PROXY_URL=https://localhost:3001
echo.
echo 2. Start your servers:
echo    - Terminal 1: npm run dev
echo    - Terminal 2: cd server ^&^& npm start
echo.
echo 3. Open your browser:
echo    https://localhost:8080
echo.
if "%choice%"=="1" (
    echo Note: Your browser will show a security warning.
    echo Click "Advanced" and "Proceed to localhost" to continue.
    echo.
)
echo For more information, see HTTPS-SETUP.md
echo.
pause


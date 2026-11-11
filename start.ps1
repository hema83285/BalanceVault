# BalanceVault – Start both servers
# Run this from the BalanceVault root folder:
#   .\start.ps1

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  BalanceVault - Starting up..." -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition

# Check PostgreSQL is running
$pgService = Get-Service "postgresql-x64-16" -ErrorAction SilentlyContinue
if ($pgService.Status -ne "Running") {
    Write-Host "Starting PostgreSQL service..." -ForegroundColor Yellow
    Start-Service "postgresql-x64-16"
    Start-Sleep -Seconds 2
}
Write-Host "PostgreSQL: Running" -ForegroundColor Green

# Start backend in a new window
Write-Host "Starting Backend (port 5000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "
  Set-Location '$root\backend';
  `$env:NODE_TLS_REJECT_UNAUTHORIZED='0';
  Write-Host 'Backend starting...' -ForegroundColor Green;
  node server.js
" -WindowStyle Normal

Start-Sleep -Seconds 3

# Start frontend in a new window
Write-Host "Starting Frontend (port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "
  Set-Location '$root\frontend';
  Write-Host 'Frontend starting...' -ForegroundColor Green;
  npx vite --port 5173
" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "  BalanceVault is running!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend:  http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Backend:   http://localhost:5000" -ForegroundColor Cyan
Write-Host "  API Docs:  http://localhost:5000/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Admin login:" -ForegroundColor Yellow
Write-Host "    Use ADMIN_EMAIL and ADMIN_PASSWORD from backend\.env" -ForegroundColor White
Write-Host "    If no admin account exists, run 'npm run db:seed' from backend after migrations." -ForegroundColor White
Write-Host ""
Write-Host "Opening browser..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
Start-Process "http://localhost:5173"

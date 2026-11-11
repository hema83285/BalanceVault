# BalanceVault – Run automated tests
# Run from BalanceVault root: .\run-tests.ps1

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  BalanceVault - Running Tests" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition

Set-Location "$root\backend"

[System.Environment]::SetEnvironmentVariable("NODE_TLS_REJECT_UNAUTHORIZED", "0")

Write-Host "Running 31 automated tests across 4 test suites..." -ForegroundColor Yellow
Write-Host "  - auth.test.js  (registration, login, JWT)" -ForegroundColor Gray
Write-Host "  - rbac.test.js  (role-based access control)" -ForegroundColor Gray
Write-Host "  - transfers.test.js (money transfers, idempotency)" -ForegroundColor Gray
Write-Host "  - ledger.test.js (double-entry bookkeeping)" -ForegroundColor Gray
Write-Host ""

$proc = Start-Process -FilePath "node" `
  -ArgumentList ".\node_modules\jest\bin\jest.js", "--forceExit", "--no-coverage", "--verbose" `
  -WorkingDirectory "$root\backend" `
  -RedirectStandardOutput "$root\backend\test-out.txt" `
  -RedirectStandardError "$root\backend\test-results.txt" `
  -NoNewWindow -Wait -PassThru

Write-Host ""
Get-Content "$root\backend\test-results.txt" | Select-String "(PASS|FAIL|Tests:|Test Suites:)" | ForEach-Object { 
  if ($_ -match "FAIL") { Write-Host $_ -ForegroundColor Red }
  elseif ($_ -match "PASS") { Write-Host $_ -ForegroundColor Green }
  else { Write-Host $_ -ForegroundColor Cyan }
}

Write-Host ""
if ($proc.ExitCode -eq 0) {
  Write-Host "All tests passed!" -ForegroundColor Green
} else {
  Write-Host "Some tests failed. Check test-results.txt for details." -ForegroundColor Red
}

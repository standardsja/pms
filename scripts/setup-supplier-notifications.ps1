#!/usr/bin/env pwsh
# Setup script for Supplier Notification feature

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Supplier PO/Contract Notifications" -ForegroundColor Cyan
Write-Host "Setup Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Navigate to server directory
Write-Host "[1/3] Navigating to server directory..." -ForegroundColor Yellow
Set-Location server

# Step 2: Push schema changes to database
Write-Host "[2/3] Pushing schema changes to database..." -ForegroundColor Yellow
Write-Host "  - Adding 'email' field to Vendor model" -ForegroundColor Gray
Write-Host "  - Adding PO_AWARDED notification type" -ForegroundColor Gray
Write-Host "  - Adding CONTRACT_AWARDED notification type" -ForegroundColor Gray
Write-Host ""
npx prisma db push --accept-data-loss

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to push schema changes" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Schema changes pushed successfully" -ForegroundColor Green
Write-Host ""

# Step 3: Regenerate Prisma client
Write-Host "[3/3] Regenerating Prisma client..." -ForegroundColor Yellow
npx prisma generate

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to regenerate Prisma client" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Prisma client regenerated successfully" -ForegroundColor Green
Write-Host ""

# Return to root
Set-Location ..

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Restart your development server (tsx watch)" -ForegroundColor White
Write-Host "2. Update supplier records with email addresses" -ForegroundColor White
Write-Host "3. Test PO creation with supplierEmail parameter" -ForegroundColor White
Write-Host "4. Check console logs for notification output" -ForegroundColor White
Write-Host ""
Write-Host "Documentation:" -ForegroundColor Yellow
Write-Host "  See docs/SUPPLIER_NOTIFICATIONS.md for details" -ForegroundColor White
Write-Host ""
Write-Host "Example API Call:" -ForegroundColor Yellow
Write-Host @"
  POST http://localhost:4000/api/purchase-orders
  {
    "supplierName": "ABC Corporation",
    "supplierEmail": "supplier@example.com",
    "description": "Office Supplies",
    "amount": 10000,
    "currency": "JMD"
  }
"@ -ForegroundColor Gray
Write-Host ""

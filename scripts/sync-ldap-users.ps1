# LDAP Bulk User Sync Script
# Imports all Active Directory users into the PMS system
# Assigns roles automatically based on AD group memberships

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  LDAP Bulk User Synchronization" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if server is running
$serverRunning = Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -notmatch 'vite' }

if (-not $serverRunning) {
    Write-Host "❌ Server is not running. Please start the server first:" -ForegroundColor Red
    Write-Host "   cd server" -ForegroundColor Yellow
    Write-Host "   npm start" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "✓ Server is running" -ForegroundColor Green
Write-Host ""

# Get admin credentials
Write-Host "Please enter your admin credentials:" -ForegroundColor Yellow
$email = Read-Host "Email"
$password = Read-Host "Password" -AsSecureString
$passwordText = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
)

Write-Host ""
Write-Host "Authenticating..." -ForegroundColor Cyan

# Login to get admin token
$loginUrl = "http://localhost:3000/api/auth/login"
$loginBody = @{
    email = $email
    password = $passwordText
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri $loginUrl -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    
    if (-not $token) {
        Write-Host "❌ Authentication failed: No token received" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✓ Authenticated successfully" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Authentication failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Get sync statistics first
Write-Host "Fetching synchronization statistics..." -ForegroundColor Cyan
$statsUrl = "http://localhost:3000/api/auth/ldap/sync-stats"
$headers = @{
    "Authorization" = "Bearer $token"
}

try {
    $statsResponse = Invoke-RestMethod -Uri $statsUrl -Method GET -Headers $headers
    
    if ($statsResponse.success) {
        $stats = $statsResponse.statistics
        
        Write-Host ""
        Write-Host "Current Statistics:" -ForegroundColor Yellow
        Write-Host "  LDAP Configured: $($stats.ldapConfigured)" -ForegroundColor White
        
        if ($stats.ldapConfigured) {
            Write-Host "  Total AD Users: $($stats.totalADUsers)" -ForegroundColor White
            Write-Host "  Users in Database: $($stats.usersInDatabase)" -ForegroundColor White
            Write-Host "  Users Synced from AD: $($stats.usersWithLDAPDN)" -ForegroundColor White
            Write-Host "  Sync Percentage: $($stats.syncPercentage)%" -ForegroundColor White
        } else {
            Write-Host "❌ LDAP is not configured in the server environment" -ForegroundColor Red
            exit 1
        }
        Write-Host ""
    }
} catch {
    Write-Host "⚠ Could not fetch statistics: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host ""
}

# Confirm before proceeding
Write-Host "This will import/update all Active Directory users." -ForegroundColor Yellow
$confirm = Read-Host "Do you want to proceed? (yes/no)"

if ($confirm -ne "yes") {
    Write-Host "Operation cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting Bulk Synchronization" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Perform bulk sync
$syncUrl = "http://localhost:3000/api/auth/ldap/bulk-sync"
$syncBody = @{} | ConvertTo-Json

try {
    Write-Host "Synchronizing users from Active Directory..." -ForegroundColor Cyan
    Write-Host "(This may take a few minutes depending on the number of users)" -ForegroundColor Gray
    Write-Host ""
    
    $syncResponse = Invoke-RestMethod -Uri $syncUrl -Method POST -Headers $headers -Body $syncBody -ContentType "application/json"
    
    if ($syncResponse.success) {
        $result = $syncResponse.result
        
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  Synchronization Complete!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Results:" -ForegroundColor Yellow
        Write-Host "  Total Users Found in AD: $($result.totalUsersFound)" -ForegroundColor White
        Write-Host "  Users Imported (New): $($result.usersImported)" -ForegroundColor Green
        Write-Host "  Users Updated (Existing): $($result.usersUpdated)" -ForegroundColor Cyan
        Write-Host "  Users Failed: $($result.usersFailed)" -ForegroundColor $(if ($result.usersFailed -gt 0) { "Red" } else { "White" })
        Write-Host "  Duration: $($result.duration)" -ForegroundColor White
        Write-Host ""
        
        if ($result.errors -and $result.errors.Count -gt 0) {
            Write-Host "Errors encountered:" -ForegroundColor Red
            foreach ($syncError in $result.errors) {
                Write-Host "  - $($syncError.email): $($syncError.error)" -ForegroundColor Red
            }
            Write-Host ""
        }
        
        Write-Host "✓ All users have been synchronized from Active Directory" -ForegroundColor Green
        Write-Host "✓ Roles have been assigned based on AD group memberships" -ForegroundColor Green
        Write-Host ""
        
    } else {
        Write-Host "❌ Synchronization failed: $($syncResponse.message)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Synchronization failed: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error details: $errorBody" -ForegroundColor Red
    }
    
    exit 1
}

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

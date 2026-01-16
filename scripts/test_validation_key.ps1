<#
PowerShell script to test validation-key.txt accessibility
Tests both local and remote endpoints
#>
param(
    [string] $Domain = "https://ledgererp.online.pinet.app"
)

Write-Host "Testing validation-key.txt accessibility..." -ForegroundColor Cyan
Write-Host ""

# Expected hash
$expectedHash = "b98811baf2008ea8c7ca719afd78f84b6d7c8358b4a4898b8d8ff7456f245e8adf97a7eef03a5aee7539db82b39b7fb8877640b3e24a70f58321f6ed01a0bb9c"

# Test 1: Local file
Write-Host "Test 1: Checking local static/validation-key.txt..." -ForegroundColor Yellow
$localFile = Join-Path -Path (Get-Location) -ChildPath "static\validation-key.txt"
if (Test-Path $localFile) {
    $localContent = Get-Content $localFile -Raw | ForEach-Object { $_.Trim() }
    if ($localContent -eq $expectedHash) {
        Write-Host "SUCCESS: Local file exists and contains correct hash" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Local file hash mismatch!" -ForegroundColor Red
        Write-Host "   Expected: $expectedHash" -ForegroundColor Gray
        Write-Host "   Found:    $localContent" -ForegroundColor Gray
    }
} else {
    Write-Host "ERROR: Local file not found at: $localFile" -ForegroundColor Red
}

Write-Host ""

# Test 2: Root validation-key.txt
Write-Host "Test 2: Checking root validation-key.txt..." -ForegroundColor Yellow
$rootFile = Join-Path -Path (Get-Location) -ChildPath "validation-key.txt"
if (Test-Path $rootFile) {
    $rootContent = Get-Content $rootFile -Raw | ForEach-Object { $_.Trim() }
    if ($rootContent -eq $expectedHash) {
        Write-Host "SUCCESS: Root file exists and contains correct hash" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Root file hash mismatch!" -ForegroundColor Red
    }
} else {
    Write-Host "ERROR: Root file not found at: $rootFile" -ForegroundColor Red
}

Write-Host ""

# Test 3: Remote URL (if domain is accessible)
Write-Host "Test 3: Testing remote URL: $Domain/validation-key.txt" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$Domain/validation-key.txt" -UseBasicParsing -ErrorAction Stop
    $remoteContent = $response.Content.Trim()
    
    if ($remoteContent -eq $expectedHash) {
        Write-Host "SUCCESS: Remote file is accessible and contains correct hash" -ForegroundColor Green
        Write-Host "   Status Code: $($response.StatusCode)" -ForegroundColor Gray
    } else {
        Write-Host "ERROR: Remote file hash mismatch!" -ForegroundColor Red
        Write-Host "   Expected: $expectedHash" -ForegroundColor Gray
        Write-Host "   Found:    $remoteContent" -ForegroundColor Gray
    }
} catch {
    $errorMsg = $_.Exception.Message
    if ($errorMsg -like "*could not be resolved*" -or $errorMsg -like "*pas pu*resolue*") {
        Write-Host "WARNING: Domain not accessible (DNS resolution failed)" -ForegroundColor Yellow
        Write-Host "   This is normal if the domain is not yet deployed" -ForegroundColor Gray
    } elseif ($errorMsg -like "*404*") {
        Write-Host "ERROR: File not found (404) - deployment may be incomplete" -ForegroundColor Red
    } else {
        Write-Host "ERROR: $errorMsg" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "   - Local files should be ready for deployment" -ForegroundColor Gray
Write-Host "   - After deployment, verify at: $Domain/validation-key.txt" -ForegroundColor Gray
Write-Host "   - Then click Verify Domain in Pi Network Developer Portal" -ForegroundColor Gray

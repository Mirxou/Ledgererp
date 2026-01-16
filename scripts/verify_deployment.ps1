<#
Script to verify deployment configuration for Pi Network domain verification
Checks all necessary files and configurations
#>
param(
    [string] $Domain = "https://ledgererp.online.pinet.app"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Pi Network Domain Verification Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$expectedHash = "b98811baf2008ea8c7ca719afd78f84b6d7c8358b4a4898b8d8ff7456f245e8adf97a7eef03a5aee7539db82b39b7fb8877640b3e24a70f58321f6ed01a0bb9c"
$allChecksPassed = $true

# Check 1: validation-key.txt in static directory
Write-Host "[1/6] Checking static/validation-key.txt..." -ForegroundColor Yellow
$staticFile = Join-Path -Path (Get-Location) -ChildPath "static\validation-key.txt"
if (Test-Path $staticFile) {
    $content = Get-Content $staticFile -Raw | ForEach-Object { $_.Trim() }
    if ($content -eq $expectedHash) {
        Write-Host "    SUCCESS: File exists with correct hash" -ForegroundColor Green
    } else {
        Write-Host "    ERROR: Hash mismatch!" -ForegroundColor Red
        $allChecksPassed = $false
    }
} else {
    Write-Host "    ERROR: File not found!" -ForegroundColor Red
    $allChecksPassed = $false
}

# Check 2: validation-key.txt in root
Write-Host "[2/6] Checking root validation-key.txt..." -ForegroundColor Yellow
$rootFile = Join-Path -Path (Get-Location) -ChildPath "validation-key.txt"
if (Test-Path $rootFile) {
    $content = Get-Content $rootFile -Raw | ForEach-Object { $_.Trim() }
    if ($content -eq $expectedHash) {
        Write-Host "    SUCCESS: File exists with correct hash" -ForegroundColor Green
    } else {
        Write-Host "    ERROR: Hash mismatch!" -ForegroundColor Red
        $allChecksPassed = $false
    }
} else {
    Write-Host "    ERROR: File not found!" -ForegroundColor Red
    $allChecksPassed = $false
}

# Check 3: _headers file
Write-Host "[3/6] Checking static/_headers configuration..." -ForegroundColor Yellow
$headersFile = Join-Path -Path (Get-Location) -ChildPath "static\_headers"
if (Test-Path $headersFile) {
    $headersContent = Get-Content $headersFile -Raw
    if ($headersContent -like "*validation-key.txt*") {
        Write-Host "    SUCCESS: _headers file contains validation-key.txt configuration" -ForegroundColor Green
    } else {
        Write-Host "    WARNING: _headers file exists but may not have validation-key.txt config" -ForegroundColor Yellow
    }
} else {
    Write-Host "    WARNING: _headers file not found" -ForegroundColor Yellow
}

# Check 4: wrangler.toml configuration
Write-Host "[4/6] Checking wrangler.toml configuration..." -ForegroundColor Yellow
$wranglerFile = Join-Path -Path (Get-Location) -ChildPath "wrangler.toml"
if (Test-Path $wranglerFile) {
    $wranglerContent = Get-Content $wranglerFile -Raw
    if ($wranglerContent -like "*pages_build_output_dir*" -and $wranglerContent -like "*static*") {
        Write-Host "    SUCCESS: Cloudflare Pages output directory configured correctly" -ForegroundColor Green
    } else {
        Write-Host "    WARNING: pages_build_output_dir may not be set to 'static'" -ForegroundColor Yellow
    }
} else {
    Write-Host "    WARNING: wrangler.toml not found" -ForegroundColor Yellow
}

# Check 5: File content format (no extra whitespace)
Write-Host "[5/6] Checking file format (no extra whitespace)..." -ForegroundColor Yellow
if (Test-Path $staticFile) {
    $content = Get-Content $staticFile -Raw
    $trimmed = $content.Trim()
    if ($content -eq $trimmed) {
        Write-Host "    SUCCESS: File has no trailing whitespace" -ForegroundColor Green
    } else {
        Write-Host "    WARNING: File may have trailing whitespace" -ForegroundColor Yellow
    }
    
    # Check for newlines
    $lines = Get-Content $staticFile
    if ($lines.Count -eq 1) {
        Write-Host "    SUCCESS: File has single line (correct format)" -ForegroundColor Green
    } else {
        Write-Host "    WARNING: File has multiple lines, may cause issues" -ForegroundColor Yellow
    }
}

# Check 6: Test remote accessibility
Write-Host "[6/6] Testing remote URL accessibility..." -ForegroundColor Yellow
$testUrl = "$Domain/validation-key.txt"
try {
    $response = Invoke-WebRequest -Uri $testUrl -UseBasicParsing -ErrorAction Stop -TimeoutSec 10
    $remoteContent = $response.Content.Trim()
    
    if ($remoteContent -eq $expectedHash) {
        Write-Host "    SUCCESS: File is accessible and contains correct hash" -ForegroundColor Green
        Write-Host "    Status Code: $($response.StatusCode)" -ForegroundColor Gray
    } else {
        Write-Host "    ERROR: File accessible but hash mismatch!" -ForegroundColor Red
        Write-Host "    Expected: $expectedHash" -ForegroundColor Gray
        Write-Host "    Found:    $remoteContent" -ForegroundColor Gray
        $allChecksPassed = $false
    }
} catch {
    $errorMsg = $_.Exception.Message
    Write-Host "    ERROR: Cannot access remote URL" -ForegroundColor Red
    Write-Host "    Error: $errorMsg" -ForegroundColor Gray
    Write-Host ""
    Write-Host "    Possible causes:" -ForegroundColor Yellow
    Write-Host "    1. Application not deployed to Cloudflare Pages" -ForegroundColor Gray
    Write-Host "    2. Domain not configured correctly" -ForegroundColor Gray
    Write-Host "    3. DNS not propagated yet" -ForegroundColor Gray
    Write-Host "    4. File not in correct location for Cloudflare Pages" -ForegroundColor Gray
    $allChecksPassed = $false
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
if ($allChecksPassed) {
    Write-Host "All checks passed! Domain should verify successfully." -ForegroundColor Green
} else {
    Write-Host "Some checks failed. Please review the errors above." -ForegroundColor Red
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Ensure static/validation-key.txt exists with correct hash" -ForegroundColor Gray
    Write-Host "2. Deploy to Cloudflare Pages with 'static' as build output directory" -ForegroundColor Gray
    Write-Host "3. Verify file is accessible at: $testUrl" -ForegroundColor Gray
    Write-Host "4. Wait for DNS propagation if domain was recently configured" -ForegroundColor Gray
}
Write-Host "========================================" -ForegroundColor Cyan

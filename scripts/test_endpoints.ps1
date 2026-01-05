# PowerShell script to test all required endpoints for Pi Network submission
# Usage: .\scripts\test_endpoints.ps1 [domain]
# Example: .\scripts\test_endpoints.ps1 piledger.app

param(
    [string]$Domain = "piledger.app"
)

$BaseUrl = "https://$Domain"
$Passed = 0
$Failed = 0

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Testing Endpoints for: $BaseUrl" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

function Test-Endpoint {
    param(
        [string]$Endpoint,
        [int]$ExpectedStatus = 200,
        [string]$Description
    )
    
    Write-Host -NoNewline "Testing $Description... "
    
    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl$Endpoint" -Method Get -UseBasicParsing -ErrorAction Stop
        $statusCode = $response.StatusCode
        
        if ($statusCode -eq $ExpectedStatus) {
            Write-Host "✓ PASS" -ForegroundColor Green -NoNewline
            Write-Host " (Status: $statusCode)"
            return $true
        } else {
            Write-Host "✗ FAIL" -ForegroundColor Red -NoNewline
            Write-Host " (Status: $statusCode, Expected: $ExpectedStatus)"
            return $false
        }
    } catch {
        Write-Host "✗ FAIL" -ForegroundColor Red -NoNewline
        Write-Host " (Error: $($_.Exception.Message))"
        return $false
    }
}

function Test-EndpointContent {
    param(
        [string]$Endpoint,
        [string]$ExpectedContent,
        [string]$Description
    )
    
    Write-Host -NoNewline "Testing $Description... "
    
    try {
        $content = Invoke-WebRequest -Uri "$BaseUrl$Endpoint" -Method Get -UseBasicParsing -ErrorAction Stop
        
        if ($content.Content -match $ExpectedContent) {
            Write-Host "✓ PASS" -ForegroundColor Green -NoNewline
            Write-Host " (Contains: $ExpectedContent)"
            return $true
        } else {
            Write-Host "✗ FAIL" -ForegroundColor Red -NoNewline
            Write-Host " (Does not contain: $ExpectedContent)"
            return $false
        }
    } catch {
        Write-Host "✗ FAIL" -ForegroundColor Red -NoNewline
        Write-Host " (Error: $($_.Exception.Message))"
        return $false
    }
}

function Test-SecurityHeaders {
    param(
        [string]$Endpoint
    )
    
    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl$Endpoint" -Method Head -UseBasicParsing -ErrorAction Stop
        $headers = $response.Headers
        
        $results = @{}
        
        $requiredHeaders = @(
            "Content-Security-Policy",
            "X-Content-Type-Options",
            "X-Frame-Options",
            "Strict-Transport-Security"
        )
        
        foreach ($header in $requiredHeaders) {
            if ($headers.ContainsKey($header)) {
                $results[$header] = $true
            } else {
                $results[$header] = $false
            }
        }
        
        return $results
    } catch {
        return @{}
    }
}

Write-Host "=== Domain Verification ===" -ForegroundColor Yellow
if (Test-Endpoint -Endpoint "/.well-known/pi-app-verification" -Description "Domain Verification") {
    $script:Passed++
    Test-EndpointContent -Endpoint "/.well-known/pi-app-verification" -ExpectedContent "piledger.app" -Description "Domain Verification Content"
} else {
    $script:Failed++
}
Write-Host ""

Write-Host "=== Manifest ===" -ForegroundColor Yellow
if (Test-Endpoint -Endpoint "/manifest.json" -Description "Manifest") {
    $script:Passed++
    Test-EndpointContent -Endpoint "/manifest.json" -ExpectedContent "Ledger ERP" -Description "Manifest Content"
} else {
    $script:Failed++
}
Write-Host ""

Write-Host "=== Legal Pages ===" -ForegroundColor Yellow
if (Test-Endpoint -Endpoint "/static/privacy.html" -Description "Privacy Policy") {
    $script:Passed++
} else {
    $script:Failed++
}

if (Test-Endpoint -Endpoint "/static/terms.html" -Description "Terms of Service") {
    $script:Passed++
} else {
    $script:Failed++
}
Write-Host ""

Write-Host "=== Health Checks ===" -ForegroundColor Yellow
if (Test-Endpoint -Endpoint "/health" -Description "Health Check") {
    $script:Passed++
} else {
    $script:Failed++
}

if (Test-Endpoint -Endpoint "/ready" -Description "Readiness Check") {
    $script:Passed++
} else {
    $script:Failed++
}
Write-Host ""

Write-Host "=== Security Headers ===" -ForegroundColor Yellow
$securityHeaders = Test-SecurityHeaders -Endpoint "/static/index.html"

foreach ($header in $securityHeaders.Keys) {
    Write-Host -NoNewline "Testing $header... "
    if ($securityHeaders[$header]) {
        Write-Host "✓ PASS" -ForegroundColor Green
        $script:Passed++
    } else {
        Write-Host "✗ FAIL" -ForegroundColor Red
        $script:Failed++
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Summary: $Passed passed, $Failed failed" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

if ($Failed -eq 0) {
    Write-Host "All tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Some tests failed. Please fix the issues above." -ForegroundColor Red
    exit 1
}


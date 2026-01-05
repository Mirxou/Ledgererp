# create_bundle.ps1

$bundleName = "piledger_bundle.zip"
if (Test-Path $bundleName) { Remove-Item $bundleName }

Write-Host "Scanning for files..."

# Get all files first
$allFiles = Get-ChildItem -Path . -Recurse -File

# Filter files to include - Explicit Inclusion/Exclusion Logic
$filesToZip = $allFiles | Where-Object {
    $path = $_.FullName
    
    # EXCLUSIONS based on Path Strings (Robust against deeply nested files)
    if ($path -match "\\.venv\\") { return $false }
    if ($path -match "\\.git\\") { return $false }
    if ($path -match "\\.cursor\\") { return $false }
    if ($path -match "\\__pycache__\\") { return $false }
    if ($path -match "\\logs\\") { return $false }
    if ($path -match "\\static\\screenshots\\") { return $false }
    
    # EXCLUSIONS based on specific filenames
    if ($_.Name -eq "piledger.db") { return $false }
    if ($_.Name -eq ".env") { return $false }
    if ($_.Name -eq "ethers.esm.min.js") { return $false }
    if ($_.Name -eq "create_bundle.ps1") { return $false }
    if ($_.Name -like "*.zip") { return $false }
    if ($_.Name -like "*.pyc") { return $false }
    
    # Documentation exclusions to save space
    if ($_.Name -like "*AUDIT_REPORT.md") { return $false }
    if ($_.Name -like "readiness_report*.txt") { return $false }
    if ($_.Name -eq "style.css.map") { return $false } # Source maps often large/unneeded

    return $true
}

$count = $filesToZip.Count
Write-Host "Found $count source files to bundle."

# Compress the specific list of files
$filesToZip | Compress-Archive -DestinationPath $bundleName -Force

# Check size
$zipFile = Get-Item $bundleName
$sizeInMb = $zipFile.Length / 1MB

Write-Host "Bundle created: $($zipFile.FullName)"
Write-Host "Size: $([math]::Round($sizeInMb, 2)) MB"

if ($sizeInMb -gt 1) {
    Write-Warning "Still over 1MB!"
    
    # Validation: What is still big?
    $filesToZip | Sort-Object Length -Descending | Select-Object -First 10 Name, @{N='SizeKB';E={[math]::Round($_.Length/1KB, 2)}} | Format-Table -AutoSize
} else {
    Write-Host "Success! Ready for upload." -ForegroundColor Green
}

<#
PowerShell helper to upload validation-key.txt using scp (OpenSSH) or sftp.
Usage (scp):
  .\upload_validation.ps1 -RemoteHost "ftp.example.com" -RemoteUser "user" -RemotePath "/var/www/html"

It will prompt for password if needed.
#>
param(
  [Parameter(Mandatory=$true)] [string] $RemoteHost,
  [Parameter(Mandatory=$true)] [string] $RemoteUser,
  [Parameter(Mandatory=$true)] [string] $RemotePath,
  [int] $Port = 22
)

$localFile = Join-Path -Path (Get-Location) -ChildPath 'validation-key.txt'
if (!(Test-Path $localFile)) { Write-Error "validation-key.txt not found in current directory."; exit 1 }

$credential = Get-Credential -Message "Enter credentials for $RemoteUser@$RemoteHost"

# Try scp (requires OpenSSH scp available)
$scpCmd = "scp -P $Port `"$localFile`" $($credential.UserName)@$RemoteHost:`"$RemotePath/validation-key.txt`""
Write-Host "Running: $scpCmd"
# Note: This won't pass the password automatically; when using OpenSSH, use key-based auth or an ssh-agent. For password-based scp, user will be prompted.
Invoke-Expression $scpCmd

Write-Host "If upload succeeded, verify with:`nInvoke-RestMethod -Uri https://$($RemoteHost)/validation-key.txt`nor`ncurl -sS https://$($RemoteHost)/validation-key.txt`"
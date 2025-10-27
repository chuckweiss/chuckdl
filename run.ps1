# Requires Windows Package Manager (winget)

# Elevate if needed
# $curr = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
# if (-not $curr.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
#   $args = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
#   Start-Process -FilePath "powershell.exe" -ArgumentList $args -Verb RunAs
#   exit
# }

$ids = @(
  # 'DenoLand.Deno',      # Deno
  'yt-dlp.yt-dlp'       # yt-dlp
)

function Install-Package {
  param([string]$Id)

  $common = @('--force', '--exact', '--accept-source-agreements', '--accept-package-agreements', '--silent')

  Write-Host "Installing $Id..."
  winget.exe install --id $Id @common
}

foreach ($id in $ids) { Install-Package $id }

deno upgrade
deno update --latest
deno run start
